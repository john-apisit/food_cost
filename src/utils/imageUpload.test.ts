import { describe, expect, it } from 'vitest'
import { imageExtension, MAX_MENU_IMAGE_BYTES, validateImageFile } from './imageUpload'

describe('validateImageFile', () => {
  it('accepts a jpeg under the size limit', () => {
    expect(validateImageFile({ name: 'pad.jpg', type: 'image/jpeg', size: 1024 })).toBeNull()
  })

  it('rejects unsupported types', () => {
    expect(validateImageFile({ name: 'notes.pdf', type: 'application/pdf', size: 1024 })).toBe(
      'รองรับเฉพาะไฟล์ JPG, PNG, WebP หรือ GIF',
    )
  })

  it('rejects files over 5 MB', () => {
    expect(
      validateImageFile({ name: 'huge.png', type: 'image/png', size: MAX_MENU_IMAGE_BYTES + 1 }),
    ).toBe('ขนาดไฟล์ต้องไม่เกิน 5 MB')
  })
})

describe('imageExtension', () => {
  it('uses the filename extension when present', () => {
    expect(imageExtension({ name: 'food.WEBP', type: 'image/webp', size: 10 })).toBe('webp')
  })

  it('normalizes jpeg to jpg', () => {
    expect(imageExtension({ name: 'food.jpeg', type: 'image/jpeg', size: 10 })).toBe('jpg')
  })

  it('falls back to the MIME type', () => {
    expect(imageExtension({ name: 'food', type: 'image/png', size: 10 })).toBe('png')
  })
})
