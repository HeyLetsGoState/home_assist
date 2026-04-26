export function sunTime(isoStr) {
  if (!isoStr) return null
  try {
    return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  } catch { return null }
}
