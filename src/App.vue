<template>
  <router-view :key="viewKey" />
  <ToastContainer />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ToastContainer from '@/components/common/ToastContainer.vue'
import { initTheme } from '@/composables/useTheme'
import { useCurrentStore } from '@/composables/useCurrentStore'

initTheme()

const { currentStoreId } = useCurrentStore()
const viewKey = computed(() => currentStoreId.value || 'none')
</script>
