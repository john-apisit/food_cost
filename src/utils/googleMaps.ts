export interface MapCoords {
  lat: number
  lng: number
}

function isValidCoords(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
}

function decodeMapsInput(input: string): string {
  try {
    return decodeURIComponent(input)
  } catch {
    return input
  }
}

function coordsFromMatch(match: RegExpMatchArray | null): MapCoords | null {
  if (!match) return null
  const lat = Number(match[1])
  const lng = Number(match[2])
  if (!isValidCoords(lat, lng)) return null
  return { lat, lng }
}

export function extractGoogleMapCoords(input: string): MapCoords | null {
  const raw = decodeMapsInput(input.trim())
  if (!raw) return null

  const placePin = coordsFromMatch(raw.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/))
  if (placePin) return placePin

  const at = coordsFromMatch(raw.match(/@(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/))
  if (at) return at

  const searchPath = coordsFromMatch(
    raw.match(/\/maps\/(?:search|dir)\/(-?\d+\.?\d*)\s*,\s*\+?(-?\d+\.?\d*)/),
  )
  if (searchPath) return searchPath

  const query = coordsFromMatch(
    raw.match(/[?&](?:q|query|destination)=(-?\d+\.?\d*)\s*,\s*\+?(-?\d+\.?\d*)/),
  )
  if (query) return query

  const bare = coordsFromMatch(raw.match(/^(-?\d+\.?\d*)\s*,\s*\+?(-?\d+\.?\d*)$/))
  if (bare) return bare

  return null
}

function iframeSrc(input: string): string | null {
  const match = input.match(/src=["']([^"']+)["']/i)
  return match?.[1] ?? null
}

function hostnameOf(hostname: string): string {
  return hostname.replace(/^www\./, '').toLowerCase()
}

export function isAllowedGoogleMapsExpandHost(hostname: string): boolean {
  const host = hostnameOf(hostname)
  return (
    host === 'google.com' ||
    host.endsWith('.google.com') ||
    host === 'goo.gl' ||
    host === 'g.co' ||
    host === 'maps.app.goo.gl'
  )
}

export function isShortGoogleMapsUrl(input: string): boolean {
  try {
    const url = new URL(input.trim())
    const host = hostnameOf(url.hostname)
    return host === 'maps.app.goo.gl' || host === 'goo.gl' || host === 'g.co'
  } catch {
    return false
  }
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

  // Short links have no coordinates; using the URL as a search query makes
  // Google Maps show "custom map content cannot be displayed".
  if (isShortGoogleMapsUrl(raw)) return null

  try {
    const url = new URL(raw)
    if (isAllowedGoogleMapsExpandHost(url.hostname)) {
      const q = url.searchParams.get('q') || url.searchParams.get('query') || url.searchParams.get('destination')
      if (q && !/^https?:\/\//i.test(q)) {
        return `https://www.google.com/maps?q=${encodeURIComponent(q)}&z=16&output=embed`
      }
      const place = url.pathname.match(/\/maps\/place\/([^/@]+)/)
      if (place?.[1]) {
        const name = decodeURIComponent(place[1].replace(/\+/g, ' ')).trim()
        if (name) return `https://www.google.com/maps?q=${encodeURIComponent(name)}&z=16&output=embed`
      }
      return null
    }
  } catch {
    // Treat free text as a search query.
  }

  if (/^https?:\/\//i.test(raw)) return null

  return `https://www.google.com/maps?q=${encodeURIComponent(raw)}&z=16&output=embed`
}

export async function expandGoogleMapsShortUrl(input: string): Promise<string> {
  const res = await fetch(`/api/expand-maps-url?url=${encodeURIComponent(input.trim())}`)
  if (!res.ok) {
    throw new Error('Failed to expand Google Maps URL')
  }
  const data: unknown = await res.json()
  if (!data || typeof data !== 'object' || typeof (data as { url?: unknown }).url !== 'string') {
    throw new Error('Failed to expand Google Maps URL')
  }
  return (data as { url: string }).url
}
