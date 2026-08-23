import {
  extractGoogleMapCoords,
  isAllowedGoogleMapsExpandHost,
} from '../utils/googleMaps.ts'

const MAX_HOPS = 8
const MAX_URL_LENGTH = 2000
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export function isExpandableGoogleMapsUrl(input: string): boolean {
  if (!input.trim() || input.length > MAX_URL_LENGTH) return false
  try {
    const url = new URL(input.trim())
    return url.protocol === 'https:' && isAllowedGoogleMapsExpandHost(url.hostname)
  } catch {
    return false
  }
}

export async function expandGoogleMapsUrl(
  input: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  let current = input.trim()
  if (!isExpandableGoogleMapsUrl(current)) {
    throw new Error('Unsupported Google Maps URL')
  }

  for (let hop = 0; hop < MAX_HOPS; hop += 1) {
    if (extractGoogleMapCoords(current)) return current

    const res = await fetchImpl(current, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': USER_AGENT,
      },
    })

    const location = res.headers.get('location')
    if (!location) return current

    const next = new URL(location, current)
    if (next.protocol !== 'https:' || !isAllowedGoogleMapsExpandHost(next.hostname)) {
      throw new Error('Redirected off Google Maps')
    }
    if (next.toString().length > MAX_URL_LENGTH) {
      throw new Error('Expanded URL is too long')
    }
    current = next.toString()
  }

  if (extractGoogleMapCoords(current)) return current
  throw new Error('Could not expand Google Maps URL')
}

export async function handleExpandMapsRequest(
  urlParam: string | null,
  fetchImpl: typeof fetch = fetch,
): Promise<{ status: number; body: Record<string, string> }> {
  const input = urlParam?.trim() || ''
  if (!input) return { status: 400, body: { error: 'Missing url' } }
  if (!isExpandableGoogleMapsUrl(input)) {
    return { status: 400, body: { error: 'Unsupported url' } }
  }

  try {
    const url = await expandGoogleMapsUrl(input, fetchImpl)
    return { status: 200, body: { url } }
  } catch {
    return { status: 502, body: { error: 'Failed to expand url' } }
  }
}
