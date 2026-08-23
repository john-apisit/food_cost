<template>
  <MainLayout>
    <div class="space-y-6">
      <h1 class="page-title">วางแผนการซื้อวัตถุดิบและบรรจุภัณฑ์</h1>

      <div class="card p-6 space-y-4">
        <div v-if="plans.length">
          <p class="text-sm font-medium mb-2">โหลดแผนที่บันทึกไว้</p>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="plan in plans"
              :key="plan.id"
              class="inline-flex items-center rounded-full bg-gray-100 text-sm overflow-hidden"
            >
              <button
                type="button"
                class="pl-3 py-1 hover:bg-gray-200 text-left"
                @click="loadPlan(plan)"
              >
                <span class="block">{{ plan.name }}</span>
                <span v-if="planDatesLabel(plan)" class="block text-xs text-gray-500 font-normal">
                  {{ planDatesLabel(plan) }}
                </span>
              </button>
              <button
                type="button"
                class="px-2 py-1 text-gray-400 hover:text-red-600 hover:bg-red-50"
                :title="`ลบแผน ${plan.name}`"
                :aria-label="`ลบแผน ${plan.name}`"
                @click="removePlan(plan)"
              >
                <X class="h-3.5 w-3.5" />
              </button>
            </span>
          </div>
        </div>

        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div class="sm:col-span-2 lg:col-span-1">
            <label class="block text-sm font-medium mb-1">ชื่อแผน</label>
            <input v-model="planName" class="input-field w-full" placeholder="เช่น แผนวันจันทร์" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">วันที่ไปซื้อ</label>
            <DatePicker v-model="purchaseDate" placeholder="เลือกวันที่ไปซื้อ" clearable />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">จำนวนวัน</label>
            <input
              v-model.number="days"
              type="number"
              min="1"
              class="input-field w-full"
              :class="hasSaleRange ? 'bg-gray-50' : ''"
              :readonly="hasSaleRange"
            />
            <p v-if="hasSaleRange" class="text-xs text-gray-500 mt-1">คำนวณจากช่วงวันที่ขาย</p>
          </div>
          <div class="sm:col-span-2 lg:col-span-3">
            <label class="block text-sm font-medium mb-1">ช่วงวันที่ขาย</label>
            <div class="flex flex-col sm:flex-row sm:items-center gap-2">
              <div class="w-full sm:w-52">
                <DatePicker
                  v-model="saleStartDate"
                  :max="saleEndDate || undefined"
                  placeholder="จากวันที่"
                  clearable
                />
              </div>
              <span class="text-sm text-gray-500 shrink-0">ถึง</span>
              <div class="w-full sm:w-52">
                <DatePicker
                  v-model="saleEndDate"
                  :min="saleStartDate || undefined"
                  placeholder="ถึงวันที่"
                  clearable
                />
              </div>
            </div>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-2">เลือกเมนูและจำนวนต่อวัน</label>
          <div class="space-y-2">
            <div v-for="(selection, index) in menuSelections" :key="index" class="flex gap-2 items-center">
              <select v-model="selection.menuItemId" class="input-field flex-1">
                <option value="">เลือกเมนู...</option>
                <option v-for="menu in menuItems" :key="menu.id" :value="menu.id">
                  {{ menu.name }} ({{ saleUnitLabel(menu.saleUnitType) }})
                </option>
              </select>
              <input v-model.number="selection.quantity" type="number" min="1" class="input-field w-24" placeholder="จำนวน" />
              <button type="button" class="text-red-600 text-sm" @click="menuSelections.splice(index, 1)">ลบ</button>
            </div>
          </div>
          <button type="button" class="mt-2 text-primary-600 text-sm font-medium" @click="menuSelections.push({ menuItemId: '', quantity: 1 })">
            + เพิ่มเมนู
          </button>
        </div>

        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn-primary" :disabled="!canCalculate" @click="calculate">คำนวณรายการซื้อ</button>
          <button type="button" class="btn-secondary" :disabled="!canCalculate" @click="save">บันทึกแผน</button>
        </div>
      </div>

      <div v-if="prepSteps.length" class="card p-6 space-y-3">
        <div>
          <h2 class="text-lg font-semibold">เตรียมของก่อนเปิดร้าน</h2>
          <p class="text-sm text-gray-500 mt-1">ขั้นตอนจากเมนูในแผนนี้ รายการที่ซ้ำกันจะแสดงแค่ครั้งเดียว</p>
        </div>
        <ol class="space-y-2">
          <li v-for="(item, index) in prepSteps" :key="item.step" class="flex items-start gap-3">
            <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-medium text-primary-700">
              {{ index + 1 }}
            </span>
            <div class="min-w-0 pt-0.5">
              <p class="font-medium text-gray-900">{{ item.step }}</p>
              <p class="text-xs text-gray-500">{{ item.fromMenus.join(', ') }}</p>
            </div>
          </li>
        </ol>
      </div>

      <div v-if="purchaseItems.length" class="space-y-4">
        <div class="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3">
          <div>
            <h2 class="text-lg font-semibold">รายการซื้อตามประเภทวัตถุดิบ</h2>
            <p v-if="periodNote" class="text-sm text-gray-600 mt-1">{{ periodNote }}</p>
            <p class="text-sm text-gray-500 mt-1">
              วัตถุดิบ {{ ingredientCount }} รายการ · บรรจุภัณฑ์ {{ packagingCount }} รายการ
            </p>
          </div>
          <label class="inline-flex items-center gap-2 text-sm text-gray-700 shrink-0">
            <input
              v-model="showMenus"
              type="checkbox"
              class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            แสดงเมนู
            <span class="text-xs text-gray-400 font-normal">จิ้มชื่อเพื่อดูยี่ห้อ</span>
          </label>
        </div>

        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div v-for="group in categoryGroups" :key="group.category" class="card p-4">
            <p class="text-sm font-medium text-gray-700">{{ group.category }}</p>
            <p class="text-xl font-bold mt-1">{{ formatCurrency(group.totalCost) }}</p>
            <p class="text-xs text-gray-500 mt-1">{{ group.items.length }} รายการ</p>
          </div>
        </div>

        <div class="card overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 text-sm">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-3 py-3 w-10">
                    <span class="sr-only">ซื้อแล้ว</span>
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">รายการ</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">ปริมาณรวม</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">หน่วย</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">ราคา/หน่วย</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">ราคารวม</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="group in categoryGroups" :key="group.category">
                  <tr class="bg-primary-50">
                    <td colspan="5" class="px-4 py-2.5 font-semibold text-gray-900">
                      {{ group.category }}
                      <span class="ml-2 text-xs font-normal text-gray-500">{{ group.items.length }} รายการ</span>
                    </td>
                    <td class="px-4 py-2.5 text-right font-semibold">{{ formatCurrency(group.totalCost) }}</td>
                  </tr>
                  <tr
                    v-for="item in group.items"
                    :key="item.ingredient.id"
                    class="border-t border-gray-100"
                    :class="isPurchased(item.ingredient.id) ? 'bg-green-50' : ''"
                  >
                    <td class="px-3 py-3">
                      <input
                        type="checkbox"
                        class="rounded border-gray-300 text-green-600 focus:ring-green-500"
                        :checked="isPurchased(item.ingredient.id)"
                        :aria-label="`ซื้อแล้ว ${item.ingredient.name}`"
                        @change="togglePurchased(item.ingredient.id)"
                      />
                    </td>
                    <td class="px-4 py-3">
                      <div :class="isPurchased(item.ingredient.id) ? 'text-green-700 font-medium' : ''">
                        {{ item.ingredient.name }}
                      </div>
                      <div v-if="showMenus" class="mt-1 flex flex-wrap gap-x-2 gap-y-1">
                        <button
                          v-for="menu in item.fromMenus"
                          :key="menu.menuName"
                          type="button"
                          class="text-xs text-primary-600 hover:underline"
                          @click="openMenuBrand(menu.menuName)"
                        >
                          {{ menu.menuName }} ({{ formatNumber(menu.quantity) }})
                        </button>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-right font-medium">{{ formatNumber(item.totalQuantity) }}</td>
                    <td class="px-4 py-3">{{ item.ingredient.unit }}</td>
                    <td class="px-4 py-3 text-right">{{ formatCurrency(item.ingredient.pricePerUnit) }}</td>
                    <td class="px-4 py-3 text-right font-semibold">{{ formatCurrency(item.totalCost) }}</td>
                  </tr>
                </template>
              </tbody>
              <tfoot class="bg-gray-50 border-t">
                <tr>
                  <td colspan="5" class="px-4 py-4 text-right font-bold">รวมงบซื้อทั้งหมด</td>
                  <td class="px-4 py-4 text-right font-bold text-lg text-primary-600">{{ formatCurrency(totalCost) }}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div class="flex">
          <button type="button" class="btn-secondary w-full sm:w-auto" :disabled="!canCalculate" @click="save">
            บันทึกแผน
          </button>
        </div>
      </div>
    </div>

    <Modal :is-open="Boolean(selectedMenuName)" :title="selectedMenuName || 'รายละเอียดยี่ห้อ'" wide @close="selectedMenuName = null">
      <p class="text-sm text-gray-500 mb-4">ยี่ห้อและร้านของวัตถุดิบในเมนูนี้</p>
      <div v-if="menuBrandItems.length" class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="text-left text-xs font-medium text-gray-500 uppercase">
              <th class="pb-2 pr-3">รายการ</th>
              <th class="pb-2 pr-3">ประเภท</th>
              <th class="pb-2 pr-3">ยี่ห้อ / ร้าน</th>
              <th class="pb-2 pr-3">หมายเหตุ</th>
              <th class="pb-2 text-right">ปริมาณ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in menuBrandItems" :key="row.item.ingredient.id" class="border-t border-gray-100">
              <td class="py-2.5 pr-3 font-medium">{{ row.item.ingredient.name }}</td>
              <td class="py-2.5 pr-3 text-gray-600">{{ purchaseCategoryLabel(row.item) }}</td>
              <td class="py-2.5 pr-3">{{ row.item.ingredient.supplier || 'ไม่ระบุ' }}</td>
              <td class="py-2.5 pr-3 text-gray-600 whitespace-pre-line">{{ row.item.ingredient.notes || '-' }}</td>
              <td class="py-2.5 text-right whitespace-nowrap">
                {{ formatNumber(row.quantity) }} {{ row.item.ingredient.unit }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="text-sm text-gray-500">ไม่พบวัตถุดิบของเมนูนี้ในรายการซื้อ</p>
    </Modal>
  </MainLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { X } from 'lucide-vue-next'
import MainLayout from '@/layouts/MainLayout.vue'
import DatePicker from '@/components/common/DatePicker.vue'
import Modal from '@/components/common/Modal.vue'
import { useMenu } from '@/composables/useMenu'
import { useIngredients } from '@/composables/useIngredients'
import {
  groupPurchaseItemsByCategory,
  purchaseCategoryLabel,
  purchaseItemsForMenu,
  uniquePrepSteps,
  usePurchasePlanning,
} from '@/composables/usePurchasePlanning'
import { usePurchasePlans } from '@/composables/usePurchasePlans'
import { useToast } from '@/composables/useToast'
import {
  formatCurrency,
  formatDateOnly,
  formatNumber,
  formatSaleDateRange,
  inclusiveDayCount,
  saleUnitLabel,
} from '@/utils/format'
import type { PurchaseItem, PurchasePlan } from '@/types/models'

const { menuItems, fetchMenuItems } = useMenu()
const { ingredients, fetchIngredients } = useIngredients()
const { calculatePurchaseList } = usePurchasePlanning()
const { plans, fetchPlans, savePlan, updatePurchasedIngredientIds, deletePlan } = usePurchasePlans()
const { success, error } = useToast()

const planName = ref('แผนซื้อของ')
const days = ref(1)
const purchaseDate = ref('')
const saleStartDate = ref('')
const saleEndDate = ref('')
const menuSelections = ref([{ menuItemId: '', quantity: 1 }])
const purchaseItems = ref<PurchaseItem[]>([])
const showMenus = ref(false)
const purchasedIds = ref<Set<string>>(new Set())
const currentPlanId = ref<string | null>(null)
const selectedMenuName = ref<string | null>(null)

const hasSaleRange = computed(() => Boolean(saleStartDate.value && saleEndDate.value))
const canCalculate = computed(() => menuSelections.value.some((s) => s.menuItemId && s.quantity > 0))

watch([saleStartDate, saleEndDate], ([start, end]) => {
  if (start && end) {
    if (end < start) {
      saleEndDate.value = start
      return
    }
    days.value = inclusiveDayCount(start, end)
  }
})

const planDatesLabel = (plan: PurchasePlan) => {
  const parts: string[] = []
  if (plan.purchaseDate) parts.push(`ซื้อ ${formatDateOnly(plan.purchaseDate)}`)
  const saleRange = formatSaleDateRange(plan.saleStartDate, plan.saleEndDate)
  if (saleRange) parts.push(`ขาย ${saleRange}`)
  return parts.join(' · ')
}
const totalCost = computed(() => purchaseItems.value.reduce((sum, item) => sum + item.totalCost, 0))
const categoryGroups = computed(() => groupPurchaseItemsByCategory(purchaseItems.value))
const menuBrandItems = computed(() =>
  selectedMenuName.value ? purchaseItemsForMenu(purchaseItems.value, selectedMenuName.value) : [],
)
const ingredientCount = computed(
  () => purchaseItems.value.filter((item) => item.ingredient.type === 'ingredient').length,
)
const packagingCount = computed(
  () => purchaseItems.value.filter((item) => item.ingredient.type === 'packaging').length,
)

const openMenuBrand = (menuName: string) => {
  selectedMenuName.value = menuName
}

const selectedLines = () =>
  menuSelections.value
    .filter((s) => s.menuItemId && s.quantity > 0)
    .flatMap((s) => {
      const menuItem = menuItems.value.find((m) => m.id === s.menuItemId)
      return menuItem ? [{ menuItem, quantity: s.quantity }] : []
    })

const prepSteps = computed(() => uniquePrepSteps(selectedLines()))

const calculate = () => {
  purchaseItems.value = calculatePurchaseList(selectedLines(), days.value, ingredients.value, menuItems.value)
}

const planPayload = () => ({
  name: planName.value || 'แผนซื้อของ',
  days: days.value,
  purchaseDate: purchaseDate.value || null,
  saleStartDate: saleStartDate.value || null,
  saleEndDate: saleEndDate.value || null,
  lines: selectedLines().map((s) => ({
    menuItemId: s.menuItem.id,
    targetQuantity: s.quantity,
  })),
  purchasedIngredientIds: [...purchasedIds.value],
})

const persistPlan = async () => {
  calculate()
  const saved = await savePlan(planPayload())
  if (saved) currentPlanId.value = saved.id
  return saved
}

const save = async () => {
  try {
    await persistPlan()
    success('บันทึกแผนแล้ว')
  } catch (e: unknown) {
    error(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
  }
}

const isPurchased = (id: string) => purchasedIds.value.has(id)

const togglePurchased = async (id: string) => {
  const next = new Set(purchasedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  purchasedIds.value = next

  try {
    if (currentPlanId.value) {
      await updatePurchasedIngredientIds(currentPlanId.value, [...next])
    } else if (canCalculate.value) {
      await persistPlan()
    }
  } catch (e: unknown) {
    error(e instanceof Error ? e.message : 'บันทึกสถานะไม่สำเร็จ')
  }
}

const removePlan = async (plan: PurchasePlan) => {
  if (!confirm(`ลบแผน ${plan.name}?`)) return
  try {
    await deletePlan(plan.id)
    if (currentPlanId.value === plan.id) currentPlanId.value = null
    success('ลบแผนแล้ว')
  } catch (e: unknown) {
    error(e instanceof Error ? e.message : 'ลบแผนไม่สำเร็จ')
  }
}

const loadPlan = (plan: PurchasePlan) => {
  currentPlanId.value = plan.id
  planName.value = plan.name
  days.value = plan.days
  purchaseDate.value = plan.purchaseDate ?? ''
  saleStartDate.value = plan.saleStartDate ?? ''
  saleEndDate.value = plan.saleEndDate ?? ''
  menuSelections.value = (plan.lines || []).map((line) => ({
    menuItemId: line.menuItemId,
    quantity: line.targetQuantity,
  }))
  if (!menuSelections.value.length) menuSelections.value = [{ menuItemId: '', quantity: 1 }]
  purchasedIds.value = new Set(plan.purchasedIngredientIds)
  calculate()
}

const periodNote = computed(() => {
  const parts: string[] = []
  if (purchaseDate.value) parts.push(`ซื้อ ${formatDateOnly(purchaseDate.value)}`)
  const saleRange = formatSaleDateRange(saleStartDate.value, saleEndDate.value)
  if (saleRange) parts.push(`ขาย ${saleRange}`)
  return parts.join(' · ')
})

onMounted(async () => {
  await Promise.all([fetchMenuItems(), fetchIngredients(), fetchPlans()])
})
</script>
