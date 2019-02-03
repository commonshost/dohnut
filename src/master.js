const Pino = require('pino')
const { createSocket } = require('dgram')
const { join } = require('path')
const EventEmitter = require('events')
const { Worker } = require('worker_threads')

function startUdpSocket (type, address, port) {
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
    socket.bind({ address, port })
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

class Dohnut {
  constructor (configuration) {
    this.configuration = configuration
    this.log = new Pino()
    this.dns = new Set()
    this.doh = []
    this.queries = new Map()
    this.counter = 0
  }

  async start () {
    for (const { type, address, port } of this.configuration.dns) {
      const socket = await startUdpSocket(type, address, port)
      socket.on('message', (message, remote) => {
        const query = {
          id: ++this.counter,
          family: remote.family,
          address: remote.address,
          port: remote.port,
          message: message.buffer,
          start: Date.now(),
          socket
        }
        this.queries.set(query.id, query)
        const randomConnection = Math.floor(Math.random() * this.doh.length)
        this.doh[randomConnection].send(query)
      })
      this.dns.add(socket)
    }

    for (const { uri } of this.configuration.doh) {
      const connection = new Connection(uri)
      this.doh.push(connection)
      connection.on('response', ({ id, message }) => {
        if (this.queries.has(id)) {
          const query = this.queries.get(id)
          this.queries.delete(id)
          query.socket.send(message, query.port, query.address)
        }
      })
    }
  }

  async stop () {
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
  constructor (uri) {
    super()
    this.uri = uri
    this.worker = undefined
    this.pending = []
    this.state = 'disconnected' // connecting, connected
  }

  send (query) {
    switch (this.state) {
      case 'connected':
        const { id, message } = query
        this.worker.postMessage({ query: { id, message } })
        break
      case 'connecting':
        this.pending.push(query)
        break
      case 'disconnected':
        this.pending.push(query)
        this.state = 'connecting'
        if (this.worker === undefined) {
          this.worker = new Worker(join(__dirname, 'worker.js'))
          this.worker.on('message', (value) => {
            if ('state' in value) {
              console.log(`Worker ${this.worker.threadId}:`, value.state)
              this.state = value.state
              switch (this.state) {
                case 'connected':
                  while (this.pending.length > 0) {
                    const { id, message } = this.pending.shift()
                    this.worker.postMessage({ query: { id, message } })
                  }
                  break
              }
            } else if ('response' in value) {
              this.emit('response', value.response)
            } else if ('busy' in value) {
              const { query } = value.busy
              this.send(query)
            }
          })
        }
        this.worker.postMessage({ uri: this.uri })
        break
    }
  }

  stop () {
    return new Promise((resolve) => {
      if (this.worker) {
        this.worker.on('exit', resolve)
        this.worker.postMessage({ exit: true })
      }
    })
  }
}

module.exports.Dohnut = Dohnut
