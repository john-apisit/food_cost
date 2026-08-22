<template>
  <MainLayout>
    <div class="space-y-6">
      <div class="flex justify-between items-center gap-3">
        <div>
          <h1 class="page-title">ชุดโปรโมชัน / Combo</h1>
          <p class="text-sm text-gray-500 mt-1">เลือกหลายเมนูมาขายพร้อมกันเป็นชุด แล้วตั้งราคาขายชุด</p>
        </div>
        <button type="button" class="btn-primary shrink-0" @click="openCreate">+ เพิ่มชุด</button>
      </div>

      <div v-if="loading" class="text-gray-500">กำลังโหลด...</div>
      <EmptyState
        v-else-if="!combos.length"
        title="ยังไม่มีชุดโปรโมชัน"
        description="รวมเมนูที่ขายด้วยกันบ่อย ๆ เป็นชุด เพื่อดูต้นทุนและกำไรของราคาโปร"
      >
        <button type="button" class="btn-primary" @click="openCreate">สร้างชุดแรก</button>
      </EmptyState>

      <div v-else class="space-y-4">
        <article v-for="row in comboBreakdowns" :key="row.combo.id" class="card p-5 space-y-3">
          <div class="flex justify-between gap-3">
            <div class="min-w-0">
              <h2 class="font-bold text-lg">{{ row.combo.name }}</h2>
              <p class="text-sm text-gray-500">
                ราคาชุด {{ formatCurrency(row.combo.sellingPrice) }}
                <span v-if="row.individualSellingTotal > row.combo.sellingPrice">
                  · แยกชิ้น {{ formatCurrency(row.individualSellingTotal) }}
                </span>
              </p>
            </div>
            <div class="text-right shrink-0">
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

      <Modal :is-open="formOpen" :title="editingId ? 'แก้ไขชุด' : 'เพิ่มชุด'" wide @close="formOpen = false">
        <form class="space-y-4" @submit.prevent="save">
          <div>
            <label class="block text-sm font-medium mb-1">ชื่อชุด *</label>
            <input v-model="form.name" required class="input-field w-full" placeholder="เช่น ชุดข้าว + ไข่ดาว" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">ราคาขายชุด *</label>
            <input v-model.number="form.sellingPrice" type="number" min="0" step="0.01" required class="input-field w-full" />
            <p v-if="draftBreakdown" class="text-xs text-gray-500 mt-1">
              ราคาแยกชิ้นรวม {{ formatCurrency(draftBreakdown.individualSellingTotal) }}
            </p>
          </div>

          <div class="space-y-2">
            <p class="text-sm font-medium">เลือกเมนูในชุด *</p>
            <input v-model="menuSearch" type="search" class="input-field w-full" placeholder="ค้นหาเมนู..." />
            <p v-if="!availableMenus.length" class="text-sm text-gray-500">ยังไม่มีเมนูให้เลือก — สร้างเมนูก่อน</p>
            <div v-else class="max-h-64 overflow-y-auto border border-gray-200 rounded-lg divide-y">
              <label
                v-for="menu in filteredMenus"
                :key="menu.id"
                class="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  class="rounded border-gray-300 text-primary-600"
                  :checked="isSelected(menu.id)"
                  @change="toggleMenu(menu.id)"
                />
                <span class="flex-1 min-w-0">
                  <span class="block truncate font-medium">{{ menu.name }}</span>
                  <span class="block text-xs text-gray-500">{{ formatCurrency(menu.sellingPrice) }}</span>
                </span>
                <input
                  v-if="isSelected(menu.id)"
                  :value="quantityOf(menu.id)"
                  type="number"
                  min="1"
                  class="input-field w-16"
                  @click.stop
                  @input="onQuantityInput(menu.id, $event)"
                />
              </label>
            </div>
            <p class="text-xs text-gray-500">เลือกอย่างน้อย 2 เมนู</p>
          </div>

          <div v-if="draftBreakdown && selectedCount >= 1" class="rounded-lg bg-gray-50 px-3 py-3 text-sm space-y-1">
            <p>ต้นทุนรวม <span class="font-medium">{{ formatCurrency(draftBreakdown.totalCost) }}</span></p>
            <p>
              กำไรสุทธิ
              <span class="font-medium" :class="draftBreakdown.netProfit < 0 ? 'text-red-600' : 'text-green-600'">
                {{ formatCurrency(draftBreakdown.netProfit) }} ({{ draftBreakdown.netMarginPercent.toFixed(1) }}%)
              </span>
            </p>
            <p v-if="suggestedComboPrice != null">
              ราคาแนะนำจากเป้า margin
              {{ settings?.targetMarginPercent }}%:
              <button type="button" class="text-primary-600 font-medium" @click="form.sellingPrice = suggestedComboPrice">
                {{ formatCurrency(suggestedComboPrice) }}
              </button>
            </p>
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
import { computed, onMounted, reactive, ref } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import Modal from '@/components/common/Modal.vue'
import { useCostBreakdown } from '@/composables/useCostBreakdown'
import { useCombos } from '@/composables/useCombos'
import { useToast } from '@/composables/useToast'
import { calculateComboCost, calculateSuggestedPrice } from '@/utils/costCalculator'
import { formatCurrency } from '@/utils/format'
import type { Combo } from '@/types/models'

