import { describe, expect, it } from 'vitest'
import { extractGoogleMapCoords, googleMapsEmbedUrl } from './googleMaps'

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

  it('keeps an existing embed URL', () => {
    const url = 'https://www.google.com/maps/embed?pb=!1m18'
    expect(googleMapsEmbedUrl(url)).toBe(url)
  })

  it('extracts src from copied iframe HTML', () => {
    const html = '<iframe src="https://www.google.com/maps?q=13.75,100.5&output=embed"></iframe>'
    expect(googleMapsEmbedUrl(html)).toBe('https://www.google.com/maps?q=13.75,100.5&output=embed')
  })
})
