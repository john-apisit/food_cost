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

      <div v-if="combos.length" class="flex flex-col sm:flex-row gap-3">
        <select v-model="filterStatus" class="input-field sm:w-44">
          <option value="">ทุกสถานะ</option>
          <option v-for="status in MENU_STATUSES" :key="status" :value="status">
            {{ MENU_STATUS_LABELS[status] }}
          </option>
        </select>
      </div>

      <div v-if="loading" class="text-gray-500">กำลังโหลด...</div>
      <EmptyState
        v-else-if="!combos.length"
        title="ยังไม่มีชุดโปรโมชัน"
        description="รวมเมนูที่ขายด้วยกันบ่อย ๆ เป็นชุด เพื่อดูต้นทุนและกำไรของราคาโปร"
      >
        <button type="button" class="btn-primary" @click="openCreate">สร้างชุดแรก</button>
      </EmptyState>
      <EmptyState
        v-else-if="!visibleBreakdowns.length"
        title="ไม่พบชุดในสถานะนี้"
        description="ลองเปลี่ยนตัวกรองสถานะ หรือสร้างชุดใหม่"
      />

      <div v-else class="space-y-4">
        <article v-for="row in visibleBreakdowns" :key="row.combo.id" class="card overflow-hidden flex">
          <div class="shrink-0 p-3">
            <MenuImage
              :src="row.combo.imageUrl"
              :alt="row.combo.name"
              wrapper-class="aspect-square w-28 sm:w-36 rounded-xl"
              icon-class="h-6 w-6"
            />
          </div>
          <div class="p-4 space-y-2 flex-1 min-w-0 flex flex-col">
            <div class="flex justify-between gap-3">
              <div class="min-w-0">
                <h2 class="font-bold text-lg leading-snug">{{ row.combo.name }}</h2>
                <p v-if="row.combo.description" class="mt-0.5 text-sm text-gray-600 line-clamp-2">
                  {{ row.combo.description }}
                </p>
                <p class="text-sm text-gray-500">
                  ราคาชุด {{ formatCurrency(row.combo.sellingPrice) }}
                  <span v-if="row.individualSellingTotal > row.combo.sellingPrice">
                    · แยกชิ้น {{ formatCurrency(row.individualSellingTotal) }}
                  </span>
                </p>
              </div>
              <div class="flex flex-col items-end gap-1 shrink-0">
                <span class="h-fit px-2 py-1 text-xs rounded-full" :class="menuStatusBadgeClass(row.combo.status)">
                  {{ menuStatusLabel(row.combo.status) }}
                </span>
                <div class="text-right">
                  <p class="text-sm text-gray-500">กำไรสุทธิ</p>
                  <p class="font-bold" :class="row.netProfit < 0 ? 'text-red-600' : 'text-green-600'">
                    {{ formatCurrency(row.netProfit) }} ({{ row.netMarginPercent.toFixed(1) }}%)
                  </p>
                </div>
              </div>
            </div>
            <p v-if="row.combo.statusNote" class="text-sm text-gray-500 line-clamp-1" :title="row.combo.statusNote">
              {{ row.combo.statusNote }}
            </p>
            <ul class="text-sm text-gray-600 list-disc pl-5">
              <li v-for="item in row.itemBreakdowns" :key="item.menuItem.id">
                {{ item.menuItem.name }} × {{ item.quantity }} — ต้นทุน {{ formatCurrency(item.lineCost) }}
              </li>
            </ul>
            <div class="flex gap-3 text-sm mt-auto">
              <button type="button" class="text-primary-600" @click="openEdit(row.combo)">แก้ไข</button>
              <button type="button" class="text-red-600" @click="remove(row.combo.id)">ลบ</button>
            </div>
          </div>
        </article>
      </div>

      <Modal :is-open="formOpen" :title="editingId ? 'แก้ไขชุด' : 'เพิ่มชุด'" wide @close="formOpen = false">
        <form class="space-y-4" @submit.prevent="save">
          <div class="grid sm:grid-cols-2 gap-4">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium mb-1">ชื่อชุด *</label>
                <input v-model="form.name" required class="input-field w-full" placeholder="เช่น ชุดข้าว + ไข่ดาว" />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1">รายละเอียด</label>
                <textarea
                  v-model="form.description"
                  rows="3"
                  class="input-field w-full"
                  placeholder="เช่น ของในชุด เหมาะกับกี่คน หรือโน้ตสำหรับทำขาย"
                ></textarea>
              </div>
              <div>
                <label class="block text-sm font-medium mb-1">สถานะ</label>
                <select v-model="form.status" class="input-field w-full">
                  <option v-for="status in MENU_STATUSES" :key="status" :value="status">
                    {{ MENU_STATUS_LABELS[status] }}
                  </option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium mb-1">โน้ตสถานะ</label>
                <textarea
                  ref="statusNoteField"
                  v-model="form.statusNote"
                  rows="2"
                  class="input-field w-full resize-none overflow-hidden"
                  :placeholder="statusNotePlaceholder"
                ></textarea>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">รูปอาหาร (URL สาธารณะ)</label>
              <input
                v-model="form.imageUrl"
                type="url"
                class="input-field w-full"
                placeholder="https://example.com/combo.jpg"
              />
              <p class="text-xs text-gray-500 mt-1">วางลิงก์รูปที่เปิดได้โดยไม่ต้องล็อกอิน เช่น จาก CDN หรือ hosting</p>
              <MenuImage
                v-if="form.imageUrl"
                class="mt-3 max-w-sm rounded-lg border border-gray-100"
                :src="form.imageUrl"
                :alt="form.name || 'ตัวอย่างรูปชุด'"
                wrapper-class="aspect-[4/3]"
              />
            </div>
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
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import Modal from '@/components/common/Modal.vue'
import MenuImage from '@/components/menu/MenuImage.vue'
import { useCostBreakdown } from '@/composables/useCostBreakdown'
import { useCombos } from '@/composables/useCombos'
import { useToast } from '@/composables/useToast'
import { calculateComboCost, calculateSuggestedPrice } from '@/utils/costCalculator'
import { formatCurrency, menuStatusBadgeClass, menuStatusLabel } from '@/utils/format'
import { MENU_STATUSES, MENU_STATUS_LABELS, type Combo, type MenuStatus } from '@/types/models'

