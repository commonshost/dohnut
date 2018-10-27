#!/usr/bin/env node

'use strict'

const dgram = require('dgram')
const dnsPacket = require('dns-packet')
const fs = require('fs')
const http2 = require('http2')
const pino = require('pino')
const program = require('commander')
const { URL } = require('url')
const { fetch } = require('./src/https')

program
  .version('1.0.0')
  .option('-d, --doh [value]', 'Specify DOH server URL')
  .option('-p, --port <n>', 'Specify UDP port')
  .option('-s, --sink [list]', 'Specify a blocklist')
  .option('-v, --verbose', 'Verbose')
  .parse(process.argv)

let blocked
try {
  blocked =
    fs.readFileSync(program.sink, 'utf-8')
      .split('\n')
      .filter(Boolean)
      .reduce(function(acc, cur, i) {
        acc[cur] = 1
        return acc
      }, {})
} catch (err) {
  console.error('Unable to read given blocklist %j', program.sink)
  process.exit(1)
}

const loggerOpts = program.verbose ? {} : { level: 'error' }
const logger = pino(loggerOpts)

const doh = program.doh ? program.doh : 'https://commons.host/'
const { origin, pathname } = new URL(doh)

const client = http2.connect(origin)
const socket = dgram.createSocket('udp4')

const lie = (id) => {
  return dnsPacket.encode({
    type: 'response',
    id: id,
    flags: 3
  })
}

client.on('error', (err) => {
  logger.error(err)
})

socket.on('listening', () => {
  const { address, port } = socket.address()
  logger.info(`dohnut listening on ${address}:${port}`)
})

socket.on('message', async (message, rinfo) => {
  logger.info('query received')
  const packet = dnsPacket.decode(message)
  if (
    program.sink &&
    packet
      .questions
      .map(q => blocked[q.name] !== undefined)
      .every(h => h)) {
    const reply = lie(packet.id)
    socket.send(reply, 0, reply.length, rinfo.port, rinfo.address)
    return
  }

  const reply = await fetch(client, pathname, message)
  logger.info('reply sent')
  socket.send(reply, 0, reply.length, rinfo.port, rinfo.address)
})

socket.on('error', (err) => {
  logger.error(`error:\n${err.stack}`)
  socket.close()
})

socket.bind(program.port)
