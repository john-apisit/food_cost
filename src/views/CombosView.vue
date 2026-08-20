<template>
  <MainLayout>
    <div class="space-y-6">
      <div class="flex justify-between items-center gap-3">
        <h1 class="page-title">ชุดโปรโมชัน / Combo</h1>
        <button type="button" class="btn-primary" @click="openCreate">+ เพิ่มชุด</button>
      </div>

      <div v-if="loading" class="text-gray-500">กำลังโหลด...</div>
      <EmptyState v-else-if="!combos.length" title="ยังไม่มีชุดโปรโมชัน" />

      <div v-else class="space-y-4">
        <article v-for="row in comboBreakdowns" :key="row.combo.id" class="card p-5 space-y-3">
          <div class="flex justify-between gap-3">
            <div>
              <h2 class="font-bold text-lg">{{ row.combo.name }}</h2>
              <p class="text-sm text-gray-500">ราคาชุด {{ formatCurrency(row.combo.sellingPrice) }}</p>
            </div>
            <div class="text-right">
              <p class="text-sm text-gray-500">กำไรสุทธิ</p>
              <p class="font-bold" :class="row.netProfit < 0 ? 'text-red-600' : 'text-green-600'">
                {{ formatCurrency(row.netProfit) }} ({{ row.netMarginPercent.toFixed(1) }}%)
              </p>
            </div>
          </div>
          <ul class="text-sm text-gray-600 list-disc pl-5">
            <li v-for="item in row.itemBreakdowns" :key="item.menuItem.id">
              {{ item.menuItem.name }} × {{ item.quantity }} — ต้นทุน {{ formatCurrency(item.lineCost) }}
            </li>
          </ul>
          <div class="flex gap-3 text-sm">
            <button type="button" class="text-primary-600" @click="openEdit(row.combo)">แก้ไข</button>
            <button type="button" class="text-red-600" @click="remove(row.combo.id)">ลบ</button>
          </div>
        </article>
      </div>

      <Modal :is-open="formOpen" :title="editingId ? 'แก้ไขชุด' : 'เพิ่มชุด'" @close="formOpen = false">
        <form class="space-y-4" @submit.prevent="save">
          <div>
            <label class="block text-sm font-medium mb-1">ชื่อชุด *</label>
            <input v-model="form.name" required class="input-field w-full" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">ราคาขายชุด *</label>
            <input v-model.number="form.sellingPrice" type="number" min="0" step="0.01" required class="input-field w-full" />
          </div>
          <div class="space-y-2">
            <p class="text-sm font-medium">เมนูในชุด</p>
            <div v-for="(item, index) in form.items" :key="index" class="flex gap-2">
              <select v-model="item.menuItemId" class="input-field flex-1">
                <option value="">เลือกเมนู...</option>
                <option v-for="menu in menuItems" :key="menu.id" :value="menu.id">{{ menu.name }}</option>
              </select>
              <input v-model.number="item.quantity" type="number" min="1" class="input-field w-20" />
              <button type="button" class="text-red-600 text-sm" @click="form.items.splice(index, 1)">ลบ</button>
            </div>
            <button type="button" class="text-primary-600 text-sm" @click="form.items.push({ menuItemId: '', quantity: 1 })">
              + เพิ่มเมนู
            </button>
          </div>
          <div class="flex gap-2">
            <button type="submit" class="btn-primary flex-1">บันทึก</button>
            <button type="button" class="btn-secondary flex-1" @click="formOpen = false">ยกเลิก</button>
          </div>
        </form>
      </Modal>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import Modal from '@/components/common/Modal.vue'
import { useCostBreakdown } from '@/composables/useCostBreakdown'
import { useCombos } from '@/composables/useCombos'
import { useToast } from '@/composables/useToast'
import { formatCurrency } from '@/utils/format'
import type { Combo } from '@/types/models'

const { comboBreakdowns, loadAll, menuItems, combos, loading } = useCostBreakdown()
const { createCombo, updateCombo, deleteCombo } = useCombos()
const { success, error } = useToast()

const formOpen = ref(false)
const editingId = ref<string | null>(null)
const form = reactive({
  name: '',
  sellingPrice: 0,
  items: [{ menuItemId: '', quantity: 1 }],
})

const resetForm = () => {
  form.name = ''
  form.sellingPrice = 0
  form.items = [{ menuItemId: '', quantity: 1 }]
  editingId.value = null
}

const openCreate = () => {
  resetForm()
  formOpen.value = true
}

const openEdit = (combo: Combo) => {
  editingId.value = combo.id
  form.name = combo.name
  form.sellingPrice = combo.sellingPrice
  form.items = (combo.items || []).map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity }))
  if (!form.items.length) form.items = [{ menuItemId: '', quantity: 1 }]
  formOpen.value = true
}

const save = async () => {
  const payload = {
    name: form.name,
    sellingPrice: form.sellingPrice,
    items: form.items.filter((i) => i.menuItemId && i.quantity > 0),
  }
  try {
    if (editingId.value) await updateCombo(editingId.value, payload)
    else await createCombo(payload)
    success('บันทึกชุดแล้ว')
    formOpen.value = false
  } catch (e: unknown) {
    error(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
  }
}

const remove = async (id: string) => {
  if (!confirm('ลบชุดนี้?')) return
  try {
    await deleteCombo(id)
    success('ลบแล้ว')
  } catch (e: unknown) {
    error(e instanceof Error ? e.message : 'ลบไม่สำเร็จ')
  }
}

onMounted(() => loadAll())
</script>