const { comboBreakdowns, loadAll, menuItems, combos, loading, settings, ingredients } = useCostBreakdown()
const { createCombo, updateCombo, deleteCombo } = useCombos()
const { success, error } = useToast()

const formOpen = ref(false)
const editingId = ref<string | null>(null)
const menuSearch = ref('')
const filterStatus = ref<'' | MenuStatus>('')
const form = reactive({
  name: '',
  description: '',
  imageUrl: '',
  status: 'ready_to_sell' as MenuStatus,
  statusNote: '',
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

const visibleBreakdowns = computed(() => {
  if (!filterStatus.value) return comboBreakdowns.value
  return comboBreakdowns.value.filter((row) => row.combo.status === filterStatus.value)
})

const selectedCount = computed(() => form.items.filter((item) => item.menuItemId).length)

const draftCombo = computed<Combo>(() => ({
  id: editingId.value || 'draft',
  userId: '',
  name: form.name || 'ชุดใหม่',
  description: form.description.trim() || undefined,
  imageUrl: form.imageUrl.trim() || undefined,
  status: form.status,
  statusNote: form.statusNote.trim() || undefined,
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

const statusNotePlaceholder = computed(() => {
  if (form.status === 'ready_to_sell') return 'เช่น ขายดีช่วงเย็น หรือโน้ตสำหรับทีมครัว'
  if (form.status === 'testing_recipe') return 'เช่น กำลังปรับของในชุด หรือทดลองราคาใหม่'
  if (form.status === 'discontinued') return 'เช่น วัตถุดิบหายาก หรือขายไม่คุ้ม'
  return 'เช่น ยังขาดเมนูในชุด หรือสูตรยังไม่นิ่ง'
})

const statusNoteField = ref<HTMLTextAreaElement | null>(null)

const resizeStatusNote = () => {
  const el = statusNoteField.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

watch(
  () => [form.statusNote, formOpen.value],
  () => nextTick(resizeStatusNote),
  { flush: 'post' },
)

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
  form.description = ''
  form.imageUrl = ''
  form.status = 'ready_to_sell'
  form.statusNote = ''
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
  form.description = combo.description || ''
  form.imageUrl = combo.imageUrl || ''
  form.status = combo.status
  form.statusNote = combo.statusNote || ''
  form.sellingPrice = combo.sellingPrice
  form.items = (combo.items || []).map((item) => ({ menuItemId: item.menuItemId, quantity: item.quantity }))
  menuSearch.value = ''
  formOpen.value = true
}

const save = async () => {
  const payload = {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    imageUrl: form.imageUrl.trim() || undefined,
    status: form.status,
    statusNote: form.statusNote.trim() || undefined,
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
