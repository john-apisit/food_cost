<template>
  <div class="overflow-hidden bg-gray-100" :class="wrapperClass">
    <img
      v-if="src && !broken"
      :src="src"
      :alt="alt"
      class="h-full w-full object-cover"
      loading="lazy"
      referrerpolicy="no-referrer"
      @error="broken = true"
    />
    <div v-else class="flex h-full w-full items-center justify-center text-gray-400">
      <UtensilsCrossed :class="iconClass" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { UtensilsCrossed } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    src?: string
    alt?: string
    wrapperClass?: string
    iconClass?: string
  }>(),
  {
    src: '',
    alt: '',
    wrapperClass: 'aspect-[4/3]',
    iconClass: 'h-10 w-10',
  },
)

const broken = ref(false)

watch(
  () => props.src,
  () => {
    broken.value = false
  },
)
</script>
