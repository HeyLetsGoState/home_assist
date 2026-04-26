import { useState, useEffect, useRef } from 'react'
import { NETDATA_POLL_INTERVAL } from '../config'

const BASE = '/api/netdata'
const POINTS = 60

const SKIP_MOUNT = /^disk_space\.(dev|run|sys|proc|tmpfs|overlay|shm|snap)/

let chartsCache = null

async function fetchCharts() {
  if (chartsCache) return chartsCache
  const res = await fetch(`${BASE}/api/v1/charts`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  chartsCache = await res.json()
  return chartsCache
}

function detectNetIface(charts) {
  const keys = Object.keys(charts.charts ?? {})
  const skip = /^net\.(lo|docker|br-|veth|virbr)/
  const match = keys.find(k => k.startsWith('net.') && !skip.test(k))
  if (!match) throw new Error('No net.* chart found')
  return match
}

function detectDiskCharts(charts) {
  return Object.keys(charts.charts ?? {}).filter(k => k.startsWith('disk_space.') && !SKIP_MOUNT.test(k))
}

function detectTempCharts(charts) {
  // Any chart reporting Celsius is a temperature sensor
  return Object.entries(charts.charts ?? {})
    .filter(([, v]) => v.units === 'Celsius')
    .map(([k, v]) => ({
      chart: k,
      // Use the chart's "name" or family as a human label, falling back to the id suffix
      label: v.family || k.replace(/^sensors\./, '').replace(/_/g, ' ').replace(/\s+\d+$/, '').trim(),
    }))
}

async function fetchChart(chart, points = POINTS) {
  const res = await fetch(
    `${BASE}/api/v1/data?chart=${encodeURIComponent(chart)}&points=${points}&group=average&format=json`,
    { cache: 'no-store' }
  )
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

function parseCpu(data) {
  if (!data?.data?.length) return { series: [], current: null }
  const series = data.data.map(row => row.slice(1).reduce((sum, v) => sum + (v ?? 0), 0))
  return { series, current: series[series.length - 1] ?? null }
}

function parseRam(data) {
  if (!data?.data?.length) return { series: [], current: null, total: null, pct: null }
  const labels = data.labels.slice(1)
  const usedIdx = labels.indexOf('used')
  const idx = usedIdx >= 0 ? usedIdx + 1 : 2
  const series = data.data.map(row => row[idx] ?? 0)
  const lastRow = data.data[data.data.length - 1]
  const total = lastRow ? lastRow.slice(1).reduce((a, b) => a + (b ?? 0), 0) : null
  const current = lastRow ? lastRow[idx] : null
  return { series, current, total, pct: total ? (current / total) * 100 : null }
}

function parseNet(data) {
  if (!data?.data?.length) return { rxSeries: [], txSeries: [], rx: null, tx: null }
  const rxSeries = data.data.map(row => Math.abs(row[1] ?? 0))
  const txSeries = data.data.map(row => Math.abs(row[2] ?? 0))
  const last = data.data[data.data.length - 1]
  return {
    rxSeries,
    txSeries,
    rx: last ? Math.abs(last[1] ?? 0) : null,
    tx: last ? Math.abs(last[2] ?? 0) : null,
  }
}

function parseDiskAll(results) {
  let usedGiB = 0, totalGiB = 0
  for (const data of results) {
    if (!data?.data?.length) continue
    const labels = data.labels.slice(1)
    const usedIdx = labels.indexOf('used')
    const availIdx = labels.indexOf('avail')
    const reservedIdx = labels.indexOf('reserved_for_root')
    const last = data.data[data.data.length - 1]
    if (!last) continue
    usedGiB += usedIdx >= 0 ? (last[usedIdx + 1] ?? 0) : 0
    const avail = availIdx >= 0 ? (last[availIdx + 1] ?? 0) : 0
    const reserved = reservedIdx >= 0 ? (last[reservedIdx + 1] ?? 0) : 0
    totalGiB += (usedIdx >= 0 ? (last[usedIdx + 1] ?? 0) : 0) + avail + reserved
  }
  return { usedGiB, totalGiB, pct: totalGiB > 0 ? (usedGiB / totalGiB) * 100 : null }
}

function parseLoad(data) {
  if (!data?.data?.length) return { load1: null, load5: null, load15: null, series: [] }
  const labels = data.labels.slice(1)
  const i1 = labels.indexOf('load1') + 1 || 1
  const i5 = labels.indexOf('load5') + 1 || 2
  const i15 = labels.indexOf('load15') + 1 || 3
  const series = data.data.map(row => row[i1] ?? 0)
  const last = data.data[data.data.length - 1]
  return {
    load1:  last ? (last[i1]  ?? null) : null,
    load5:  last ? (last[i5]  ?? null) : null,
    load15: last ? (last[i15] ?? null) : null,
    series,
  }
}

function parseTemps(results, tempCharts) {
  return results
    .map((data, i) => {
      if (!data?.data?.length) return null
      const last = data.data[data.data.length - 1]
      // Average all non-time columns — handles multi-core sensor arrays
      const vals = last.slice(1).filter(v => v != null && v > 0)
      const temp = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
      if (temp == null) return null
      return { label: tempCharts[i].label, temp }
    })
    .filter(Boolean)
}

export function useNetdata() {
  const [data, setData] = useState({ cpu: null, ram: null, net: null, disk: null, load: null, temps: null, status: 'loading' })
  const detected = useRef({ iface: null, diskCharts: null, tempCharts: null })
  const timer = useRef(null)

  const poll = async () => {
    try {
      if (!detected.current.iface) {
        const charts = await fetchCharts()
        detected.current.iface = detectNetIface(charts)
        detected.current.diskCharts = detectDiskCharts(charts)
        detected.current.tempCharts = detectTempCharts(charts)
        console.info('[Netdata] iface:', detected.current.iface,
          '| disks:', detected.current.diskCharts,
          '| temps:', detected.current.tempCharts.map(t => t.chart))
      }

      const { iface, diskCharts, tempCharts } = detected.current
      const [cpu, ram, net, load, ...rest] = await Promise.all([
        fetchChart('system.cpu'),
        fetchChart('system.ram'),
        fetchChart(iface),
        fetchChart('system.load'),
        ...diskCharts.map(c => fetchChart(c, 1)),
        ...tempCharts.map(c => fetchChart(c.chart, 1)),
      ])

      const diskResults = rest.slice(0, diskCharts.length)
      const tempResults = rest.slice(diskCharts.length)

      setData({
        cpu:   parseCpu(cpu),
        ram:   parseRam(ram),
        net:   parseNet(net),
        load:  parseLoad(load),
        disk:  parseDiskAll(diskResults),
        temps: parseTemps(tempResults, tempCharts),
        status: 'ok',
      })
    } catch (err) {
      console.warn('[Netdata]', err.message)
      detected.current = { iface: null, diskCharts: null, tempCharts: null }
      chartsCache = null
      setData(d => ({ ...d, status: 'error' }))
    }
  }

  useEffect(() => {
    poll()
    timer.current = setInterval(poll, NETDATA_POLL_INTERVAL)
    return () => clearInterval(timer.current)
  }, [])

  return data
}
