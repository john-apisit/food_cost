<template>
  <MainLayout>
    <div class="space-y-6">
      <h1 class="page-title">วางแผนการซื้อวัตถุดิบและบรรจุภัณฑ์</h1>

      <div class="card p-6 space-y-4">
        <div class="grid sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium mb-1">ชื่อแผน</label>
            <input v-model="planName" class="input-field w-full" placeholder="เช่น แผนวันจันทร์" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">จำนวนวัน</label>
            <input v-model.number="days" type="number" min="1" class="input-field w-32" />
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
          <button type="button" class="btn-secondary" :disabled="!canCalculate" @click="save(false)">บันทึกแผน</button>
          <button type="button" class="btn-secondary" :disabled="!canCalculate" @click="save(true)">บันทึกเป็นเทมเพลต</button>
        </div>

        <div v-if="plans.length" class="border-t pt-4">
          <p class="text-sm font-medium mb-2">โหลดแผนที่บันทึกไว้</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="plan in plans"
              :key="plan.id"
              type="button"
              class="px-3 py-1 rounded-full bg-gray-100 text-sm hover:bg-gray-200"
              @click="loadPlan(plan)"
            >
              {{ plan.name }}{{ plan.isTemplate ? ' (เทมเพลต)' : '' }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="purchaseItems.length" class="space-y-4">
        <div class="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3">
          <div>
            <h2 class="text-lg font-semibold">รายการซื้อตามซัพพลายเออร์</h2>
            <p class="text-sm text-gray-500 mt-1">
              <template v-if="namedSupplierCount">ต้องไปซื้อ {{ namedSupplierCount }} ร้าน · </template>
              วัตถุดิบ {{ ingredientCount }} รายการ · บรรจุภัณฑ์ {{ packagingCount }} รายการ
            </p>
          </div>
          <div class="flex gap-2">
            <button type="button" class="btn-secondary text-sm" @click="exportCsv">Export CSV</button>
            <button type="button" class="btn-secondary text-sm" @click="exportPdf">Export PDF</button>
          </div>
        </div>

        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div v-for="group in supplierGroups" :key="group.supplier" class="card p-4">
            <p class="text-sm font-medium text-gray-700">{{ group.supplier }}</p>
            <p class="text-xl font-bold mt-1">{{ formatCurrency(group.totalCost) }}</p>
            <p class="text-xs text-gray-500 mt-1">{{ group.items.length }} รายการ</p>
          </div>
        </div>

        <div class="card overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 text-sm">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">รายการ</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ประเภท</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">หน่วย</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">ปริมาณรวม</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">ราคา/หน่วย</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">ราคารวม</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="group in supplierGroups" :key="group.supplier">
                  <tr class="bg-primary-50">
                    <td colspan="5" class="px-4 py-2.5 font-semibold text-gray-900">
                      {{ group.supplier }}
                      <span class="ml-2 text-xs font-normal text-gray-500">{{ group.items.length }} รายการ</span>
                    </td>
                    <td class="px-4 py-2.5 text-right font-semibold">{{ formatCurrency(group.totalCost) }}</td>
                  </tr>
                  <tr
                    v-for="item in group.items"
                    :key="item.ingredient.id"
                    class="border-t border-gray-100"
                  >
                    <td class="px-4 py-3">
                      <div>{{ item.ingredient.name }}</div>
                      <div class="text-xs text-gray-500">
                        {{ item.fromMenus.map((m) => `${m.menuName} (${formatNumber(m.quantity)})`).join(', ') }}
                      </div>
                    </td>
                    <td class="px-4 py-3">
                      <span
                        class="px-2 py-1 text-xs rounded-full"
                        :class="item.ingredient.type === 'ingredient' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'"
                      >
                        {{ ingredientTypeLabel(item.ingredient.type) }}
                      </span>
                    </td>
                    <td class="px-4 py-3">{{ item.ingredient.unit }}</td>
                    <td class="px-4 py-3 text-right font-medium">{{ formatNumber(item.totalQuantity) }}</td>
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
      </div>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import { useMenu } from '@/composables/useMenu'
import { useIngredients } from '@/composables/useIngredients'
import { groupPurchaseItemsBySupplier, UNSPECIFIED_SUPPLIER, usePurchasePlanning } from '@/composables/usePurchasePlanning'
import { usePurchasePlans } from '@/composables/usePurchasePlans'
import { useToast } from '@/composables/useToast'
import { exportPurchaseListToCsv, exportPurchaseListToPdf } from '@/utils/export'
import { formatCurrency, formatNumber, ingredientTypeLabel, saleUnitLabel } from '@/utils/format'
import type { PurchaseItem, PurchasePlan } from '@/types/models'

const { menuItems, fetchMenuItems } = useMenu()
const { ingredients, fetchIngredients } = useIngredients()
const { calculatePurchaseList } = usePurchasePlanning()
const { plans, fetchPlans, savePlan } = usePurchasePlans()
const { success, error } = useToast()

const planName = ref('แผนซื้อของ')
const days = ref(1)
const menuSelections = ref([{ menuItemId: '', quantity: 1 }])
const purchaseItems = ref<PurchaseItem[]>([])

const canCalculate = computed(() => menuSelections.value.some((s) => s.menuItemId && s.quantity > 0))
const totalCost = computed(() => purchaseItems.value.reduce((sum, item) => sum + item.totalCost, 0))
const supplierGroups = computed(() => groupPurchaseItemsBySupplier(purchaseItems.value))
const namedSupplierCount = computed(
  () => supplierGroups.value.filter((group) => group.supplier !== UNSPECIFIED_SUPPLIER).length,
)
const ingredientCount = computed(
  () => purchaseItems.value.filter((item) => item.ingredient.type === 'ingredient').length,
)
const packagingCount = computed(
  () => purchaseItems.value.filter((item) => item.ingredient.type === 'packaging').length,
)

const selectedLines = () =>
  menuSelections.value
    .filter((s) => s.menuItemId && s.quantity > 0)
    .map((s) => ({
      menuItem: menuItems.value.find((m) => m.id === s.menuItemId)!,
      quantity: s.quantity,
    }))

const calculate = () => {
  purchaseItems.value = calculatePurchaseList(selectedLines(), days.value, ingredients.value, menuItems.value)
}

const save = async (isTemplate: boolean) => {
  try {
    calculate()
    await savePlan({
      name: planName.value || 'แผนซื้อของ',
      days: days.value,
      isTemplate,
      lines: selectedLines().map((s) => ({
        menuItemId: s.menuItem.id,
        targetQuantity: s.quantity,
      })),
    })
    success(isTemplate ? 'บันทึกเทมเพลตแล้ว' : 'บันทึกแผนแล้ว')
  } catch (e: unknown) {
    error(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
  }
}

const loadPlan = (plan: PurchasePlan) => {
  planName.value = plan.name
  days.value = plan.days
  menuSelections.value = (plan.lines || []).map((line) => ({
    menuItemId: line.menuItemId,
    quantity: line.targetQuantity,
  }))
  if (!menuSelections.value.length) menuSelections.value = [{ menuItemId: '', quantity: 1 }]
  calculate()
}

const exportCsv = () => exportPurchaseListToCsv(purchaseItems.value, planName.value, days.value)
const exportPdf = () => exportPurchaseListToPdf(purchaseItems.value, planName.value, days.value)

onMounted(async () => {
  await Promise.all([fetchMenuItems(), fetchIngredients(), fetchPlans()])
})
</script>
