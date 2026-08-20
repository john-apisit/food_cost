<template>
  <Modal :is-open="isOpen" :title="`ประวัติราคา — ${ingredient?.name ?? ''}`" wide @close="$emit('close')">
    <div v-if="loading" class="text-center py-6 text-gray-500">กำลังโหลด...</div>
    <EmptyState v-else-if="history.length === 0" title="ยังไม่มีประวัติราคา" />
    <table v-else class="min-w-full divide-y divide-gray-200">
      <thead class="bg-gray-50">
        <tr>
          <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">วันที่</th>
          <th class="px-4 py-2 text-right text-xs font-medium text-gray-500">ราคา/หน่วย</th>
        </tr>
      </thead>
      <tbody class="divide-y">
        <tr v-for="row in history" :key="row.id">
          <td class="px-4 py-2">{{ formatDate(row.effectiveAt) }}</td>
          <td class="px-4 py-2 text-right">{{ formatCurrency(row.pricePerUnit) }}</td>
        </tr>
      </tbody>
    </table>
  </Modal>
</template>

<script setup lang="ts">
import type { Ingredient, PriceHistory } from '@/types/models'
import { formatCurrency, formatDate } from '@/utils/format'
import Modal from '@/components/common/Modal.vue'
import EmptyState from '@/components/common/EmptyState.vue'

defineProps<{
  isOpen: boolean
  ingredient?: Ingredient | null
  history: PriceHistory[]
  loading: boolean
}>()
defineEmits<{ close: [] }>()
</script>
