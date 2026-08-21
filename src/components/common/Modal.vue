<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    role="dialog"
    aria-modal="true"
  >
    <div class="bg-white rounded-xl shadow-xl w-full max-h-[90vh] overflow-y-auto" :class="wide ? 'max-w-2xl' : 'max-w-md'">
      <div class="flex items-center justify-between px-6 py-4 border-b">
        <h3 class="text-lg font-bold">{{ title }}</h3>
        <button type="button" class="text-gray-400 hover:text-gray-700" aria-label="ปิด" @click="$emit('close')">×</button>
      </div>
      <div class="p-6">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  isOpen: boolean
  title: string
  wide?: boolean
}>()
defineEmits<{ close: [] }>()
</script>
