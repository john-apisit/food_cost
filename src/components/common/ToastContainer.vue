<template>
  <div class="pointer-events-none fixed top-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto flex justify-between gap-3 rounded-lg px-4 py-3 text-sm text-white shadow-lg"
        :class="{
          'bg-green-600': toast.type === 'success',
          'bg-red-600': toast.type === 'error',
          'bg-gray-800': toast.type === 'info',
        }"
      >
        <p>{{ toast.text }}</p>
        <button type="button" class="opacity-80 hover:opacity-100" aria-label="ปิด" @click="dismiss(toast.id)">×</button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast'

const { toasts, dismiss } = useToast()
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.35s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(120%);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(120%);
}
.toast-move {
  transition: transform 0.35s ease;
}
</style>
