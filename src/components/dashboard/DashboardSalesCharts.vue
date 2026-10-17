<template>
  <section class="space-y-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 class="text-lg font-bold">ยอดขาย</h2>
        <p class="text-sm text-gray-500 mt-0.5">
          รายได้จากราคาขาย × จำนวนจริง
          <span v-if="!loading && hasAnySales"> · {{ formatSaleDateRange(period.from, period.to) }}</span>
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <div class="inline-flex rounded-lg border border-gray-200 bg-white p-1">
          <button
            v-for="days in SALES_CHART_PRESETS"
            :key="days"
            type="button"
            class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
            :class="rangeDays === days
              ? 'bg-primary-500 text-white'
              : 'text-gray-600 hover:bg-gray-50'"
            @click="rangeDays = days"
          >
            {{ days }} วัน
          </button>
        </div>
        <router-link to="/sales" class="text-sm font-medium text-primary-600 hover:text-primary-700">
          บันทึกยอดขาย
        </router-link>
      </div>
    </div>

    <div v-if="loading" class="card p-5 text-gray-500">กำลังโหลดยอดขาย...</div>
    <div v-else-if="error" class="card p-5 text-red-600">{{ error }}</div>

    <EmptyState
      v-else-if="!hasAnySales"
      title="ยังไม่มีบันทึกยอดขาย"
      description="บันทึกยอดขายแล้วจะเห็นกราฟรายได้และเมนูขายดีที่นี่"
    >
      <router-link to="/sales" class="btn-primary">ไปบันทึกยอดขาย</router-link>
    </EmptyState>

    <template v-else>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="card p-5">
          <h3 class="text-gray-500 text-sm font-medium">รายได้ช่วงนี้</h3>
          <p class="text-2xl font-bold mt-2">{{ formatCurrency(summary.revenue) }}</p>
          <p class="text-xs text-gray-500 mt-1">ขายได้ {{ formatNumber(summary.actualQty, 0) }} ชิ้น</p>
        </div>
        <div class="card p-5">
          <h3 class="text-gray-500 text-sm font-medium">เทียบเป้า</h3>
          <p class="text-2xl font-bold mt-2" :class="targetClass">{{ targetLabel }}</p>
          <p class="text-xs text-gray-500 mt-1">{{ targetHint }}</p>
        </div>
        <div class="card p-5">
          <h3 class="text-gray-500 text-sm font-medium">เมนูขายดีสุด</h3>
          <p class="text-2xl font-bold mt-2 truncate" :title="summary.topMenuName ?? undefined">
            {{ summary.topMenuName ?? '—' }}
          </p>
          <p class="text-xs text-gray-500 mt-1">
            {{ summary.topMenuName ? formatCurrency(summary.topMenuRevenue) : 'ยังไม่มียอดในช่วงนี้' }}
          </p>
        </div>
      </div>

      <EmptyState
        v-if="!periodHasSales"
        title="ไม่มียอดขายในช่วงนี้"
        description="ลองขยายช่วงวันที่ หรือไปบันทึกยอดขายวันใหม่"
      >
        <button
          v-if="rangeDays !== 30"
          type="button"
          class="btn-secondary"
          @click="rangeDays = 30"
        >
          ดู 30 วัน
        </button>
      </EmptyState>

      <template v-else>
        <div class="card p-5">
          <h3 class="font-semibold">รายได้รายวัน</h3>
          <p class="text-xs text-gray-500 mb-3">
            กำไร (เส้นเขียว) = รายได้ − ค่าธรรมเนียมแพลตฟอร์ม − ต้นทุนต่อชิ้น × จำนวนที่ขาย
          </p>
          <VueApexCharts
            :key="`trend-${rangeDays}-${theme}`"
            type="area"
            height="300"
            :options="trendOptions"
            :series="trendSeries"
          />
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="card p-5">
            <h3 class="font-semibold mb-3">ยอดจริง vs เป้า</h3>
            <VueApexCharts
              :key="`target-${rangeDays}-${theme}`"
              type="bar"
              height="300"
              :options="vsTargetOptions"
              :series="vsTargetSeries"
            />
          </div>
          <div class="card p-5">
            <h3 class="font-semibold mb-3">เมนูขายดี</h3>
            <VueApexCharts
              v-if="topMenus.length"
              :key="`top-${rangeDays}-${theme}`"
              type="bar"
              :height="topMenusHeight"
              :options="topMenusOptions"
              :series="topMenusSeries"
            />
            <p v-else class="text-sm text-gray-500 py-8 text-center">ยังไม่มีเมนูที่ยอดขายในช่วงนี้</p>
          </div>
        </div>
      </template>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import type { ApexOptions } from 'apexcharts'
