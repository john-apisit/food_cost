<template>
  <MainLayout>
    <div class="space-y-6">
      <div>
        <h1 class="page-title">ประมาณการรายได้</h1>
        <p class="text-gray-500 mt-1">
          ใส่จำนวนที่ขายได้เฉลี่ยต่อวัน แล้วดูรายได้ต่อเดือนทันที — ตัวเลขไม่ถูกบันทึก
        </p>
      </div>

      <section class="card p-5 space-y-3">
        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 class="font-semibold">วันที่เปิดร้าน</h2>
            <p class="text-sm text-gray-600 mt-1">{{ openDaysLabel }}</p>
            <p v-if="days > 0" class="text-sm text-gray-500 mt-1">
              คิดเฉลี่ย <span class="font-medium text-gray-800">{{ days }} วัน/เดือน</span>
              จากวันที่เปิด × 4.3 สัปดาห์
            </p>
            <p v-else class="text-sm text-amber-700 mt-1">
              ยังไม่ได้ตั้งวันเปิดร้าน จึงคำนวณเป็น 0 วัน
            </p>
          </div>
          <router-link to="/settings" class="btn-secondary text-sm shrink-0">แก้วันที่เปิด</router-link>
        </div>
      </section>

      <div v-if="loading" class="text-gray-500">กำลังโหลด...</div>

      <template v-else>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="card p-5">
            <h3 class="text-gray-500 text-sm font-medium">รายได้เต็ม</h3>
            <p class="text-2xl font-bold mt-2">{{ formatCurrency(summary.grossRevenue) }}</p>
            <p class="text-xs text-gray-500 mt-1">ยอดที่ลูกค้าจ่าย</p>
          </div>
          <div class="card p-5">
            <h3 class="text-gray-500 text-sm font-medium">ค่า {{ platformName }}</h3>
            <p class="text-2xl font-bold mt-2 text-red-600">{{ formatCurrency(summary.platformFee) }}</p>
            <p class="text-xs text-gray-500 mt-1">หัก {{ platformFeePercent }}%</p>
          </div>
          <div class="card p-5">
            <h3 class="text-gray-500 text-sm font-medium">รายได้ที่ร้านได้</h3>
            <p class="text-2xl font-bold mt-2">{{ formatCurrency(summary.netRevenue) }}</p>
            <p class="text-xs text-gray-500 mt-1">หลังหักแพลตฟอร์ม</p>
          </div>
          <div class="card p-5">
            <h3 class="text-gray-500 text-sm font-medium">กำไรสุทธิเดือน</h3>
            <p
              class="text-2xl font-bold mt-2"
              :class="summary.netProfit < 0 ? 'text-red-600' : 'text-green-600'"
            >
              {{ formatCurrency(summary.netProfit) }}
            </p>
            <p class="text-xs text-gray-500 mt-1">หักต้นทุนแล้ว · ขาย {{ formatNumber(summary.monthlyQty) }} หน่วย</p>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <select v-model="filterStatus" class="input-field sm:w-44">
            <option value="ready_to_sell">พร้อมขาย</option>
            <option value="">ทุกสถานะ (ยกเว้นยกเลิก)</option>
          </select>
          <button
            type="button"
            class="text-sm text-primary-600 font-medium"
            :disabled="!hasQty"
            @click="clearQty"
          >
            ล้างจำนวนทั้งหมด
          </button>
        </div>

        <EmptyState
          v-if="rows.length === 0"
          title="ยังไม่มีเมนูให้ประมาณการ"
          description="สร้างเมนูที่พร้อมขายก่อน แล้วกลับมาใส่ยอดขายเฉลี่ยต่อวัน"
        >
          <router-link to="/menu/new" class="btn-primary">เพิ่มเมนู</router-link>
        </EmptyState>

        <div v-else class="card overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 text-sm">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">เมนู</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">ราคาขาย</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">ขายเฉลี่ย/วัน</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">ขาย/เดือน</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">รายได้เต็ม</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">หลังหักแพลตฟอร์ม</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">กำไรสุทธิ</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="row in rows" :key="row.breakdown.menuItem.id" class="hover:bg-gray-50">
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-3 min-w-0">
                      <MenuImage
                        class="h-10 w-10 shrink-0 rounded-lg border border-gray-100"
                        :src="row.breakdown.menuItem.imageUrl"
                        :alt="row.breakdown.menuItem.name"
                        wrapper-class="h-10 w-10"
                        icon-class="h-4 w-4"
                      />
                      <div class="min-w-0">
                        <router-link
                          :to="`/menu/${row.breakdown.menuItem.id}`"
                          class="font-medium text-gray-900 hover:text-primary-600 truncate block"
                        >
                          {{ row.breakdown.menuItem.name }}
                        </router-link>
                        <p class="text-xs text-gray-500">
                          {{ saleUnitLabel(row.breakdown.menuItem.saleUnitType) }}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-right whitespace-nowrap">
                    {{ formatCurrency(row.breakdown.menuItem.sellingPrice) }}
                  </td>
                  <td class="px-4 py-3 text-right">
                    <input
                      :value="qtyByMenuId[row.breakdown.menuItem.id] ?? ''"
                      type="number"
                      min="0"
                      step="0.1"
                      class="input-field w-24 text-right ml-auto"
                      :placeholder="saleUnitLabel(row.breakdown.menuItem.saleUnitType)"
                      @input="onQtyInput(row.breakdown.menuItem.id, $event)"
                    />
                  </td>
                  <td class="px-4 py-3 text-right whitespace-nowrap">{{ formatNumber(row.monthlyQty) }}</td>
                  <td class="px-4 py-3 text-right whitespace-nowrap">{{ formatCurrency(row.grossRevenue) }}</td>
                  <td class="px-4 py-3 text-right whitespace-nowrap">{{ formatCurrency(row.netRevenue) }}</td>
                  <td
                    class="px-4 py-3 text-right font-semibold whitespace-nowrap"
                    :class="row.netProfit < 0 ? 'text-red-600' : row.avgDailyQty > 0 ? 'text-green-600' : 'text-gray-500'"
                  >
                    {{ formatCurrency(row.netProfit) }}
                  </td>
                </tr>
              </tbody>
              <tfoot class="bg-gray-50 font-semibold">
                <tr>
                  <td class="px-4 py-3" colspan="3">รวม</td>
                  <td class="px-4 py-3 text-right">{{ formatNumber(summary.monthlyQty) }}</td>
                  <td class="px-4 py-3 text-right">{{ formatCurrency(summary.grossRevenue) }}</td>
                  <td class="px-4 py-3 text-right">{{ formatCurrency(summary.netRevenue) }}</td>
                  <td
                    class="px-4 py-3 text-right"
                    :class="summary.netProfit < 0 ? 'text-red-600' : 'text-green-600'"
                  >
                    {{ formatCurrency(summary.netProfit) }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </template>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import MenuImage from '@/components/menu/MenuImage.vue'
import { useCostBreakdown } from '@/composables/useCostBreakdown'
import { formatCurrency, formatNumber, saleUnitLabel } from '@/utils/format'
import {
  forecastMenuRevenue,
  formatOpenDaysLabel,
  monthlyOpenDays,
  summarizeRevenueForecast,
} from '@/utils/revenueForecast'

const { breakdowns, loading, loadAll, settings } = useCostBreakdown()
const qtyByMenuId = reactive<Record<string, number>>({})
const filterStatus = ref<'ready_to_sell' | ''>('ready_to_sell')

const days = computed(() => monthlyOpenDays(settings.value?.openDays ?? []))
const openDaysLabel = computed(() => formatOpenDaysLabel(settings.value?.openDays ?? []))
const platformName = computed(() => settings.value?.platformName || 'LINE MAN')
const platformFeePercent = computed(() => settings.value?.platformFeePercent ?? 30)

const visibleBreakdowns = computed(() =>
  breakdowns.value.filter((b) => {
    if (b.menuItem.status === 'discontinued') return false
    if (filterStatus.value && b.menuItem.status !== filterStatus.value) return false
    return true
  }),
)

const rows = computed(() =>
  visibleBreakdowns.value.map((breakdown) =>
    forecastMenuRevenue(breakdown, qtyByMenuId[breakdown.menuItem.id] ?? 0, days.value),
  ),
)

const summary = computed(() => summarizeRevenueForecast(rows.value))
const hasQty = computed(() => Object.values(qtyByMenuId).some((qty) => qty > 0))

function setQty(menuId: string, raw: string) {
  const value = Number(raw)
  if (raw === '' || !Number.isFinite(value) || value <= 0) {
    delete qtyByMenuId[menuId]
    return
  }
  qtyByMenuId[menuId] = value
}

function onQtyInput(menuId: string, event: Event) {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) return
  setQty(menuId, target.value)
}

function clearQty() {
  Object.keys(qtyByMenuId).forEach((id) => {
    delete qtyByMenuId[id]
  })
}

onMounted(() => loadAll())
</script>
