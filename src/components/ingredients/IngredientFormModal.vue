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
        <label class="block text-sm font-medium text-gray-700 mb-1">
          หมวดหมู่{{ type === 'ingredient' ? ' *' : '' }}
        </label>
        <select
          v-if="type === 'ingredient'"
          v-model="formData.category"
          required
          class="input-field w-full"
        >
          <option v-if="legacyCategory" :value="legacyCategory">{{ legacyCategory }}</option>
          <option v-for="cat in INGREDIENT_CATEGORIES" :key="cat" :value="cat">{{ cat }}</option>
        </select>
        <input
          v-else
          v-model="formData.category"
          type="text"
          placeholder="เช่น กล่อง, มัดถุง"
          class="input-field w-full"
        />
      </div>

      <div>
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
import { INGREDIENT_CATEGORIES, type Ingredient, type IngredientType } from '@/types/models'
import Modal from '@/components/common/Modal.vue'

const props = defineProps<{
  isOpen: boolean
  ingredient?: Ingredient | null
  type: IngredientType
  defaultCategory?: string
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
  if (props.type === 'packaging') {
    return `${props.ingredient?.id ? 'แก้ไข' : 'เพิ่ม'}บรรจุภัณฑ์`
  }
  const category = props.ingredient?.category || props.defaultCategory || 'วัตถุดิบ'
  const label = category === 'อื่นๆ' ? 'รายการอื่นๆ' : category
  return `${props.ingredient?.id ? 'แก้ไข' : 'เพิ่ม'}${label}`
})

const legacyCategory = computed(() => {
  const current = props.ingredient?.category
  if (!current) return ''
  return (INGREDIENT_CATEGORIES as readonly string[]).includes(current) ? '' : current
})

watch(
  () => [props.ingredient, props.isOpen, props.type, props.defaultCategory] as const,
  () => {
    formData.type = props.type
    if (props.ingredient) {
      formData.name = props.ingredient.name
      formData.unit = props.ingredient.unit
      formData.pricePerUnit = props.ingredient.pricePerUnit
      formData.category = props.ingredient.category || props.defaultCategory || ''
      formData.supplier = props.ingredient.supplier || ''
      formData.notes = props.ingredient.notes || ''
      formData.isActive = props.ingredient.isActive
    } else {
      formData.name = ''
      formData.unit = ''
      formData.pricePerUnit = 0
      formData.category = props.type === 'ingredient' ? (props.defaultCategory || INGREDIENT_CATEGORIES[0]) : ''
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
