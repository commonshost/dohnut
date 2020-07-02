const test = require('blue-tape')
const { Dohnut } = require('..')
const { promises: { Resolver } } = require('dns')

const sleep = (time) => new Promise((resolve) => setTimeout(resolve, time))

test('Start/Query/Stop', async (t) => {
  const configuration = {
    dns: [
      {
        type: 'udp4',
        address: '127.0.0.1',
        port: 0,
        fd: undefined
      }
    ],
    doh: [
      {
        uri: 'https://cloudflare-dns.com/dns-query'
        // uri: 'https://commons.host'
      }
    ],
    loadBalance: 'performance', // 'privacy'
    countermeasures: [
      'spoof-useragent',
      'spoof-queries'
    ],
    cacheDirectory: process.cwd(),
    bootstrap: [
      // '1.1.1.1'
      // '8.8.8.8'
      // '9.9.9.9'
    ]
  }
  const dohnut = new Dohnut(configuration)
  await dohnut.start()

  await sleep(50)

  const resolver = new Resolver()
  const [listener] = dohnut.dns
  const { address, port } = listener.address()
  resolver.setServers([`${address}:${port}`])

  await t.shouldReject(resolver.resolve4('sigfail.verteiltesysteme.net'))
  await resolver.resolve4('sigok.verteiltesysteme.net')

  await dohnut.stop()
})
