<template>
  <div class="fixed bottom-4 right-4 z-50 space-y-2 w-80 max-w-[calc(100vw-2rem)]">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="rounded-lg px-4 py-3 shadow-lg text-sm text-white flex justify-between gap-3"
      :class="{
        'bg-green-600': toast.type === 'success',
        'bg-red-600': toast.type === 'error',
        'bg-gray-800': toast.type === 'info',
      }"
    >
      <p>{{ toast.text }}</p>
      <button type="button" class="opacity-80 hover:opacity-100" aria-label="ปิด" @click="dismiss(toast.id)">×</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast'

const { toasts, dismiss } = useToast()
</script>
