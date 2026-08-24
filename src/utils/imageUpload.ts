export const MENU_IMAGE_BUCKET = 'menu-images'
export const MAX_MENU_IMAGE_BYTES = 5 * 1024 * 1024
export const ALLOWED_MENU_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const

export type ImageFileLike = Pick<File, 'name' | 'type' | 'size'>

const EXTENSION_BY_TYPE: Record<(typeof ALLOWED_MENU_IMAGE_TYPES)[number], string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export function validateImageFile(file: ImageFileLike): string | null {
  if (!ALLOWED_MENU_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_MENU_IMAGE_TYPES)[number])) {
    return 'รองรับเฉพาะไฟล์ JPG, PNG, WebP หรือ GIF'
  }
  if (file.size > MAX_MENU_IMAGE_BYTES) {
    return 'ขนาดไฟล์ต้องไม่เกิน 5 MB'
  }
  return null
}

export function imageExtension(file: ImageFileLike): string {
  const fromName = file.name.split('.').pop()?.toLowerCase()
  if (fromName === 'jpeg' || fromName === 'jpg') return 'jpg'
  if (fromName === 'png' || fromName === 'webp' || fromName === 'gif') return fromName
  return EXTENSION_BY_TYPE[file.type as (typeof ALLOWED_MENU_IMAGE_TYPES)[number]] ?? 'jpg'
}
