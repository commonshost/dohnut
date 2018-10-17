#!/usr/bin/env node

'use strict'

const dgram = require('dgram')
const http2 = require('http2')
const pino = require('pino')
const program = require('commander')
const { URL } = require('url')
const { fetch } = require('./src/https')

program
  .version('1.0.0')
  .option('-d, --doh [value]', 'Specify DOH server URL')
  .option('-p, --port <n>', 'Specify UDP port')
  .option('-v, --verbose', 'Verbose')
  .parse(process.argv)

const loggerOpts = program.verbose ? {} : { level: 'error' }
const logger = pino(loggerOpts)

const doh = program.doh ? program.doh : 'https://commons.host/'
const { origin, pathname } = new URL(doh)

const client = http2.connect(origin)
const socket = dgram.createSocket('udp4')

client.on('error', (err) => {
  logger.error(err)
})

socket.on('listening', () => {
  const { address, port } = socket.address()
  logger.info(`dohnut listening on ${address}:${port}`)
})

socket.on('message', async (message, rinfo) => {
  logger.info('query received')
  const reply = await fetch(client, pathname, message)
  logger.info('reply sent')
  socket.send(reply, 0, reply.length, rinfo.port, rinfo.address)
})

socket.on('error', (err) => {
  logger.error(`error:\n${err.stack}`)
  socket.close()
})

socket.bind(program.port)
