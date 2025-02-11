#!/usr/bin/env node
import { join } from 'path'
import { table } from 'table'
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import filesize  from 'filesize'
import fs from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ensure that K and B values line up vertically
const filesizeConfig = {symbols: {KB: 'K'}}
const prettySize = bytes => filesize(bytes, filesizeConfig)

function getBundles(path) {
  const meta = JSON.parse(fs.readFileSync(join(path, './dist/meta.json')))
  let metaBundles = Object.values(meta.bundles)

  // fitler out support bundles, since they don't generate CSS
  metaBundles = metaBundles.filter(bundle => !isSupportBundleName(bundle.name))
  const bundles = {}
  for (const bundle of metaBundles) {
    const stats = JSON.parse(fs.readFileSync(join(path, `./${bundle.stats}`)))
    const entry = {
      name: bundle.name,
      path: bundle.css,
      stats: stats
    }
    bundles[bundle.name] = entry
  }

  return bundles
}

const tableOptions = {
  singleLine: true,
  border: {
    topBody: '',
    topJoin: '',
    topLeft: '',
    topRight: '',

    bottomBody: '',
    bottomJoin: '',
    bottomLeft: '',
    bottomRight: '',

    bodyLeft: '|',
    bodyRight: '|',
    bodyJoin: '|',

    joinBody: '',
    joinLeft: '',
    joinRight: '',
    joinJoin: ''
  }
}

// const sortByName = (a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)
const sortByGZipSize = (a, b) => b[3] - a[3]
// const sortByRawSize = (a, b) => b[5] - a[5]
const posNeg = v => (v > 0 ? '+ ' : v < 0 ? '- ' : '')

;(async () => {
  const currentBundles = getBundles(join(__dirname, '../'))
  const latestBundles = getBundles(join(__dirname, '../tmp/node_modules/@primer/css/'))

  let data = []

  // Build the rows
  for (const name of Object.keys(currentBundles)) {
    const current = currentBundles[name]
    const latest = latestBundles[name]

    const delta = [
      current.stats.selectors.total - latest.stats.selectors.total,
      current.stats.gzipSize - latest.stats.gzipSize,
      current.stats.size - latest.stats.size
    ].reduce((a, b) => a + b, 0)

    if (delta !== 0) {
      data.push([
        current.name,
        current.stats.selectors.total,
        current.stats.selectors.total - latest.stats.selectors.total,
        current.stats.gzipSize,
        current.stats.gzipSize - latest.stats.gzipSize,
        current.stats.size,
        current.stats.size - latest.stats.size
      ])
    }
  }

  // Sort the data
  data = data.sort(sortByGZipSize)

  // Beautify the data
  data = data.map(row => {
    row[2] = posNeg(row[2]) + `${row[2]}`.replace('-', '')
    row[3] = prettySize(row[3])
    row[4] = posNeg(row[4]) + `${prettySize(row[4])}`.replace('-', '')
    row[5] = prettySize(row[5])
    row[6] = posNeg(row[6]) + `${prettySize(row[6])}`.replace('-', '')
    return row
  })

  // Adding header
  data = [
    ['name', 'selectors', '±', 'gzip size', '±', 'raw size', '±'],
    [':-', '-:', '-:', '-:', '-:', '-:', '-:']
  ].concat(data)

  console.log(table(data, tableOptions))
})()

function isSupportBundleName(bundleName) {
  // "support", "marketing-support", and any future ones?
  return bundleName.endsWith('support')
}
