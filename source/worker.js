const { parentPort, threadId } = require('worker_threads')
const {
  connect,
  constants: {
    HTTP2_METHOD_POST,
    HTTP2_METHOD_GET,
    HTTP2_HEADER_ACCEPT,
    HTTP2_HEADER_CONTENT_LENGTH,
    HTTP2_HEADER_CONTENT_TYPE,
    HTTP2_HEADER_USER_AGENT,
    HTTP2_HEADER_METHOD,
    HTTP2_HEADER_PATH,
    HTTP2_HEADER_STATUS
  }
} = require('http2')
const { Resolver } = require('dns')
const { isIPv6 } = require('net')
const UriTemplate = require('uri-templates')
const { encode } = require('base64url')
const dnsPacket = require('dns-packet')
const UserAgent = require('user-agents')

const DNS_MESSAGE = 'application/dns-message'

let session
let uri
let path
let spoofUseragent = false

const useragent = new UserAgent()
let randomUseragent

function getPath (uri) {
  const { pathname, search } = new URL(uri)
  return search
    ? pathname + '?' + search
    : pathname
}

function dnsErrorServFail (id, query) {
  const { questions, flags } = dnsPacket.decode(query)

  // http://www.faqs.org/rfcs/rfc2929.html
  //                                 1  1  1  1  1  1
  //   0  1  2  3  4  5  6  7  8  9  0  1  2  3  4  5
  // +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
  // |QR|   Opcode  |AA|TC|RD|RA| Z|AD|CD|   RCODE   |

  return dnsPacket.encode({
    id,
    type: 'response',
    flags:
      (0b0111100000000000 & flags) | // opcode copied from query
      (0b0000000100000000 & flags) | // rd copied from query
      (0b0000000010000000) | // ra always true
      (0b0000000000000010), // rcode always ServFail
    questions
  })
}

function sendQuery (query) {
  const headers = {}
  headers[HTTP2_HEADER_ACCEPT] = DNS_MESSAGE
  if (spoofUseragent === true) {
    headers[HTTP2_HEADER_USER_AGENT] = randomUseragent
  }
  let stream
  if (uri.varNames.includes('dns')) {
    headers[HTTP2_HEADER_METHOD] = HTTP2_METHOD_GET
    const dns = encode(query)
    headers[HTTP2_HEADER_PATH] = uri.fill({ dns })
    stream = session.request(headers, { endStream: true })
  } else {
    headers[HTTP2_HEADER_METHOD] = HTTP2_METHOD_POST
    headers[HTTP2_HEADER_CONTENT_TYPE] = DNS_MESSAGE
    headers[HTTP2_HEADER_CONTENT_LENGTH] = query.byteLength
    headers[HTTP2_HEADER_PATH] = path
    stream = session.request(headers)
    stream.end(query)
  }
  return stream
}

function spoofQuery (domain) {
  function spoof () {
    const query = dnsPacket.encode({
      type: 'query',
      questions: [{
        type: 'A',
        name: domain
      }]
    })
    let stream
    try {
      stream = sendQuery(query)
    } catch (error) {
      console.error(`Worker ${threadId}: spoofed query failed - ${error.message}`)
      return
    }
    stream.on('error', (error) => {
      console.error(`Worker ${threadId}: spoofed query error - ${error.message}`)
      stream.close()
    })
    stream.resume()
  }
  const random = Math.random()
  if (random < 0.25) {
    // Spoof before real query
    spoof()
  } else if (random < 0.50) {
    // Spoof after real query
    setImmediate(spoof)
  } else if (random < 0.75) {
    // Delay spoofed query up to 10s
    const delay = Math.random() * 10000
    setTimeout(spoof, delay)
  } else {
    // Do not spoof
  }
}

function lookupCustomDnsServers (servers) {
  const resolver = new Resolver()
  resolver.setServers(servers)
  return (hostname, { family, all = false, verbatim = false }, callback) => {
    function onResolve (error, records) {
      if (error) {
        callback(error)
      } else if (all === true) {
        const mapped = records.map((address) => ({
          address,
          family: isIPv6(address) ? 6 : 4
        }))
        if (verbatim === true) {
          callback(null, records)
        } else {
          const sorted = mapped.sort(({ family }) => family === 6 ? -1 : 1)
          callback(null, sorted)
        }
      } else {
        let first
        if (verbatim === true) {
          first = records[0]
        } else {
          first = records.find(isIPv6) || records[0]
        }
        const family = isIPv6(first) ? 6 : 4
        callback(null, first, family)
      }
    }

    if (family === 4) {
      resolver.resolve4(hostname, onResolve)
    } else if (family === 6) {
      resolver.resolve6(hostname, onResolve)
    } else {
      resolver.resolve(hostname, onResolve)
    }
  }
}

