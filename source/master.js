const Pino = require('pino')
const { createSocket } = require('dgram')
const { join } = require('path')
const EventEmitter = require('events')
const { once } = require('events')
const { Worker } = require('worker_threads')
const { getPopularDomains } = require('./getPopularDomains')

const PING_MIN_INTERVAL = 600000

function startUdpSocket ({ type, address, port, fd }) {
  return new Promise((resolve, reject) => {
    const socket = createSocket(type)
    function onSuccess () {
      socket.off('error', onFailure)
      resolve(socket)
    }
    function onFailure (error) {
      socket.off('listening', onSuccess)
      reject(error)
    }
    socket.once('listening', onSuccess)
    socket.once('error', onFailure)
    socket.bind({ address, port, fd })
  })
}

function stopUdpSocket (socket) {
  return new Promise((resolve, reject) => {
    function onSuccess () {
      socket.off('error', onFailure)
      resolve(socket)
    }
    function onFailure (error) {
      socket.off('close', onSuccess)
      reject(error)
    }
    socket.once('close', onSuccess)
    socket.once('error', onFailure)
    socket.close()
  })
}

function sum (numbers) {
  let count = 0
  for (const number of numbers) {
    count += number
  }
  return count
}

function randomWeighted (weights, total) {
  const random = Math.random() * total
  let step = total
  let index = weights.length
  for (const weight of weights) {
    step -= weight
    if (random >= step) {
      return weights.length - index
    }
    index--
  }
}

class Dohnut {
  constructor (configuration) {
    this.configuration = configuration
    this.log = new Pino()
    this.dns = new Set()
    this.doh = []
    this.queries = new Map()
    this.queryIds = []
    this.counter = 0
    this.timer = null
    this.lastPingTime = 0
    this.fastestConnection = undefined
    this.getConnection = this.configuration.loadBalance === 'privacy'
      ? this.getRandomConnection : this.getFastestConnection
    this.popularDomains = undefined
  }

  getRandomConnection () {
    const index = Math.floor(Math.random() * this.doh.length)
    const connection = this.doh[index]
    return connection
  }

  getFastestConnection () {
    return this.fastestConnection || this.getRandomConnection()
  }

  refreshPing () {
    const pinged = []
    for (const connection of this.doh) {
      if (connection.pinged === false) {
        connection.ping()
      } else if (connection.rtt !== undefined) {
        pinged.push(connection)
      }
    }

    if (pinged.length > 0) {
      const rtts = pinged.map(({ rtt }) => rtt)
      const slowest = Math.max(...rtts)
      const weights = rtts.map((rtt) => 1 / (rtt / slowest))
      const total = sum(weights)
      const index = randomWeighted(weights, total)
      const target = pinged[index]
      target.ping()
    }
  }

