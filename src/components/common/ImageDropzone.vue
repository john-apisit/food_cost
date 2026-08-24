<template>
  <div>
    <input
      ref="inputRef"
      type="file"
      class="sr-only"
      accept="image/jpeg,image/png,image/webp,image/gif"
      :disabled="uploading"
      @change="onFileChange"
    />
    <button
      type="button"
      class="w-full rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors cursor-pointer disabled:cursor-wait"
      :aria-label="ariaLabel"
      :class="dropzoneClass"
      :disabled="uploading"
      :aria-busy="uploading"
      @click="openPicker"
      @dragenter.prevent="onDragEnter"
      @dragover.prevent
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
    >
      <ImageIcon class="mx-auto h-8 w-8 text-gray-400 pointer-events-none" />
      <p class="mt-2 text-sm font-medium text-gray-700 pointer-events-none">
        {{ uploading ? 'กำลังอัปโหลด...' : 'คลิกเพื่อเลือกไฟล์ หรือลากรูปมาวาง' }}
      </p>
      <p class="mt-1 text-xs text-gray-500 pointer-events-none">JPG, PNG, WebP หรือ GIF ไม่เกิน 5 MB</p>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Image as ImageIcon } from 'lucide-vue-next'
import { useStorageUpload } from '@/composables/useStorageUpload'
import { useToast } from '@/composables/useToast'

withDefaults(
  defineProps<{
    ariaLabel?: string
  }>(),
  {
    ariaLabel: 'อัปโหลดรูป',
  },
)

const emit = defineEmits<{
  uploaded: [url: string]
}>()

const { uploading, uploadPublicImage } = useStorageUpload()
const { error } = useToast()

const inputRef = ref<HTMLInputElement | null>(null)
const dragDepth = ref(0)

const dropzoneClass = computed(() => {
  if (uploading.value) return 'border-gray-200 bg-gray-50 cursor-wait'
  if (dragDepth.value > 0) return 'border-primary-500 bg-primary-50'
  return 'border-gray-300 bg-white hover:border-primary-300 hover:bg-primary-50/40'
})

const openPicker = () => {
  if (uploading.value) return
  inputRef.value?.click()
}

const onDragEnter = () => {
  if (uploading.value) return
  dragDepth.value += 1
}

const onDragLeave = () => {
  dragDepth.value = Math.max(0, dragDepth.value - 1)
}

const onDrop = async (event: DragEvent) => {
  dragDepth.value = 0
  const file = event.dataTransfer?.files?.[0]
  if (file) await upload(file)
}

const onFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) await upload(file)
}

const upload = async (file: File) => {
  if (uploading.value) return
  try {
    const { publicUrl } = await uploadPublicImage(file)
    emit('uploaded', publicUrl)
  } catch (e: unknown) {
    error(e instanceof Error ? e.message : 'อัปโหลดรูปไม่สำเร็จ')
  }
}
</script>