import VueApexCharts from 'vue3-apexcharts'
import EmptyState from '@/components/common/EmptyState.vue'
import { useDashboardSales } from '@/composables/useDashboardSales'
import { useTheme } from '@/composables/useTheme'
import { formatCurrency, formatNumber, formatSaleDateRange } from '@/utils/format'
import { SALES_CHART_PRESETS, formatChartBaht } from '@/utils/salesChart'

const CHART_FONT = 'IBM Plex Sans Thai, Noto Sans Thai, ui-sans-serif, system-ui, sans-serif'
const PRIMARY = '#e68900'
const PROFIT = '#16a34a'
const TARGET_LIGHT = '#9ca3af'
const TARGET_DARK = '#6b7280'

const { theme, isDark } = useTheme()

const chartPalette = computed(() =>
  isDark.value
    ? {
        grid: '#374151',
        axis: '#4b5563',
        label: '#9ca3af',
        labelStrong: '#d1d5db',
        target: TARGET_DARK,
        tooltip: 'dark' as const,
      }
    : {
        grid: '#f3f4f6',
        axis: '#e5e7eb',
        label: '#6b7280',
        labelStrong: '#374151',
        target: TARGET_LIGHT,
        tooltip: 'light' as const,
      },
)

const {
  loading,
  error,
  rangeDays,
  period,
  daily,
  topMenus,
  summary,
  hasAnySales,
  periodHasSales,
  fetchSales,
} = useDashboardSales()

const targetLabel = computed(() =>
  summary.value.targetPercent == null ? '—' : `${summary.value.targetPercent.toFixed(0)}%`,
)

const targetHint = computed(() => {
  if (!summary.value.hasTarget) return 'ยังไม่มีเป้าในบันทึกนี้'
  return `จริง ${formatNumber(summary.value.actualQty, 0)} / เป้า ${formatNumber(summary.value.targetQty, 0)}`
})

const targetClass = computed(() => {
  const value = summary.value.targetPercent
  if (value == null) return 'text-gray-900'
  if (value >= 100) return 'text-green-600'
  if (value >= 80) return 'text-yellow-600'
  return 'text-red-600'
})

const topMenusHeight = computed(() => Math.max(220, topMenus.value.length * 40 + 72))

const rankedMenus = computed(() => [...topMenus.value].reverse())

const baseChart = (): ApexOptions['chart'] => ({
  fontFamily: CHART_FONT,
  background: 'transparent',
  foreColor: chartPalette.value.label,
  toolbar: { show: false },
  zoom: { enabled: false },
  animations: { enabled: true, speed: 400 },
})

const trendSeries = computed(() => [
  { name: 'รายได้', data: daily.value.map((point) => point.revenue) },
  { name: 'กำไร', data: daily.value.map((point) => point.profit) },
])

const trendHasLoss = computed(() => daily.value.some((point) => point.profit < 0))

