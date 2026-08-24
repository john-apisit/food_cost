import { ref } from 'vue'
import { supabase } from '@/config/supabase'
import { imageExtension, MENU_IMAGE_BUCKET, validateImageFile } from '@/utils/imageUpload'
import { useAuth } from './useAuth'
import { useCurrentStore } from './useCurrentStore'

export function useStorageUpload() {
  const { user } = useAuth()
  const { currentStoreId } = useCurrentStore()
  const uploading = ref(false)

  const uploadPublicImage = async (file: File) => {
    const validationError = validateImageFile(file)
    if (validationError) throw new Error(validationError)
    if (!user.value) throw new Error('ต้องเข้าสู่ระบบก่อนอัปโหลดรูป')
    if (!currentStoreId.value) throw new Error('ยังไม่ได้เลือกร้าน')

    uploading.value = true
    try {
      const path = `${currentStoreId.value}/${crypto.randomUUID()}.${imageExtension(file)}`
      const { error: uploadError } = await supabase.storage.from(MENU_IMAGE_BUCKET).upload(path, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: false,
      })
      if (uploadError) throw new Error('อัปโหลดรูปไม่สำเร็จ')

      const { data } = supabase.storage.from(MENU_IMAGE_BUCKET).getPublicUrl(path)
      if (!data.publicUrl) throw new Error('ไม่สามารถสร้างลิงก์รูปได้')
      return { publicUrl: data.publicUrl, path }
    } finally {
      uploading.value = false
    }
  }

  return { uploading, uploadPublicImage }
}