const { comboBreakdowns, loadAll, menuItems, combos, loading, settings, ingredients } = useCostBreakdown()
const { createCombo, updateCombo, deleteCombo } = useCombos()
const { success, error } = useToast()

const formOpen = ref(false)
const editingId = ref<string | null>(null)
const menuSearch = ref('')
const form = reactive({
  name: '',
  sellingPrice: 0,
  items: [] as Array<{ menuItemId: string; quantity: number }>,
})

const isSelected = (id: string) => form.items.some((item) => item.menuItemId === id)

const availableMenus = computed(() =>
  menuItems.value.filter((menu) => menu.status !== 'discontinued' || isSelected(menu.id)),
)

const filteredMenus = computed(() => {
  const query = menuSearch.value.trim().toLowerCase()
  if (!query) return availableMenus.value
  return availableMenus.value.filter((menu) => menu.name.toLowerCase().includes(query))
})

const selectedCount = computed(() => form.items.filter((item) => item.menuItemId).length)

const draftCombo = computed<Combo>(() => ({
  id: editingId.value || 'draft',
  userId: '',
  name: form.name || 'ชุดใหม่',
  sellingPrice: Number(form.sellingPrice) || 0,
  isActive: true,
  createdAt: '',
  updatedAt: '',
  items: form.items
    .filter((item) => item.menuItemId && item.quantity > 0)
    .map((item, index) => ({
      id: String(index),
      comboId: editingId.value || 'draft',
      menuItemId: item.menuItemId,
      quantity: item.quantity,
      createdAt: '',
      menuItem: menuItems.value.find((menu) => menu.id === item.menuItemId),
    })),
}))

const draftBreakdown = computed(() => {
  if (!settings.value || !draftCombo.value.items?.length) return null
  return calculateComboCost(draftCombo.value, settings.value, ingredients.value, menuItems.value)
})

const suggestedComboPrice = computed(() => {
  if (!settings.value?.targetMarginPercent || !draftBreakdown.value) return null
  try {
    return Math.ceil(
      calculateSuggestedPrice(
        settings.value.targetMarginPercent,
        draftBreakdown.value.totalCost,
        settings.value.platformFeePercent,
      ),
    )
  } catch {
    return null
  }
})

const quantityOf = (id: string) => form.items.find((item) => item.menuItemId === id)?.quantity ?? 1

const toggleMenu = (id: string) => {
  const index = form.items.findIndex((item) => item.menuItemId === id)
  if (index >= 0) form.items.splice(index, 1)
  else form.items.push({ menuItemId: id, quantity: 1 })
}

const setQuantity = (id: string, quantity: number) => {
  const item = form.items.find((row) => row.menuItemId === id)
  if (!item) return
  item.quantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1
}

const onQuantityInput = (id: string, event: Event) => {
  const target = event.target as HTMLInputElement
  setQuantity(id, Number(target.value))
}

const resetForm = () => {
  form.name = ''
  form.sellingPrice = 0
  form.items = []
  menuSearch.value = ''
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
  form.items = (combo.items || []).map((item) => ({ menuItemId: item.menuItemId, quantity: item.quantity }))
  menuSearch.value = ''
  formOpen.value = true
}

const save = async () => {
  const payload = {
    name: form.name.trim(),
    sellingPrice: form.sellingPrice,
    items: form.items.filter((item) => item.menuItemId && item.quantity > 0),
  }
  if (payload.items.length < 2) {
    error('เลือกอย่างน้อย 2 เมนูในชุด')
    return
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