const trendOptions = computed<ApexOptions>(() => ({
  chart: { ...baseChart(), type: 'area' },
  colors: [PRIMARY, PROFIT],
  dataLabels: { enabled: false },
  stroke: { curve: 'straight', width: 3 },
  legend: {
    position: 'top',
    horizontalAlign: 'right',
    fontFamily: CHART_FONT,
    labels: { colors: chartPalette.value.labelStrong },
  },
  fill: {
    type: 'gradient',
    gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0.03, stops: [0, 100] },
  },
  grid: { borderColor: chartPalette.value.grid, strokeDashArray: 4, padding: { left: 8, right: 8 } },
  xaxis: {
    categories: daily.value.map((point) => point.label),
    labels: {
      rotate: daily.value.length > 14 ? -45 : 0,
      hideOverlappingLabels: true,
      style: { colors: chartPalette.value.label, fontSize: '12px' },
    },
    axisBorder: { color: chartPalette.value.axis },
    axisTicks: { color: chartPalette.value.axis },
  },
  yaxis: {
    // Profit can dip below zero on a bad day, so only pin the floor when it can't.
    min: trendHasLoss.value ? undefined : 0,
    labels: {
      formatter: (value) => formatChartBaht(value),
      style: { colors: chartPalette.value.label, fontSize: '12px' },
    },
  },
  tooltip: {
    theme: chartPalette.value.tooltip,
    y: { formatter: (value) => formatCurrency(value) },
  },
}))

const vsTargetSeries = computed(() => [
  { name: 'ยอดจริง', data: daily.value.map((point) => point.actualQty) },
  { name: 'เป้า', data: daily.value.map((point) => point.targetQty) },
])

const vsTargetOptions = computed<ApexOptions>(() => ({
  chart: { ...baseChart(), type: 'bar' },
  colors: [PRIMARY, chartPalette.value.target],
  plotOptions: { bar: { columnWidth: daily.value.length > 14 ? '70%' : '45%', borderRadius: 4 } },
  dataLabels: { enabled: false },
  grid: { borderColor: chartPalette.value.grid, strokeDashArray: 4, padding: { left: 8, right: 8 } },
  xaxis: {
    categories: daily.value.map((point) => point.label),
    labels: {
      rotate: daily.value.length > 14 ? -45 : 0,
      hideOverlappingLabels: true,
      style: { colors: chartPalette.value.label, fontSize: '12px' },
    },
    axisBorder: { color: chartPalette.value.axis },
    axisTicks: { color: chartPalette.value.axis },
  },
  yaxis: {
    min: 0,
    labels: {
      formatter: (value) => formatNumber(value, 0),
      style: { colors: chartPalette.value.label, fontSize: '12px' },
    },
  },
  legend: {
    position: 'top',
    horizontalAlign: 'right',
    fontFamily: CHART_FONT,
    labels: { colors: chartPalette.value.labelStrong },
  },
  tooltip: {
    theme: chartPalette.value.tooltip,
    y: { formatter: (value) => `${formatNumber(value, 0)} ชิ้น` },
  },
}))

const topMenusSeries = computed(() => [
  { name: 'รายได้', data: rankedMenus.value.map((item) => item.revenue) },
])

const topMenusOptions = computed<ApexOptions>(() => ({
  chart: { ...baseChart(), type: 'bar' },
  colors: [PRIMARY],
  plotOptions: { bar: { horizontal: true, barHeight: '58%', borderRadius: 4 } },
  dataLabels: { enabled: false },
  grid: { borderColor: chartPalette.value.grid, strokeDashArray: 4, padding: { left: 4, right: 8 } },
  xaxis: {
    categories: rankedMenus.value.map((item) => item.name),
    labels: {
      formatter: (value) => {
        const numeric = Number(value)
        return Number.isFinite(numeric) && String(value).trim() === String(numeric)
          ? formatChartBaht(numeric)
          : String(value)
      },
      style: { colors: chartPalette.value.label, fontSize: '12px' },
    },
  },
  yaxis: {
    labels: {
      maxWidth: 140,
      style: { colors: chartPalette.value.labelStrong, fontSize: '12px' },
    },
  },
  tooltip: {
    theme: chartPalette.value.tooltip,
    y: {
      formatter: (value, opts) => {
        const item = rankedMenus.value[opts?.dataPointIndex ?? -1]
        const qty = item ? `${formatNumber(item.actualQty, 0)} ชิ้น · ` : ''
        return `${qty}${formatCurrency(value)}`
      },
    },
  },
}))

onMounted(() => {
  fetchSales()
})
</script>
