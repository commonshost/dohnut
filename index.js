'use strict'

const base64url = require('base64url')
const dnsPacket = require('dns-packet')
const dgram = require('dgram')
const http2 = require('http2')
const logger = require('pino')()

const client = http2.connect('https://commons.host')
const socket = dgram.createSocket('udp4')

function readAll (stream, chunks) {
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(chunk))
    stream.on('error', reject)
    stream.once('end', resolve)
  })
}
async function fetch (query) {
  const queryEncoded = base64url(query)
  logger.info(`making DOH query to /?dns=${queryEncoded}`)
  const request = client.request({
    ':path': '/?dns=' + queryEncoded,
    'accept': 'application/dns-message',
    'content-type': 'application/dns-message'
  })
  const chunks = []
  await readAll(request, chunks)
  const res = await Buffer.concat(chunks)
  return res
}

client.on('error', (err) => {
  logger.error(err)
})

socket.on('listening', () => {
  const address = socket.address()
  logger.info(`dohnut listening on ${address.address}:${address.port}`)
})

socket.on('message', async (message, rinfo) => {
  const reply = await fetch(message)
  socket.send(reply, 0, reply.length, rinfo.port, rinfo.address)
})

socket.on('error', (err) => {
  logger.error(`error:\n${err.stack}`)
  socket.close()
})

socket.bind(4444)
