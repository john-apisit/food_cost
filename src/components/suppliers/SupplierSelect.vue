<template>
  <div class="space-y-2">
    <select
      :value="modelValue"
      class="input-field w-full"
      :required="required"
      @change="onChange"
    >
      <option value="">ไม่ระบุ</option>
      <option v-if="orphanId" :value="orphanId">{{ fallbackLabel || 'ซัพพลายเออร์ที่ถูกลบแล้ว' }}</option>
      <option v-for="item in visibleOptions" :key="item.id" :value="item.id">
        {{ item.name }}
      </option>
    </select>

    <div v-if="allowCreate">
      <button
        v-if="!creating"
        type="button"
        class="text-sm text-primary-600 hover:text-primary-800"
        @click="creating = true"
      >
        + เพิ่มซัพพลายเออร์ใหม่
      </button>
      <div v-else class="flex gap-2">
        <input
          v-model="newName"
          type="text"
          class="input-field flex-1"
          placeholder="ชื่อร้าน เช่น แม็คโคร"
          @keyup.enter.prevent="create"
        />
        <button type="button" class="btn-secondary px-3" :disabled="creatingBusy" @click="create">
          {{ creatingBusy ? '...' : 'เพิ่ม' }}
        </button>
        <button type="button" class="btn-secondary px-3" @click="cancelCreate">ยกเลิก</button>
      </div>
      <p v-if="createError" class="mt-1 text-xs text-red-600">{{ createError }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useSuppliers } from '@/composables/useSuppliers'

const props = withDefaults(
  defineProps<{
    modelValue: string
    required?: boolean
    allowCreate?: boolean
    fallbackLabel?: string
  }>(),
  { allowCreate: true },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const { suppliers, loading, fetchSuppliers, createSupplier } = useSuppliers()
const creating = ref(false)
const creatingBusy = ref(false)
const newName = ref('')
const createError = ref('')

const visibleOptions = computed(() => suppliers.value.filter((item) => item.isActive))

const orphanId = computed(() => {
  if (!props.modelValue || loading.value) return ''
  return visibleOptions.value.some((item) => item.id === props.modelValue) ? '' : props.modelValue
})

const onChange = (event: Event) => {
  emit('update:modelValue', (event.target as HTMLSelectElement).value)
}

const cancelCreate = () => {
  creating.value = false
  newName.value = ''
  createError.value = ''
}

const create = async () => {
  const name = newName.value.trim()
  if (!name) {
    createError.value = 'กรุณาใส่ชื่อซัพพลายเออร์'
    return
  }
  creatingBusy.value = true
  createError.value = ''
  try {
    const created = await createSupplier({ name })
    if (created) emit('update:modelValue', created.id)
    cancelCreate()
  } catch (e: unknown) {
    createError.value = e instanceof Error ? e.message : 'เพิ่มไม่สำเร็จ'
  } finally {
    creatingBusy.value = false
  }
}

onMounted(() => fetchSuppliers())
</script>
