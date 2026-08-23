import { describe, expect, it, vi } from 'vitest'
import { expandGoogleMapsUrl, handleExpandMapsRequest } from './expandGoogleMapsUrl'

function redirectResponse(location: string | null): Response {
  return {
    headers: {
      get: (name: string) => (name.toLowerCase() === 'location' ? location : null),
    },
  } as Response
}

describe('expandGoogleMapsUrl', () => {
  it('follows a maps.app.goo.gl redirect and stops at coordinates', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      redirectResponse('https://www.google.com/maps/search/13.858866,+100.387793?entry=tts'),
    )

    await expect(
      expandGoogleMapsUrl('https://maps.app.goo.gl/QUcBeEsnaiTAdLeb9', fetchImpl),
    ).resolves.toBe('https://www.google.com/maps/search/13.858866,+100.387793?entry=tts')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('rejects non-Google URLs', async () => {
    await expect(expandGoogleMapsUrl('https://example.com/maps')).rejects.toThrow('Unsupported')
  })
})

describe('handleExpandMapsRequest', () => {
  it('returns the expanded url', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      redirectResponse('https://www.google.com/maps/search/13.858866,+100.387793'),
    )

    await expect(
      handleExpandMapsRequest('https://maps.app.goo.gl/QUcBeEsnaiTAdLeb9', fetchImpl),
    ).resolves.toEqual({
      status: 200,
      body: { url: 'https://www.google.com/maps/search/13.858866,+100.387793' },
    })
  })

  it('returns 400 for missing url', async () => {
    await expect(handleExpandMapsRequest(null)).resolves.toEqual({
      status: 400,
      body: { error: 'Missing url' },
    })
  })
})
