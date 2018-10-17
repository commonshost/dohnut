'use strict'

const base64url = require('base64url')

function readAll (stream, chunks) {
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(chunk))
    stream.on('error', reject)
    stream.once('end', resolve)
  })
}

async function fetch (client, path, query) {
  const queryEncoded = base64url(query)
  const request = client.request({
    ':path': path + '?dns=' + queryEncoded,
    'accept': 'application/dns-message',
    'content-type': 'application/dns-message'
  })
  const chunks = []
  await readAll(request, chunks)
  const res = await Buffer.concat(chunks)
  return res
}

exports.fetch = fetch
