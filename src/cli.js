#!/usr/bin/env node

const { Dohnut } = require('./master')
const { aliased } = require('@commonshost/resolvers')
const yargs = require('yargs')
const chalk = require('chalk')

async function main () {
  const { argv } = yargs
    .option('doh', {
      type: 'array',
      describe: 'URLs or shortnames of upstream DNS over HTTPS resolvers',
      default: ['https://commons.host']
    })
    .option('listen', {
      type: 'array',
      describe: 'IPs and ports for the local DNS server',
      default: ['0.0.0.0:53', '[::]:53']
    })
    .example('')
    .example('Shorthand resolver IDs mapped to an IP (DNS) or URL (DoH):')
    .example('- DoH: ' + Array.from(aliased.doh.keys()).sort().join(', '))
    .version()
    .help()

  const configuration = { dns: [], doh: [] }

  for (const doh of argv.listen) {
    // TODO: parse argument and generate the array of objects
  }

  for (const listener of argv.listen) {
    // TODO: parse argument and generate the array of objects
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
