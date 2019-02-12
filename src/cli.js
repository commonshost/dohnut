#!/usr/bin/env node

const { Dohnut } = require('./master')
const { aliased } = require('@commonshost/resolvers')
const yargs = require('yargs')
const chalk = require('chalk')
const { platform } = require('os')

function parseOptions ({
  doh = [],
  listen = [],
  loadBalance,
  countermeasures
}) {
  const configuration = { dns: [], doh: [], loadBalance, countermeasures }

  for (const service of doh) {
    let url
    if (aliased.doh.has(service)) {
      url = aliased.doh.get(service).doh
    } else {
      const hasScheme = /^https?:\/\//
      const upstream = hasScheme.test(service) ? service : `https://${service}`
      url = new URL(upstream).toString()
    }
    configuration.doh.push({ uri: url })
  }

  for (const listener of listen) {
    const matchPort = /^:?(\d{1,5})$/
    const matchIpv4 = /^([\d.]{1,15})(?::(\d{1,5}))?$/
    const matchIpv6 = /^\[?([a-fA-F\d:]{2,40})\]?(?::(\d{1,5}))?$/
    let type, address, port
    if (matchPort.test(listener)) {
      ({ $1: port } = RegExp)
      type = 'udp4'
      address = '127.0.0.1'
    } else if (matchIpv4.test(listener)) {
      ({ $1: address, $2: port } = RegExp)
      type = 'udp4'
    } else if (matchIpv6.test(listener)) {
      ({ $1: address, $2: port } = RegExp)
      type = 'udp6'
    } else {
      throw new Error(`Not recognised as IPv4/IPv6 address: ${listener}`)
    }
    configuration.dns.push({ address, type, port: Number(port) || 53 })
  }

  switch (platform()) {
    case 'darwin':
    case 'linux':
      const socketActivation = require('socket-activation')
      try {
        for (const fd of socketActivation.collect('dohnut')) {
          configuration.dns.push({ fd, type: 'udp4' })
        }
      } catch (error) {
        switch (error.code) {
          case 'ESRCH':
            break
          case 'ENOENT':
            console.warn(error.message)
            break
          default:
            throw error
        }
      }
      break
  }

  if (configuration.doh.length === 0) {
    throw new Error('No upstream DoH services specified.')
  }

  if (configuration.dns.length === 0) {
    throw new Error('No local DNS listeners specified.')
  }

  return configuration
}

async function main () {
  const { argv } = yargs
    .option('doh', {
      type: 'array',
      alias: ['upstream', 'proxy'],
      describe: 'URLs or shortnames of upstream DNS over HTTPS resolvers',
      default: []
    })
    .option('listen', {
      type: 'array',
      alias: ['local', 'l'],
      describe: 'IPs and ports for the local DNS server',
      default: []
    })
    .option('test', {
      type: 'boolean',
      alias: ['validate', 'configtest'],
      describe: 'Validate the arguments without starting the server',
      default: false
    })
    .option('load-balance', {
      alias: ['lb'],
      type: 'string',
      choices: ['fastest-http-ping', 'random'],
      default: 'fastest-http-ping'
    })
    .option('countermeasures', {
      type: 'array',
      choices: ['spoof-queries', 'spoof-useragent'],
      default: []
    })
    .example('')
    .example('--listen 127.0.0.1 ::1 --doh commonshost')
    .example('Only allow localhost connections. Proxy to the Commons Host DoH service.')
    .example('')
    .example('--doh https://localhost/my-own-resolver')
    .example('Use a custom resolver.')
    .example('')
    .example('--doh commonshost cloudflare quad9 cleanbrowsing')
    .example('Multiple DoH service can be used. Shortnames for popular services are supported.')
    .example('')
    .example('--listen :: 0.0.0.0')
    .example('Listen on all network interfaces using both IPv6 and IPv4.')
    .example('')
    .example('--listen 8053')
    .example('Listen on a non-privileged port (>=1024).')
    .example('')
    .example('--test --doh https://example.com --listen 192.168.12.34')
    .example('Check the syntax of the URL and IP address arguments. No connections are attempted.')
    .example('')
    .example('--load-balance random --doh quad9 cloudflare commonshost')
    .example('Send queries to one of multiple DoH services at random for increased privacy.')
    .example('')
    .example('--load-balance fastest-http-ping --doh quad9 cloudflare commonshost')
    .example('Send queries to the fastest DoH service by measuring ping round-trip-times.')
    .example('')
    .example('--countermeasures spoof-queries')
    .example('Randomly send fake DNS queries as disinformation to deter tracking by resolvers.')
    .example('')
    .example('--countermeasures spoof-useragent')
    .example('Mimic popular web browsers by including a random User-Agent header with each request. Default is no User-Agent header.')
    .example('')
    .example('Shortnames mapped to a DoH URL:')
    .example(Array.from(aliased.doh.keys()).sort().join(', '))
    .version()
    .help()

  const configuration = parseOptions(argv)

  if (argv.test) {
    console.log('Configuration is valid')
    console.log(configuration)
    process.exit(0)
  }

  const dohnut = new Dohnut(configuration)
  await dohnut.start()

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, async () => {
      console.log(`${signal} received`)
      await dohnut.stop()
    })
  }

  let notify
  try {
    notify = require('sd-notify')
  } catch (error) {
    if (require('os').platform() === 'linux') {
      console.log('systemd notifications and heartbeat are unavailable')
    }
  }
  if (notify) {
    const watchdogInterval = notify.watchdogInterval()
    if (watchdogInterval > 0) {
      const interval = Math.max(500, Math.floor(watchdogInterval / 2))
      notify.startWatchdogMode(interval)
    }
    notify.ready()
  }
}

main()
  .catch((error) => {
    console.trace(chalk.red(error))
    process.exit(1)
  })
