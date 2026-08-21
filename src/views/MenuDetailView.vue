<template>
  <MainLayout>
    <div v-if="loading && !breakdown" class="text-gray-500">กำลังโหลด...</div>
    <div v-else-if="!breakdown" class="text-gray-500">ไม่พบเมนู</div>
    <div v-else class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div class="flex gap-4 min-w-0">
          <MenuImage
            class="hidden sm:block w-28 shrink-0 rounded-xl border border-gray-100"
            :src="breakdown.menuItem.imageUrl"
            :alt="breakdown.menuItem.name"
            wrapper-class="aspect-square"
            icon-class="h-8 w-8"
          />
          <div class="min-w-0">
            <p class="text-sm text-gray-500">
              <router-link to="/menu" class="hover:underline">เมนู</router-link> /
              {{ breakdown.menuItem.name }}
            </p>
            <h1 class="page-title mt-1">{{ breakdown.menuItem.name }}</h1>
            <p v-if="breakdown.menuItem.description" class="mt-1 text-gray-600 whitespace-pre-line">
              {{ breakdown.menuItem.description }}
            </p>
            <p class="text-gray-500">
              {{ saleUnitLabel(breakdown.menuItem.saleUnitType) }} ·
              {{ menuStatusLabel(breakdown.menuItem.status) }} ·
              ราคาขาย {{ formatCurrency(breakdown.menuItem.sellingPrice) }}
            </p>
            <p v-if="breakdown.menuItem.statusNote" class="mt-1 text-sm text-gray-500">
              {{ breakdown.menuItem.statusNote }}
            </p>
          </div>
        </div>
        <router-link :to="`/menu/${breakdown.menuItem.id}/edit`" class="btn-secondary shrink-0">แก้ไขเมนู</router-link>
      </div>
      <MenuImage
        class="sm:hidden rounded-xl border border-gray-100"
        :src="breakdown.menuItem.imageUrl"
        :alt="breakdown.menuItem.name"
      />

      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="card p-4">
          <p class="text-sm text-gray-500">ต้นทุนรวม</p>
          <p class="text-2xl font-bold">{{ formatCurrency(display.totalCost) }}</p>
        </div>
        <div class="card p-4">
          <p class="text-sm text-gray-500">ค่าบริการ {{ settings?.platformName }}</p>
          <p class="text-2xl font-bold text-red-600">{{ formatCurrency(display.platformFee) }}</p>
        </div>
        <div class="card p-4">
          <p class="text-sm text-gray-500">กำไรสุทธิ</p>
          <p class="text-2xl font-bold" :class="display.netProfit < 0 ? 'text-red-600' : 'text-green-600'">
            {{ formatCurrency(display.netProfit) }}
          </p>
        </div>
        <div class="card p-4">
          <p class="text-sm text-gray-500">% Margin</p>
          <p class="text-2xl font-bold">{{ display.netMarginPercent.toFixed(1) }}%</p>
        </div>
      </div>

      <div class="grid lg:grid-cols-2 gap-6">
        <section class="card p-5 space-y-4">
          <h2 class="font-bold">วัตถุดิบ</h2>
          <div
            v-for="group in groupedIngredientDetails"
            :key="group.category"
            class="space-y-1 rounded-lg border border-gray-100 bg-gray-50/60 p-3"
          >
            <div class="flex items-baseline justify-between gap-3">
              <h3 class="text-sm font-medium text-gray-700">{{ group.category }}</h3>
              <p class="text-xs text-gray-500">{{ group.lines.length }} รายการ</p>
            </div>
            <table class="w-full text-sm">
              <tbody>
                <tr v-for="line in group.lines" :key="line.ingredient.id" class="border-b border-gray-200">
                  <td class="py-2">{{ line.ingredient.name }}</td>
                  <td class="py-2 text-right text-gray-500">{{ formatNumber(line.quantity) }} {{ line.ingredient.unit }}</td>
                  <td class="py-2 text-right">{{ formatCurrency(line.cost) }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="text-gray-600">
                  <td class="pt-2" colspan="2">รวม{{ group.category }}</td>
                  <td class="pt-2 text-right">{{ formatCurrency(group.subtotal) }}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p v-if="!groupedIngredientDetails.length" class="text-sm text-gray-500">ยังไม่มีวัตถุดิบในสูตร</p>
          <div class="flex justify-between text-sm font-semibold pt-1">
            <span>รวมวัตถุดิบ</span>
            <span>{{ formatCurrency(display.ingredientCost) }}</span>
          </div>
        </section>

        <section class="card p-5 space-y-3">
          <h2 class="font-bold">บรรจุภัณฑ์ + ต้นทุนคงที่</h2>
          <table class="w-full text-sm">
            <tbody>
              <tr v-for="line in display.packagingDetails" :key="line.ingredient.id" class="border-b">
                <td class="py-2">{{ line.ingredient.name }}</td>
                <td class="py-2 text-right text-gray-500">{{ formatNumber(line.quantity) }} {{ line.ingredient.unit }}</td>
                <td class="py-2 text-right">{{ formatCurrency(line.cost) }}</td>
              </tr>
              <tr class="border-b">
                <td class="py-2">ต้นทุนคงที่ (แก๊ส/ไฟ/แรง)</td>
                <td></td>
                <td class="py-2 text-right">{{ formatCurrency(display.fixedCost) }}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>

      <section class="card p-5 space-y-4">
        <h2 class="font-bold">What-if ราคาขาย</h2>
        <div class="flex flex-col sm:flex-row gap-4 items-end">
          <div>
            <label class="block text-sm mb-1">ลองราคาขายใหม่</label>
            <input v-model.number="whatIfPrice" type="number" min="0" step="1" class="input-field w-40" />
          </div>
          <p class="text-sm text-gray-600">
            กำไรจะเป็น <strong>{{ formatCurrency(priceSim.netProfit) }}</strong>
            ({{ priceSim.netMarginPercent.toFixed(1) }}%)
          </p>
        </div>
        <p v-if="suggestedPrice != null" class="text-sm bg-primary-50 text-primary-900 rounded-lg px-3 py-2">
          ราคาขายที่แนะนำจากเป้า margin {{ settings?.targetMarginPercent }}%
          (รวมค่าบริการแพลตฟอร์ม): <strong>{{ formatCurrency(suggestedPrice) }}</strong>
        </p>
      </section>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import MenuImage from '@/components/menu/MenuImage.vue'
import { useCostBreakdown } from '@/composables/useCostBreakdown'
import { usePageTitle } from '@/composables/usePageTitle'
import { calculateSuggestedPrice, simulateSellingPrice } from '@/utils/costCalculator'
import { formatCurrency, formatNumber, menuStatusLabel, saleUnitLabel } from '@/utils/format'
import {
  INGREDIENT_CATEGORIES,
  isOtherIngredientCategory,
  type IngredientCategory,
} from '@/types/models'

const route = useRoute()
const { breakdowns, loading, loadAll, settings } = useCostBreakdown()
const whatIfPrice = ref(0)

const breakdown = computed(() =>
  breakdowns.value.find((b) => b.menuItem.id === route.params.id),
)

usePageTitle(computed(() => breakdown.value?.menuItem.name || 'เมนู'))

const display = computed(() => breakdown.value!)

const categoryOf = (category?: string): IngredientCategory =>
  isOtherIngredientCategory(category) ? 'อื่นๆ' : (category as IngredientCategory)

const groupedIngredientDetails = computed(() => {
  const lines = breakdown.value?.ingredientDetails ?? []
  return INGREDIENT_CATEGORIES.map((category) => {
    const grouped = lines.filter((line) => categoryOf(line.ingredient.category) === category)
    return {
      category,
      lines: grouped,
      subtotal: grouped.reduce((sum, line) => sum + line.cost, 0),
    }
  }).filter((group) => group.lines.length > 0)
})

const priceSim = computed(() => {
  if (!breakdown.value || !settings.value) return breakdown.value!
  return simulateSellingPrice(breakdown.value, whatIfPrice.value || breakdown.value.menuItem.sellingPrice, settings.value.platformFeePercent)
})

const suggestedPrice = computed(() => {
  if (!breakdown.value || !settings.value?.targetMarginPercent) return null
  try {
    return calculateSuggestedPrice(
      settings.value.targetMarginPercent,
      breakdown.value.totalCost,
      settings.value.platformFeePercent,
    )
  } catch {
    return null
  }
})

watch(breakdown, (value) => {
  if (value) whatIfPrice.value = value.menuItem.sellingPrice
}, { immediate: true })

onMounted(() => loadAll())
</script>
