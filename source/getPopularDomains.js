const { get } = require('https')
const { createBrotliCompress, createBrotliDecompress, constants } = require('zlib')
const { brotliCompressSync, brotliDecompressSync } = require('zlib')
const { createReadStream, createWriteStream, statSync } = require('fs')
const { readFileSync, writeFileSync } = require('fs')
const { tmpdir } = require('os')
const { join } = require('path')
const { createInterface } = require('readline')
const yauzl = require('yauzl')

const LIST_URL = 'https://s3-us-west-1.amazonaws.com/umbrella-static/top-1m.csv.zip'

function download (url, archivepath) {
  return new Promise((resolve, reject) => {
    const request = get(url, (response) => {
      if (response.headers['content-type'] !== 'application/zip') {
        reject(new Error('Unexpected Content-Type header'))
      }
      const file = createWriteStream(archivepath)
      response.on('error', reject)
      file.on('error', reject)
      response.pipe(file)
      file.on('close', resolve)
    })
    request.on('error', reject)
  })
}

function unzip (archivepath, entrypath, csvpath) {
  return new Promise((resolve, reject) => {
    yauzl.open(archivepath, { lazyEntries: true }, (error, zipfile) => {
      if (error) return reject(error)
      zipfile.readEntry()
      zipfile.on('entry', (entry) => {
        if (entry.fileName !== entrypath) {
          return reject(new Error('Unexpected file in archive'))
        }
        zipfile.openReadStream(entry, (error, readStream) => {
          if (error) return reject(error)
          readStream.on('error', reject)
          const file = createWriteStream(csvpath)
          readStream.pipe(file)
          readStream.on('end', resolve)
        })
      })
      zipfile.on('end', () => reject(new Error('Empty archive')))
    })
  })
}

function cleanupSync (csvpath, listpath) {
  return new Promise((resolve, reject) => {
    const lines = readFileSync(csvpath, { encoding: 'utf8' }).split('\r\n')
    const concat = []
    for (const line of lines) {
      const [, domain] = line.split(',')
      if (domain !== undefined && domain.length > 0) {
        concat.push(domain)
      }
    }
    const compressed = brotliCompressSync(concat.join('\n'), {
      params: {
        [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
        [constants.BROTLI_PARAM_QUALITY]: 1,
        [constants.BROTLI_PARAM_SIZE_HINT]: statSync(csvpath).size
      }
    })
    writeFileSync(listpath, compressed)
    resolve()
  })
}

function cleanup (csvpath, listpath) {
  return new Promise((resolve, reject) => {
    const csv = createReadStream(csvpath)
    csv.on('error', reject)
    const compressor = createBrotliCompress({
      params: {
        [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
        [constants.BROTLI_PARAM_QUALITY]: 1,
        [constants.BROTLI_PARAM_SIZE_HINT]: statSync(csvpath).size
      }
    })
    compressor.on('error', reject)
    const output = createWriteStream(listpath)
    output.on('error', reject)
    compressor.pipe(output)
    const readlines = createInterface({
      input: csv,
      crlfDelay: Infinity
    })
    const concat = []
    readlines.on('line', (line) => {
      const [, domain] = line.split(',')
      if (domain !== undefined && domain.length > 0) {
        concat.push(domain)
      }
    })
    readlines.on('close', () => {
      compressor.end(concat.join('\n'))
    })
    output.on('close', resolve)
  })
}

function loadSync (listpath) {
  return new Promise((resolve, reject) => {
    const raw = readFileSync(listpath)
    const text = brotliDecompressSync(raw)
    const domains = text.toString().split('\n')
    resolve(domains)
  })
}

function load (listpath) {
  return new Promise((resolve, reject) => {
    const domains = []
    const list = createReadStream(listpath)
    list.on('error', reject)
    const decompressor = createBrotliDecompress()
    decompressor.on('error', reject)
    list.pipe(decompressor)
    const readlines = createInterface({
      input: decompressor,
      crlfDelay: Infinity
    })
    readlines.on('line', (line) => {
      domains.push(line)
    })
    readlines.on('close', () => {
      resolve(domains)
    })
  })
}

async function getPopularDomains ({
  cacheDirectory = process.cwd(),
  sync = true,
  verbose = true
}) {
  const url = LIST_URL
  const scratch = tmpdir()
  const archivepath = join(scratch, 'top-1m.csv.zip')
  const entrypath = 'top-1m.csv'
  const csvpath = join(scratch, 'top-1m.csv')
  const listpath = join(cacheDirectory, 'top-1m.txt.br')
  const log = verbose ? console.log : Function
  let domains
  try {
    domains = await (sync ? loadSync : load)(listpath)
  } catch (error) {
    if (error.code === 'ENOENT') {
      log('Downloading list of popular domains...')
      await download(url, archivepath)
      log('Extracting archive...')
      await unzip(archivepath, entrypath, csvpath)
      log('Minifying domains...')
      await (sync ? cleanupSync : cleanup)(csvpath, listpath)
      const sizeMB = (statSync(listpath).size / 1e6)
        .toLocaleString(undefined, { maximumFractionDigits: 1 })
      log(`Domains cached at: ${listpath} (${sizeMB} MB)`)
      domains = await (sync ? loadSync : load)(listpath)
    } else {
      throw error
    }
  }
  return domains
}

module.exports.getPopularDomains = getPopularDomains