  async start () {
    const options = {
      bootstrap: this.configuration.bootstrap,
      spoofUseragent: this.configuration.countermeasures
        .includes('spoof-useragent')
    }
    for (const { uri } of this.configuration.doh) {
      const connection = new Connection(uri, options)
      this.doh.push(connection)
      connection.on('response', ({ id, message }) => {
        if (this.queries.has(id)) {
          const query = this.queries.get(id)
          this.queries.delete(id)
          query.socket.send(message, query.port, query.address)
        }
      })
      connection.on('ping', () => {
        let fastest = this.fastestConnection
        for (const connection of this.doh) {
          if (connection.rtt !== undefined) {
            if (fastest === undefined || connection.rtt < fastest.rtt) {
              fastest = connection
            }
          }
        }
        if (this.fastestConnection !== fastest) {
          this.fastestConnection = fastest
          if (fastest) {
            const { uri, rtt } = fastest
            console.log(`Fastest connection: ${uri} (RTT: ${rtt} ms)`)
          }
        }
      })
    }

    this.timer = setInterval(() => {
      const now = Date.now()
      const ttl = 5000
      let index = 0
      for (const id of this.queryIds) {
        if (this.queries.has(id)) {
          const query = this.queries.get(id)
          const elapsed = now - query.begin
          if (elapsed > ttl) {
            this.queries.delete(id)
            index++
          } else {
            break
          }
        } else {
          index++
        }
      }
      if (index > 0) {
        this.queryIds = this.queryIds.slice(index)
      }
    }, 1000)

    if (this.configuration.countermeasures.includes('spoof-queries')) {
      this.popularDomains = await getPopularDomains({
        cacheDirectory: this.configuration.cacheDirectory
      })
      const count = this.popularDomains.length.toLocaleString()
      console.log(`Loaded ${count} popular domains`)
    }

    for (const resolver of this.configuration.dns) {
      const socket = await startUdpSocket(resolver)
      const { address, port } = socket.address()
      const location = resolver.fd !== undefined ? `unix:${resolver.fd}`
        : resolver.type === 'udp4' ? `${address}:${port}`
          : `[${address}]:${port}`
      console.log(`Started listening on ${location} (${resolver.type})`)
      socket.on('message', ({ buffer }, remote) => {
        const now = Date.now()
        const query = {
          id: ++this.counter,
          family: remote.family,
          address: remote.address,
          port: remote.port,
          message: buffer,
          begin: now,
          socket
        }
        this.queries.set(query.id, query)
        this.queryIds.push(query.id)
        const connection = this.getConnection()
        const message = { query: { id: query.id, message: query.message } }
        if (this.popularDomains !== undefined) {
          const curviness = 10
          const random = Math.exp(-Math.random() * curviness)
          const maximum = this.popularDomains.length
          const index = Math.floor(maximum * random)
          message.query.spoofDomain = this.popularDomains[index]
        }
        connection.send(message)
        if (now > this.lastPingTime + PING_MIN_INTERVAL) {
          this.lastPingTime = now
          this.refreshPing()
        }
      })
      socket.on('close', async () => {
        console.log(`Stopped listening on ${location} (${resolver.type})`)
      })
      this.dns.add(socket)
    }
  }

  async stop () {
    clearInterval(this.timer)
    for (const socket of this.dns) {
      await stopUdpSocket(socket)
      this.dns.delete(socket)
    }
    while (this.doh.length > 0) {
      const connection = this.doh.pop()
      await connection.stop()
    }
  }
}

class Connection extends EventEmitter {
  constructor (uri, options) {
    super()
    this.uri = uri
    this.worker = undefined
    this.pending = []
    this.state = 'disconnected' // connecting, connected
    this.pinged = false
    this.rtt = undefined
    this.options = options
    this.tlsSession = undefined
  }

  send (message) {
    switch (this.state) {
      case 'connected':
        this.worker.postMessage(message)
        break
      case 'connecting':
        this.pending.push(message)
        break
      case 'disconnected':
        this.pending.push(message)
        this.state = 'connecting'
        if (this.worker === undefined) {
          this.worker = new Worker(join(__dirname, 'worker.js'))
          this.worker.on('message', this.receive.bind(this))
          this.worker.once('exit', () => { this.worker = undefined })
        }
        this.worker.postMessage({
          uri: this.uri,
          spoofUseragent: this.options.spoofUseragent,
          bootstrap: this.options.bootstrap,
          tlsSession: this.tlsSession
        })
        break
    }
  }

  receive (value) {
    if ('state' in value) {
      const { state } = value
      this.state = state
      switch (state) {
        case 'connected': {
          console.log(`Worker ${this.worker.threadId}: connected`,
            `(TLS session resumed: ${value.isSessionReused})`)
          const { pending } = this
          while (pending.length > 0) {
            const message = pending.shift()
            this.send(message)
          }
          break
        }
        case 'disconnected': {
          console.log(`Worker ${this.worker.threadId}: disconnected`)
          if (this.pinged === true && this.rtt === undefined) {
            this.pinged = false
          }
          break
        }
      }
    } else if ('response' in value) {
      this.emit('response', value.response)
      if (value.response.error === 'http') {
        this.rtt = undefined
        this.emit('ping')
      }
    } else if ('ping' in value) {
      this.rtt = value.ping.duration
      this.emit('ping')
    } else if ('busy' in value) {
      this.send(value.busy.message)
    } else if ('tlsSession' in value) {
      this.tlsSession = value.tlsSession
    }
  }

  ping () {
    this.pinged = true
    this.rtt = undefined
    this.send({ ping: {} })
  }

  async stop () {
    if (this.worker) {
      this.worker.postMessage({ exit: true })
      await once(this.worker, 'exit')
    }
  }
}

module.exports.Dohnut = Dohnut
