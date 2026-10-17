import { computed, ref } from 'vue'
import { supabase } from '@/config/supabase'
import type { SalesRecord } from '@/types/models'
import { mapSalesRecord } from '@/types/mappers'
import {
  SALES_CHART_MAX_DAYS,
  aggregateDailySales,
  aggregateTopMenus,
  recordsInRange,
  salesChartRange,
  summarizeSales,
  type ProfitContext,
  type SalesChartRangeDays,
} from '@/utils/salesChart'
import { useAuth } from './useAuth'
import { useCostBreakdown } from './useCostBreakdown'
import { useCurrentStore } from './useCurrentStore'

export function useDashboardSales() {
  const { user } = useAuth()
  const { currentStoreId } = useCurrentStore()
  // Menu / ingredient / settings state is shared and loaded by the dashboard itself.
  const { breakdowns, settings } = useCostBreakdown()

  const profitContext = computed<ProfitContext | undefined>(() => {
    if (!settings.value) return undefined
    return {
      unitCostByMenuId: new Map(breakdowns.value.map((b) => [b.menuItem.id, b.totalCost])),
      platformFeePercent: settings.value.platformFeePercent,
    }
  })
  const records = ref<SalesRecord[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const rangeDays = ref<SalesChartRangeDays>(7)

  const fetchSales = async () => {
    if (!user.value || !currentStoreId.value) return
    loading.value = true
    error.value = null
    const { from, to } = salesChartRange(SALES_CHART_MAX_DAYS)

    try {
      const { data, error: fetchError } = await supabase
        .from('sales_records')
        .select(`
          *,
          menu_item:menu_items (*)
        `)
        .eq('store_id', currentStoreId.value)
        .gte('sale_date', from)
        .lte('sale_date', to)
        .order('sale_date', { ascending: true })

      if (fetchError) throw fetchError
      records.value = (data || []).map((row) => mapSalesRecord(row as Record<string, unknown>))
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'โหลดยอดขายไม่สำเร็จ'
    } finally {
      loading.value = false
    }
  }

  const period = computed(() => salesChartRange(rangeDays.value))
  const periodRecords = computed(() =>
    recordsInRange(records.value, period.value.from, period.value.to),
  )
  const daily = computed(() =>
    aggregateDailySales(
      periodRecords.value,
      period.value.from,
      period.value.to,
      profitContext.value,
    ),
  )
  const topMenus = computed(() => aggregateTopMenus(periodRecords.value, 8))
  const summary = computed(() => summarizeSales(periodRecords.value))
  const hasAnySales = computed(() => records.value.length > 0)
  const periodHasSales = computed(() => periodRecords.value.length > 0)

  return {
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
  }
}
