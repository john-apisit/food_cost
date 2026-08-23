<template>
  <router-view />
  <ToastContainer />
</template>

<script setup lang="ts">
import ToastContainer from '@/components/common/ToastContainer.vue'
import { initTheme } from '@/composables/useTheme'

initTheme()
</script>
