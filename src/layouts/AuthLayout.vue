<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
    <div class="max-w-md w-full">
      <div class="bg-white rounded-2xl shadow-xl p-8">
        <div class="text-center mb-8">
          <div class="mx-auto mb-4 h-12 w-12 rounded-xl bg-primary-500 text-white flex items-center justify-center text-xl font-bold">F</div>
          <h1 class="text-3xl font-bold text-gray-900 mb-2">{{ title }}</h1>
          <p v-if="subtitle" class="text-gray-600">{{ subtitle }}</p>
        </div>
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
}>()
</script>
