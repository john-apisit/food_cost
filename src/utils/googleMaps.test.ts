import { describe, expect, it, vi } from 'vitest'
import {
  expandGoogleMapsShortUrl,
  extractGoogleMapCoords,
  googleMapsEmbedUrl,
  isShortGoogleMapsUrl,
} from './googleMaps'

describe('extractGoogleMapCoords', () => {
  it('prefers place pin coordinates over camera position', () => {
    const url =
      'https://www.google.com/maps/place/Bang+Kok/@13.750000,100.490000,17z/data=!3m1!4b1!8m2!3d13.756331!4d100.501765'
    expect(extractGoogleMapCoords(url)).toEqual({ lat: 13.756331, lng: 100.501765 })
  })

  it('reads @lat,lng from a maps URL', () => {
    expect(extractGoogleMapCoords('https://www.google.com/maps/@13.7563,100.5018,17z')).toEqual({
      lat: 13.7563,
      lng: 100.5018,
    })
  })

  it('reads coordinates from a /maps/search path', () => {
    expect(
      extractGoogleMapCoords('https://www.google.com/maps/search/13.858866,+100.387793?entry=tts'),
    ).toEqual({ lat: 13.858866, lng: 100.387793 })
  })

  it('reads bare coordinates', () => {
    expect(extractGoogleMapCoords('13.75, 100.50')).toEqual({ lat: 13.75, lng: 100.5 })
  })
})

describe('googleMapsEmbedUrl', () => {
  it('returns null for empty input', () => {
    expect(googleMapsEmbedUrl('  ')).toBeNull()
  })

  it('builds an embed URL from coordinates in a share link', () => {
    const url = 'https://www.google.com/maps/place/Shop/@13.7563,100.5018,17z'
    expect(googleMapsEmbedUrl(url)).toBe(
      'https://www.google.com/maps?q=13.7563,100.5018&z=16&output=embed',
    )
  })

  it('does not treat a short maps.app.goo.gl link as a search query', () => {
    expect(googleMapsEmbedUrl('https://maps.app.goo.gl/QUcBeEsnaiTAdLeb9')).toBeNull()
  })

  it('keeps an existing embed URL', () => {
    const url = 'https://www.google.com/maps/embed?pb=!1m18'
    expect(googleMapsEmbedUrl(url)).toBe(url)
  })

  it('extracts src from copied iframe HTML', () => {
    const html = '<iframe src="https://www.google.com/maps?q=13.75,100.5&output=embed"></iframe>'
    expect(googleMapsEmbedUrl(html)).toBe('https://www.google.com/maps?q=13.75,100.5&output=embed')
  })
})

describe('isShortGoogleMapsUrl', () => {
  it('detects maps.app.goo.gl share links', () => {
    expect(isShortGoogleMapsUrl('https://maps.app.goo.gl/QUcBeEsnaiTAdLeb9')).toBe(true)
    expect(isShortGoogleMapsUrl('https://www.google.com/maps/@13.75,100.50,17z')).toBe(false)
  })
})

describe('expandGoogleMapsShortUrl', () => {
  it('reads the expanded url from the API', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'https://www.google.com/maps/search/13.858866,+100.387793' }),
    } as Response)

    await expect(expandGoogleMapsShortUrl('https://maps.app.goo.gl/QUcBeEsnaiTAdLeb9')).resolves.toBe(
      'https://www.google.com/maps/search/13.858866,+100.387793',
    )
    fetchMock.mockRestore()
  })
})
