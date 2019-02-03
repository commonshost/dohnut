#!/usr/bin/env node

const { Dohnut } = require('./master')
const { aliased } = require('@commonshost/resolvers')
const yargs = require('yargs')
const chalk = require('chalk')

function parseOptions ({ doh = [], listen = [] }) {
  const configuration = { dns: [], doh: [] }

  for (const service of doh) {
    let url
    if (aliased.doh.has(service)) {
      url = aliased.doh.get(service).doh
    } else {
      const hasScheme = /^https?:\/\//
      const upstream = hasScheme.test(service) ? service : `https://${service}`
      url = new URL(upstream).toString()
    }
    configuration.doh.push({ doh: url })
  }

  for (const listener of listen) {
    const matchPort = /^(\d{1,5})$/
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
      default: ['https://commons.host']
    })
    .option('listen', {
      type: 'array',
      alias: ['local', 'l'],
      describe: 'IPs and ports for the local DNS server',
      default: ['127.0.0.1:53', '[::1]:53']
    })
    .option('test', {
      type: 'boolean',
      alias: ['validate', 'configtest'],
      describe: 'Validate the arguments without starting the server',
      default: false
    })
    .example('')
    .example('--doh https://localhost/my-own-resolver')
    .example('Use a custom resolver.')
    .example('')
    .example('--doh commonshost cloudflare quad9 cleanbrowsing')
    .example('Multiple DoH resolvers can be used. Shortnames for popular services are supported.')
    .example('')
    .example('--listen :: 0.0.0.0')
    .example('Listen on all network interfaces using both IPv6 and IPv4.')
    .example('')
    .example('--listen 8053')
    .example('Listen on a non-privileged port (>=1024).')
    .example('')
    .example('Shortnames mapped to a DoH URL:')
    .example(Array.from(aliased.doh.keys()).sort().join(', '))
    .version()
    .help()

  const configuration = parseOptions(argv)

  if (argv.test) {
    process.exit(0)
  }

  const dohnut = new Dohnut(configuration)
  await dohnut.start()
  console.log('Dohnut started')
}

main()
  .catch((error) => {
    console.trace(chalk.red(error))
    process.exit(1)
  })