parentPort.on('message', (value) => {
  if ('query' in value) {
    if (session.destroyed) {
      parentPort.postMessage({ busy: { message: value } })
      return
    }
    if ('spoofDomain' in value.query) {
      spoofQuery(value.query.spoofDomain)
    }
    const query = Buffer.from(value.query.message)
    const dnsId = query.readUInt16BE(0)
    query.writeUInt16BE(0, 0)
    const stream = sendQuery(query)
    stream.on('error', (error) => {
      console.error(`Worker ${threadId}: stream error - ${error.message}`)
      const message = dnsErrorServFail(dnsId, query)
      const response = { id: value.query.id, message, error: 'http' }
      parentPort.postMessage({ response })
      stream.close()
    })
    stream.on('response', (headers) => {
      const status = headers[HTTP2_HEADER_STATUS]
      const contentType = headers[HTTP2_HEADER_CONTENT_TYPE]
      if (status !== 200 || contentType !== DNS_MESSAGE) {
        console.error(`Worker ${threadId}: HTTP ${status} (${contentType})`)
        const message = dnsErrorServFail(dnsId, query)
        const response = { id: value.query.id, message, error: 'http' }
        parentPort.postMessage({ response })
        stream.close()
        return
      }
      const chunks = []
      stream.on('data', (chunk) => chunks.push(chunk))
      stream.on('end', () => {
        const message = chunks.length === 1 ? chunks[0] : Buffer.concat(chunks)
        message.writeUInt16BE(dnsId, 0)
        const response = { id: value.query.id, message }
        parentPort.postMessage({ response })
      })
    })
  } else if ('ping' in value) {
    if (session.destroyed) {
      parentPort.postMessage({ busy: { message: value } })
      return
    }
    session.ping((error, duration, payload) => {
      if (error) {
        console.error(`Worker ${threadId}: ping failed - ${error.message}`)
      } else {
        parentPort.postMessage({ ping: { duration } })
      }
    })
  } else if ('uri' in value) {
    console.log(`Worker ${threadId}: connecting to ${value.uri}`)
    uri = new UriTemplate(value.uri)
    spoofUseragent = value.spoofUseragent
    randomUseragent = useragent.random().toString()
    path = getPath(value.uri)
    const options = {
      maxSessionMemory: Number.MAX_SAFE_INTEGER,
      peerMaxConcurrentStreams: 2 ** 32 - 1,
      settings: {
        enablePush: false,
        maxConcurrentStreams: 2 ** 32 - 1
      }
    }
    if (value.bootstrap.length > 0) {
      options.lookup = lookupCustomDnsServers(value.bootstrap)
    }
    if (value.tlsSession) {
      options.session = value.tlsSession
    }
    session = connect(value.uri, options)
    for (const side of ['local', 'remote']) {
      const name = `${side}Settings`
      session.on(name, (settings) => {
        console.log(`Worker ${threadId}: HTTP/2`, name, settings)
      })
    }
    if (session.socket.getProtocol() === 'TLSv1.2') {
      const tlsSession = session.socket.getSession()
      parentPort.postMessage({ tlsSession })
    }
    session.socket.on('session', (tlsSession) => {
      parentPort.postMessage({ tlsSession })
    })
    session.on('connect', () => {
      parentPort.postMessage({
        state: 'connected',
        isSessionReused: session.socket.isSessionReused()
      })
    })
    session.on('close', () => {
      parentPort.postMessage({ state: 'disconnected' })
    })
    session.on('error', (error) => {
      console.error(`Worker ${threadId}: session error ${error.message}`)
    })
  } else if ('exit' in value) {
    if (session && !session.destroyed) {
      session.close(() => {
        process.exit()
      })
    } else {
      process.exit()
    }
  }
})
