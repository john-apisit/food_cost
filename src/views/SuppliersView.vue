<template>
  <MainLayout>
    <div class="space-y-4">
      <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 class="page-title">ซัพพลายเออร์</h1>
          <p class="mt-1 text-sm text-gray-500">ร้านค้าที่ใช้กับวัตถุดิบ บรรจุภัณฑ์ และรายจ่าย</p>
        </div>
        <button type="button" class="btn-primary" @click="openCreate">+ เพิ่มซัพพลายเออร์</button>
      </div>

      <input
        v-model="searchTerm"
        type="search"
        placeholder="ค้นหาชื่อร้าน..."
        class="input-field w-full sm:max-w-md"
        aria-label="ค้นหาซัพพลายเออร์"
      />

      <div v-if="loading" class="text-center py-8 text-gray-500">กำลังโหลด...</div>

      <EmptyState
        v-else-if="filteredItems.length === 0"
        title="ยังไม่มีซัพพลายเออร์"
        description="เพิ่มร้านค้าแล้วเลือกจาก dropdown ในหน้าวัตถุดิบและบรรจุภัณฑ์"
      />

      <div v-else class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ชื่อ</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">หมายเหตุ</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">จัดการ</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="item in filteredItems" :key="item.id" class="hover:bg-gray-50">
                <td class="px-4 py-3 font-medium">{{ item.name }}</td>
                <td class="px-4 py-3 text-gray-500 whitespace-pre-line">{{ item.notes || '-' }}</td>
                <td class="px-4 py-3 text-right text-sm font-medium whitespace-nowrap">
                  <button type="button" class="text-primary-600 hover:text-primary-900 mr-3" @click="openEdit(item)">
                    แก้ไข
                  </button>
                  <button type="button" class="text-red-600 hover:text-red-900" @click="confirmDelete(item)">
                    ลบ
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <SupplierFormModal
      :is-open="formOpen"
      :supplier="editing"
      :saving="saving"
      @close="formOpen = false"
      @save="save"
    />
  </MainLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import SupplierFormModal from '@/components/suppliers/SupplierFormModal.vue'
import { useSuppliers } from '@/composables/useSuppliers'
import { useToast } from '@/composables/useToast'
import type { Supplier } from '@/types/models'

const { suppliers, loading, fetchSuppliers, createSupplier, updateSupplier, deleteSupplier } = useSuppliers()
const { success, error } = useToast()

const searchTerm = ref('')
const formOpen = ref(false)
const editing = ref<Supplier | null>(null)
const saving = ref(false)

const filteredItems = computed(() => {
  const query = searchTerm.value.trim().toLowerCase()
  if (!query) return suppliers.value
  return suppliers.value.filter(
    (item) =>
      item.name.toLowerCase().includes(query) || (item.notes || '').toLowerCase().includes(query),
  )
})

const openCreate = () => {
  editing.value = null
  formOpen.value = true
}

const openEdit = (item: Supplier) => {
  editing.value = item
  formOpen.value = true
}

const save = async (data: { name: string; notes?: string }) => {
  saving.value = true
  try {
    if (editing.value) {
      await updateSupplier(editing.value.id, data)
      success('บันทึกซัพพลายเออร์แล้ว')
    } else {
      await createSupplier(data)
      success('เพิ่มซัพพลายเออร์แล้ว')
    }
    formOpen.value = false
  } catch (e: unknown) {
    error(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
  } finally {
    saving.value = false
  }
}

const confirmDelete = async (item: Supplier) => {
  if (!confirm(`ลบ ${item.name}? ร้านนี้จะไม่โชว์ในรายการเลือก แต่รายการที่ผูกไว้ยังแสดงชื่อเดิม`)) return
  try {
    await deleteSupplier(item.id)
    success('ลบแล้ว')
  } catch (e: unknown) {
    error(e instanceof Error ? e.message : 'ลบไม่สำเร็จ')
  }
}

onMounted(() => fetchSuppliers())
</script>
