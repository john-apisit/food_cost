<template>
  <MainLayout>
    <div class="space-y-6">
      <section class="card p-5 space-y-3">
        <h2 class="font-bold">What-if ราคาวัตถุดิบ</h2>
        <p class="text-sm text-gray-600">จำลองว่าวัตถุดิบทุกตัวแพงขึ้น แล้วดูว่าเมนูและชุดโปรไหน margin ตก</p>
        <div class="flex items-center gap-3">
          <input v-model.number="priceChange" type="range" min="-20" max="50" step="1" class="flex-1" />
          <span class="w-16 text-right font-medium">{{ priceChange }}%</span>
        </div>
        <button type="button" class="text-sm text-primary-600" @click="priceChange = 0">รีเซ็ต</button>
      </section>

      <MenuComparisonTable
        :breakdowns="simulated"
        :loading="loading"
        :target-margin="settings?.targetMarginPercent"
        @select="goToMenu"
      />

      <ComboComparisonTable
        :breakdowns="simulatedCombos"
        :loading="loading"
        :target-margin="settings?.targetMarginPercent"
        @select="goToCombos"
      />
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import MenuComparisonTable from '@/components/comparison/MenuComparisonTable.vue'
import ComboComparisonTable from '@/components/comparison/ComboComparisonTable.vue'
import { useCostBreakdown } from '@/composables/useCostBreakdown'
import { simulateComboFromMenuBreakdowns, simulateIngredientPriceChange } from '@/utils/costCalculator'
import type { MenuItem } from '@/types/models'

const router = useRouter()
const { breakdowns, comboBreakdowns, loading, loadAll, settings } = useCostBreakdown()
const priceChange = ref(0)

const simulated = computed(() =>
  breakdowns.value.map((b) =>
    priceChange.value === 0 ? b : simulateIngredientPriceChange(b, priceChange.value),
  ),
)

const simulatedCombos = computed(() => {
  if (priceChange.value === 0) return comboBreakdowns.value
  return comboBreakdowns.value.map((row) => simulateComboFromMenuBreakdowns(row, simulated.value))
})

const goToMenu = (menu: MenuItem) => router.push(`/menu/${menu.id}`)
const goToCombos = () => router.push('/combos')

onMounted(() => loadAll())
</script>
