import { useState, useEffect } from 'react'

function get(w) {
  if (w < 640) return 'sm'   // phone
  if (w < 1024) return 'md'  // tablet
  return 'lg'                // desktop
}

export function useBreakpoint() {
  const [bp, setBp] = useState(() => get(window.innerWidth))
  useEffect(() => {
    const handler = () => setBp(get(window.innerWidth))
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return bp
}
