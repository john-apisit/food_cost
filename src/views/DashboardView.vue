<template>
  <MainLayout>
    <template #banner>
      <div class="bg-gray-50">
        <div class="h-40 sm:h-52 lg:h-60 overflow-hidden bg-gradient-to-r from-primary-700 via-primary-500 to-primary-400">
          <img
            v-if="settings?.bannerUrl && !bannerBroken"
            :src="settings.bannerUrl"
            alt=""
            class="h-full w-full object-cover"
            loading="lazy"
            referrerpolicy="no-referrer"
            @error="bannerBroken = true"
          />
        </div>
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-start gap-4 sm:gap-5 -mt-20 sm:-mt-24 pb-5">
            <div class="h-40 w-40 sm:h-48 sm:w-48 rounded-xl border-4 border-white shadow-md overflow-hidden bg-white shrink-0">
              <img
                v-if="settings?.logoUrl && !logoBroken"
                :src="settings.logoUrl"
                :alt="storeTitle"
                class="h-full w-full object-cover"
                loading="lazy"
                referrerpolicy="no-referrer"
                @error="logoBroken = true"
              />
              <div
                v-else
                class="flex h-full w-full items-center justify-center bg-primary-50 text-primary-600"
              >
                <span v-if="storeInitial" class="text-4xl font-bold leading-none">{{ storeInitial }}</span>
                <Store v-else class="h-16 w-16" />
              </div>
            </div>
            <div class="min-w-0 flex-1 pt-20 sm:pt-24">
              <h1 class="page-title truncate">{{ storeTitle }}</h1>
              <p
                v-if="settings?.storeDescription"
                class="text-gray-600 mt-1 whitespace-pre-line"
              >
                {{ settings.storeDescription }}
              </p>
              <p v-else class="text-gray-500 mt-1">สรุปต้นทุน กำไร และสิ่งที่ต้องแก้ก่อนขาย</p>
            </div>
          </div>
        </div>
      </div>
    </template>

    <div class="space-y-6">

      <div v-if="loading" class="text-gray-500">กำลังโหลด...</div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div class="card p-5">
          <h3 class="text-gray-500 text-sm font-medium">วัตถุดิบ</h3>
          <p class="text-3xl font-bold mt-2">{{ ingredientCount }}</p>
        </div>
        <div class="card p-5">
          <h3 class="text-gray-500 text-sm font-medium">เมนูที่ขายอยู่</h3>
          <p class="text-3xl font-bold mt-2">{{ menuItems.length }}</p>
        </div>
        <div class="card p-5">
          <h3 class="text-gray-500 text-sm font-medium">ชุดโปร</h3>
          <p class="text-3xl font-bold mt-2">{{ combos.length }}</p>
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

      <DashboardSalesCharts />

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
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
          <router-link to="/ingredients" class="btn-secondary text-center">เพิ่มวัตถุดิบ</router-link>
          <router-link to="/menu/new" class="btn-secondary text-center">เพิ่มเมนู</router-link>
          <router-link to="/combos" class="btn-secondary text-center">สร้างชุดโปร</router-link>
          <router-link to="/comparison" class="btn-secondary text-center">เปรียบเทียบเมนู</router-link>
          <router-link to="/planning" class="btn-secondary text-center">วางแผนซื้อ</router-link>
          <router-link to="/cashbook" class="btn-secondary text-center">รายรับ-รายจ่าย</router-link>
          <router-link to="/revenue" class="btn-secondary text-center">ประมาณการรายได้</router-link>
        </div>
      </div>

      <MenuComparisonTable
        v-if="breakdowns.length"
        :breakdowns="breakdowns"
        :loading="false"
        :target-margin="settings?.targetMarginPercent"
        @select="goToMenu"
      />

      <ComboComparisonTable
        v-if="!loading"
        :breakdowns="comboBreakdowns"
        :loading="false"
        :target-margin="settings?.targetMarginPercent"
        @select="goToCombos"
      />
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Store } from 'lucide-vue-next'
import MainLayout from '@/layouts/MainLayout.vue'
import DashboardSalesCharts from '@/components/dashboard/DashboardSalesCharts.vue'
import MenuComparisonTable from '@/components/comparison/MenuComparisonTable.vue'
import ComboComparisonTable from '@/components/comparison/ComboComparisonTable.vue'
import { useCostBreakdown } from '@/composables/useCostBreakdown'
import { useNotifications } from '@/composables/useNotifications'
import type { MenuItem } from '@/types/models'

const router = useRouter()
const { breakdowns, comboBreakdowns, loading, loadAll, menuItems, ingredients, settings, combos } = useCostBreakdown()
const { notifications } = useNotifications(
  () => ingredients.value,
  () => breakdowns.value,
  () => settings.value,
  () => comboBreakdowns.value,
)

const bannerBroken = ref(false)
const logoBroken = ref(false)

watch(
  () => settings.value?.bannerUrl,
  () => {
    bannerBroken.value = false
  },
)
watch(
  () => settings.value?.logoUrl,
  () => {
    logoBroken.value = false
  },
)

const storeTitle = computed(() => settings.value?.storeName?.trim() || 'หน้าแรก')
const storeInitial = computed(() => {
  const name = settings.value?.storeName?.trim()
  return name ? Array.from(name)[0] : ''
})

const ingredientCount = computed(() => ingredients.value.filter((i) => i.type === 'ingredient').length)
const avgMargin = computed(() => {
  if (!breakdowns.value.length) return 0
  return breakdowns.value.reduce((sum, b) => sum + b.netMarginPercent, 0) / breakdowns.value.length
})
const goToMenu = (menu: MenuItem) => router.push(`/menu/${menu.id}`)
const goToCombos = () => router.push('/combos')

onMounted(() => {
  loadAll()
})
</script>
