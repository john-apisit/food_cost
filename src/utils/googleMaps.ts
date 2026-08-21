export interface MapCoords {
  lat: number
  lng: number
}

function isValidCoords(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
}

export function extractGoogleMapCoords(input: string): MapCoords | null {
  const raw = input.trim()
  if (!raw) return null

  const placePin = raw.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/)
  if (placePin) {
    const lat = Number(placePin[1])
    const lng = Number(placePin[2])
    if (isValidCoords(lat, lng)) return { lat, lng }
  }

  const at = raw.match(/@(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/)
  if (at) {
    const lat = Number(at[1])
    const lng = Number(at[2])
    if (isValidCoords(lat, lng)) return { lat, lng }
  }

  const query = raw.match(/[?&](?:q|query|destination)=(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/)
  if (query) {
    const lat = Number(query[1])
    const lng = Number(query[2])
    if (isValidCoords(lat, lng)) return { lat, lng }
  }

  const bare = raw.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/)
  if (bare) {
    const lat = Number(bare[1])
    const lng = Number(bare[2])
    if (isValidCoords(lat, lng)) return { lat, lng }
  }

  return null
}

function iframeSrc(input: string): string | null {
  const match = input.match(/src=["']([^"']+)["']/i)
  return match?.[1] ?? null
}

function isGoogleMapsHost(hostname: string): boolean {
  const host = hostname.replace(/^www\./, '').toLowerCase()
  return (
    host === 'google.com' ||
    host.endsWith('.google.com') ||
    host === 'goo.gl' ||
    host === 'maps.app.goo.gl'
  )
}

export function googleMapsEmbedUrl(input: string): string | null {
  const raw = input.trim()
  if (!raw) return null

  const fromIframe = iframeSrc(raw)
  if (fromIframe) return googleMapsEmbedUrl(fromIframe)

  if (/[?&]output=embed\b/i.test(raw) || /\/maps\/embed/i.test(raw)) {
    return raw
  }

  const coords = extractGoogleMapCoords(raw)
  if (coords) {
    return `https://www.google.com/maps?q=${coords.lat},${coords.lng}&z=16&output=embed`
  }

  try {
    const url = new URL(raw)
    if (isGoogleMapsHost(url.hostname)) {
      const q = url.searchParams.get('q') || url.searchParams.get('query') || url.searchParams.get('destination')
      if (q) {
        return `https://www.google.com/maps?q=${encodeURIComponent(q)}&z=16&output=embed`
      }
      return `https://www.google.com/maps?q=${encodeURIComponent(raw)}&z=16&output=embed`
    }
  } catch {
    // Treat free text as a search query.
  }

  return `https://www.google.com/maps?q=${encodeURIComponent(raw)}&z=16&output=embed`
}
