#!/usr/bin/env node

const { Dohnut } = require('./master')
const { aliased } = require('@commonshost/resolvers')
const yargs = require('yargs')
const chalk = require('chalk')
const { platform } = require('os')

function splitStrings (array) {
  const values = []
  for (const value of array) {
    if (typeof value === 'string') {
      values.push(...value.split(/\s+/))
    } else {
      values.push(value)
    }
  }
  return values
}

function parseOptions ({
  cacheDirectory,
  doh = [],
  listen = [],
  loadBalance,
  countermeasures,
  bootstrap,
  datagramProtocol
}) {
  const configuration = {
    cacheDirectory,
    dns: [],
    doh: [],
    loadBalance,
    countermeasures,
    bootstrap,
    datagramProtocol
  }

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
      type = datagramProtocol
      address = datagramProtocol === 'udp4' ? '127.0.0.1' : '::1'
    } else if (matchIpv4.test(listener)) {
      ({ $1: address, $2: port } = RegExp)
      type = 'udp4'
    } else if (matchIpv6.test(listener)) {
      ({ $1: address, $2: port } = RegExp)
      type = 'udp6'
    } else {
      throw new Error(`Not recognized as IPv4/IPv6 address: ${listener}`)
    }
    configuration.dns.push({ address, type, port: Number(port) || 53 })
  }

  switch (platform()) {
    case 'darwin':
    case 'linux': {
      const socketActivation = require('socket-activation')
      try {
        for (const fd of socketActivation.collect('dohnut')) {
          configuration.dns.push({ fd, type: datagramProtocol })
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
  }

  if (!configuration.cacheDirectory) {
    configuration.cacheDirectory = process.cwd()
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
    .env('DOHNUT')
    .option('doh', {
      coerce: splitStrings,
      type: 'array',
      alias: ['upstream', 'proxy'],
      describe: 'URI Templates or shortnames of upstream DNS over HTTPS resolvers',
      default: []
    })
    .option('listen', {
      coerce: splitStrings,
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
      describe: 'Strategy when using multiple DoH resolvers',
      choices: ['performance', 'privacy'],
      default: 'performance'
    })
    .option('countermeasures', {
      coerce: splitStrings,
      type: 'array',
      describe: 'Special tactics to protect your privacy',
      choices: ['spoof-queries', 'spoof-useragent'],
      default: []
    })
    .option('bootstrap', {
      coerce: splitStrings,
      type: 'array',
      describe: 'IP addresses of DNS servers used to resolve the DoH URI hostname',
      default: []
    })
    .option('datagram-protocol', {
      type: 'string',
      describe: 'Use IPv4 or IPv6 with unspecified listen addresses and file descriptors',
      choices: ['udp4', 'udp6'],
      default: 'udp6'
    })
    .option('cacheDirectory', {
      type: 'string',
      describe: 'Directory path to store cached data. Defaults to current working directory.',
      default: ''
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
    .example('--port 53 --datagram-protocol udp4')
    .example('Listen on 127.0.0.1:53 using UDP over IPv4.')
    .example('')
    .example('--port 53 --datagram-protocol udp6')
    .example('Listen on [::1]:53 using UDP over IPv6.')
    .example('')
    .example('--test --doh https://example.com --listen 192.168.12.34')
    .example('Check the syntax of the URI and IP address arguments. No connections are attempted.')
    .example('')
    .example('--load-balance privacy --doh quad9 cloudflare commonshost')
    .example('Send queries to one of multiple DoH services at random for increased privacy.')
    .example('')
    .example('--load-balance performance --doh quad9 cloudflare commonshost')
    .example('Send queries to the fastest DoH service by measuring ping round-trip-times.')
    .example('')
    .example('--countermeasures spoof-queries --cache-directory /etc/dohnut')
    .example('Randomly send fake DNS queries as disinformation to deter tracking by resolvers.')
    .example('The domains are saved in the cache directory for reuse on restart.')
    .example('')
    .example('--countermeasures spoof-useragent')
    .example('Mimic popular web browsers by including a random User-Agent header with each request. Default is no User-Agent header.')
    .example('')
    .example('--bootstrap 192.168.1.1 1.1.1.1 8.8.8.8 9.9.9.9')
    .example('Bypass the operating system DNS settings when resolving a DoH service hostname.')
    .example('')
    .example('Shortnames mapped to a DoH URI:')
    .example(Array.from(aliased.doh.keys()).sort().join(', '))
    .config()
    .version()
    .help()
    .wrap(null)

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
      if (notify) {
        notify.stopWatchdogMode()
      }
    })
  }

  let notify
  try {
    notify = require('sd-notify')
  } catch (error) {
  }
  if (notify) {
    const watchdogInterval = notify.watchdogInterval()
    if (watchdogInterval > 0) {
      const interval = Math.max(500, Math.floor(watchdogInterval / 2))
      notify.startWatchdogMode(interval)
      console.log('Started systemd heartbeat')
    }
    notify.ready()
    console.log('Notified systemd ready')
  }
}

main()
  .catch((error) => {
    error.message = chalk.red(error.message)
    console.trace(error)
    process.exit(1)
  })
