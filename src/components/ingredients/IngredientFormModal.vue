<template>
  <Modal :is-open="isOpen" :title="heading" @close="$emit('close')">
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">ชื่อ *</label>
        <input v-model="formData.name" type="text" required class="input-field w-full" />
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">หน่วย *</label>
          <input v-model="formData.unit" type="text" required placeholder="เช่น kg, กำ, ใบ" class="input-field w-full" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">ราคา/หน่วย (บาท) *</label>
          <input v-model.number="formData.pricePerUnit" type="number" step="0.01" min="0" required class="input-field w-full" />
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">หมวดหมู่</label>
        <input v-model="formData.category" type="text" placeholder="เช่น เนื้อสัตว์, ผัก" class="input-field w-full" />
      </div>

      <div v-if="type === 'ingredient'">
        <label class="block text-sm font-medium text-gray-700 mb-1">ซัพพลายเออร์</label>
        <input v-model="formData.supplier" type="text" class="input-field w-full" />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
        <textarea v-model="formData.notes" rows="3" class="input-field w-full"></textarea>
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
import type { Ingredient, IngredientType } from '@/types/models'
import Modal from '@/components/common/Modal.vue'

const props = defineProps<{
  isOpen: boolean
  ingredient?: Ingredient | null
  type: IngredientType
  saving?: boolean
}>()

const emit = defineEmits<{
  close: []
  save: [data: {
    name: string
    unit: string
    pricePerUnit: number
    category?: string
    supplier?: string
    notes?: string
    type: IngredientType
    isActive: boolean
  }]
}>()

const formData = reactive({
  name: '',
  unit: '',
  pricePerUnit: 0,
  category: '',
  supplier: '',
  notes: '',
  type: props.type,
  isActive: true,
})

const heading = computed(() => {
  const noun = props.type === 'ingredient' ? 'วัตถุดิบ' : 'บรรจุภัณฑ์'
  return `${props.ingredient?.id ? 'แก้ไข' : 'เพิ่ม'}${noun}`
})

watch(
  () => [props.ingredient, props.isOpen, props.type] as const,
  () => {
    formData.type = props.type
    if (props.ingredient) {
      formData.name = props.ingredient.name
      formData.unit = props.ingredient.unit
      formData.pricePerUnit = props.ingredient.pricePerUnit
      formData.category = props.ingredient.category || ''
      formData.supplier = props.ingredient.supplier || ''
      formData.notes = props.ingredient.notes || ''
      formData.isActive = props.ingredient.isActive
    } else {
      formData.name = ''
      formData.unit = ''
      formData.pricePerUnit = 0
      formData.category = ''
      formData.supplier = ''
      formData.notes = ''
      formData.isActive = true
    }
  },
  { immediate: true },
)

const handleSubmit = () => {
  emit('save', {
    name: formData.name,
    unit: formData.unit,
    pricePerUnit: formData.pricePerUnit,
    category: formData.category || undefined,
    supplier: formData.supplier || undefined,
    notes: formData.notes || undefined,
    type: props.type,
    isActive: true,
  })
}
</script>
