<template>
  <div ref="root" class="relative">
    <button
      type="button"
      class="input-field w-full min-w-[11rem] bg-white px-3 py-2 text-left flex items-center justify-between gap-2"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span class="truncate">{{ buttonLabel }}</span>
      <ChevronDown class="h-4 w-4 shrink-0 text-gray-400 transition-transform" :class="{ 'rotate-180': open }" />
    </button>
    <div
      v-if="open"
      class="absolute right-0 z-20 mt-1 w-full min-w-[13rem] rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
    >
      <label
        v-for="option in options"
        :key="option.value"
        class="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50"
      >
        <input
          type="checkbox"
          class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          :checked="modelValue.includes(option.value)"
          @change="toggle(option.value)"
        />
        <span>{{ option.label }}</span>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T extends string">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ChevronDown } from 'lucide-vue-next'

const props = defineProps<{
  options: Array<{ value: T; label: string }>
  placeholder?: string
}>()

const modelValue = defineModel<T[]>({ default: () => [] })
const open = ref(false)
const root = ref<HTMLElement | null>(null)

const buttonLabel = computed(() => {
  if (!modelValue.value.length) return props.placeholder || 'ทั้งหมด'
  const labels = props.options
    .filter((option) => modelValue.value.includes(option.value))
    .map((option) => option.label)
  return labels.join(', ')
})

const toggle = (value: T) => {
  modelValue.value = modelValue.value.includes(value)
    ? modelValue.value.filter((item) => item !== value)
    : [...modelValue.value, value]
}

const onDocumentClick = (event: MouseEvent) => {
  if (!root.value?.contains(event.target as Node)) open.value = false
}

onMounted(() => document.addEventListener('mousedown', onDocumentClick))
onUnmounted(() => document.removeEventListener('mousedown', onDocumentClick))
</script>

