<template>
  <div class="text-center py-12 text-gray-500">
    <p class="font-medium text-gray-700">{{ title }}</p>
    <p v-if="description" class="mt-1 text-sm">{{ description }}</p>
    <div v-if="$slots.default" class="mt-4">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>
