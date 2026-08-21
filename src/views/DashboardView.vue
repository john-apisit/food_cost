<template>
  <MainLayout>
    <div class="space-y-6">
      <div>
        <h1 class="page-title">หน้าแรก</h1>
        <p class="text-gray-500 mt-1">สรุปต้นทุน กำไร และสิ่งที่ต้องแก้ก่อนขาย</p>
      </div>

      <div v-if="loading" class="text-gray-500">กำลังโหลด...</div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="card p-5">
          <h3 class="text-gray-500 text-sm font-medium">วัตถุดิบ</h3>
          <p class="text-3xl font-bold mt-2">{{ ingredientCount }}</p>
        </div>
        <div class="card p-5">
          <h3 class="text-gray-500 text-sm font-medium">เมนูที่ขายอยู่</h3>
          <p class="text-3xl font-bold mt-2">{{ menuItems.length }}</p>
        </div>
        <div class="card p-5">
          <h3 class="text-gray-500 text-sm font-medium">Margin เฉลี่ย</h3>
          <p class="text-3xl font-bold mt-2">{{ avgMargin.toFixed(1) }}%</p>
        </div>
        <div class="card p-5">
          <h3 class="text-gray-500 text-sm font-medium">การแจ้งเตือน</h3>
          <p class="text-3xl font-bold mt-2" :class="notifications.length ? 'text-yellow-600' : 'text-green-600'">
            {{ notifications.length }}
          </p>
        </div>
      </div>

      <div v-if="notifications.length" class="card p-5 space-y-3">
        <h2 class="text-lg font-bold">ต้องดู</h2>
        <ul class="space-y-2">
          <li
            v-for="item in notifications.slice(0, 8)"
            :key="item.id"
            class="rounded-lg px-3 py-2 text-sm"
            :class="{
              'bg-red-50 text-red-800': item.type === 'danger',
              'bg-yellow-50 text-yellow-800': item.type === 'warning',
              'bg-blue-50 text-blue-800': item.type === 'info',
            }"
          >
            <span class="font-medium">{{ item.title }}:</span> {{ item.message }}
          </li>
        </ul>
      </div>

      <div class="card p-5">
        <h2 class="text-lg font-bold mb-4">ทางลัด</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <router-link to="/ingredients" class="btn-secondary text-center">เพิ่มวัตถุดิบ</router-link>
          <router-link to="/menu/new" class="btn-secondary text-center">เพิ่มเมนู</router-link>
          <router-link to="/comparison" class="btn-secondary text-center">เปรียบเทียบเมนู</router-link>
          <router-link to="/planning" class="btn-secondary text-center">วางแผนซื้อ</router-link>
        </div>
      </div>

      <MenuComparisonTable
        v-if="breakdowns.length"
        :breakdowns="breakdowns"
        :loading="false"
        :target-margin="settings?.targetMarginPercent"
        @select="goToMenu"
      />
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import MenuComparisonTable from '@/components/comparison/MenuComparisonTable.vue'
import { useCostBreakdown } from '@/composables/useCostBreakdown'
import { useNotifications } from '@/composables/useNotifications'
import type { MenuItem } from '@/types/models'

const router = useRouter()
const { breakdowns, loading, loadAll, menuItems, ingredients, settings } = useCostBreakdown()
const { notifications } = useNotifications(
  () => ingredients.value,
  () => breakdowns.value,
  () => settings.value,
)

const ingredientCount = computed(() => ingredients.value.filter((i) => i.type === 'ingredient').length)
const avgMargin = computed(() => {
  if (!breakdowns.value.length) return 0
  return breakdowns.value.reduce((sum, b) => sum + b.netMarginPercent, 0) / breakdowns.value.length
})
const goToMenu = (menu: MenuItem) => router.push(`/menu/${menu.id}`)

onMounted(() => {
  loadAll()
})
</script>
