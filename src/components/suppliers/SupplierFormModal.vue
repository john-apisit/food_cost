<template>
  <Modal :is-open="isOpen" :title="heading" @close="$emit('close')">
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">ชื่อ *</label>
        <input v-model="formData.name" type="text" required class="input-field w-full" placeholder="เช่น แม็คโคร, ตลาดสด" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
        <textarea v-model="formData.notes" rows="3" class="input-field w-full" placeholder="เช่น วันที่เปิด, เบอร์ติดต่อ"></textarea>
      </div>
      <div class="flex gap-3 pt-2">
        <button type="submit" class="btn-primary flex-1" :disabled="saving">
          {{ saving ? 'กำลังบันทึก...' : 'บันทึก' }}
        </button>
        <button type="button" class="btn-secondary flex-1" @click="$emit('close')">ยกเลิก</button>
      </div>
    </form>
  </Modal>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import type { Supplier } from '@/types/models'
import Modal from '@/components/common/Modal.vue'

const props = defineProps<{
  isOpen: boolean
  supplier?: Supplier | null
  saving?: boolean
}>()

const emit = defineEmits<{
  close: []
  save: [data: { name: string; notes?: string }]
}>()

const formData = reactive({
  name: '',
  notes: '',
})

const heading = computed(() => `${props.supplier?.id ? 'แก้ไข' : 'เพิ่ม'}ซัพพลายเออร์`)

watch(
  () => [props.supplier, props.isOpen] as const,
  () => {
    if (props.supplier) {
      formData.name = props.supplier.name
      formData.notes = props.supplier.notes || ''
    } else {
      formData.name = ''
      formData.notes = ''
    }
  },
  { immediate: true },
)

const handleSubmit = () => {
  emit('save', {
    name: formData.name.trim(),
    notes: formData.notes.trim() || undefined,
  })
}
</script>
