<template>
  <MainLayout>
    <div class="space-y-4">
      <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h1 class="page-title">เมนู</h1>
        <router-link to="/menu/new" class="btn-primary">+ เพิ่มเมนู</router-link>
      </div>

      <div class="flex flex-col sm:flex-row gap-3">
        <input v-model="search" type="search" placeholder="ค้นหาเมนู..." class="input-field flex-1" />
        <select v-model="filterUnit" class="input-field sm:w-40">
          <option value="">ทุกประเภท</option>
          <option value="box">กล่อง</option>
          <option value="bag">มัดถุง</option>
        </select>
        <select v-model="filterStatus" class="input-field sm:w-44">
          <option value="">ทุกสถานะ</option>
          <option v-for="status in MENU_STATUSES" :key="status" :value="status">
            {{ MENU_STATUS_LABELS[status] }}
          </option>
        </select>
      </div>

      <div v-if="loading" class="text-gray-500 py-8 text-center">กำลังโหลด...</div>
      <EmptyState v-else-if="filtered.length === 0" title="ยังไม่มีเมนู" description="สร้างเมนูพร้อมสูตรเพื่อดูต้นทุนและกำไร">
        <router-link to="/menu/new" class="btn-primary">เพิ่มเมนูแรก</router-link>
      </EmptyState>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <article v-for="menu in filtered" :key="menu.id" class="card overflow-hidden flex flex-col">
          <router-link :to="`/menu/${menu.id}`" class="block hover:opacity-90">
            <MenuImage :src="menu.imageUrl" :alt="menu.name" />
          </router-link>
          <div class="p-5 space-y-3 flex-1 flex flex-col">
            <div class="flex justify-between gap-3">
              <div>
                <h2 class="font-bold text-lg">{{ menu.name }}</h2>
                <p v-if="menu.description" class="mt-0.5 text-sm text-gray-600 line-clamp-2">{{ menu.description }}</p>
                <p class="text-sm text-gray-500">{{ menu.category || 'ไม่มีหมวดหมู่' }}</p>
              </div>
              <div class="flex flex-col items-end gap-1 shrink-0">
                <span
                  class="h-fit px-2 py-1 text-xs rounded-full"
                  :class="menu.saleUnitType === 'box' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'"
                >
                  {{ saleUnitLabel(menu.saleUnitType) }}
                </span>
                <span class="h-fit px-2 py-1 text-xs rounded-full" :class="menuStatusBadgeClass(menu.status)">
                  {{ menuStatusLabel(menu.status) }}
                </span>
              </div>
            </div>
            <p v-if="menu.statusNote" class="text-sm text-gray-500" :title="menu.statusNote">
              {{ menu.statusNote }}
            </p>
            <p class="text-sm">ราคาขาย <span class="font-semibold">{{ formatCurrency(menu.sellingPrice) }}</span></p>
            <div class="flex flex-wrap gap-2 text-sm mt-auto">
              <router-link :to="`/menu/${menu.id}`" class="text-primary-600 font-medium">ดูต้นทุน</router-link>
              <router-link :to="`/menu/${menu.id}/edit`" class="text-gray-600">แก้ไข</router-link>
              <button type="button" class="text-gray-600" @click="duplicate(menu)">คัดลอกสูตร</button>
              <button type="button" class="text-red-600" @click="remove(menu)">ลบ</button>
            </div>
          </div>
        </article>
      </div>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import MenuImage from '@/components/menu/MenuImage.vue'
import { useMenu } from '@/composables/useMenu'
import { useToast } from '@/composables/useToast'
import { formatCurrency, menuStatusBadgeClass, menuStatusLabel, saleUnitLabel } from '@/utils/format'
import { MENU_STATUSES, MENU_STATUS_LABELS, type MenuItem, type MenuStatus, type SaleUnitType } from '@/types/models'

const { menuItems, loading, fetchMenuItems, deleteMenuItem, duplicateMenuItem } = useMenu()
const { success, error } = useToast()
const search = ref('')
const filterUnit = ref<'' | SaleUnitType>('')
const filterStatus = ref<'' | MenuStatus>('')

const filtered = computed(() =>
  menuItems.value.filter((menu) => {
    if (filterUnit.value && menu.saleUnitType !== filterUnit.value) return false
    if (filterStatus.value && menu.status !== filterStatus.value) return false
    if (search.value && !menu.name.toLowerCase().includes(search.value.toLowerCase())) return false
    return true
  }),
)

const duplicate = async (menu: MenuItem) => {
  const name = prompt('ชื่อเมนูใหม่', `${menu.name} (คัดลอก)`)
  if (!name) return
  try {
    await duplicateMenuItem(menu.id, name)
    success('คัดลอกสูตรแล้ว')
  } catch (e: unknown) {
    error(e instanceof Error ? e.message : 'คัดลอกไม่สำเร็จ')
  }
}

const remove = async (menu: MenuItem) => {
  if (!confirm(`ลบเมนู ${menu.name}?`)) return
  try {
    await deleteMenuItem(menu.id)
    success('ลบเมนูแล้ว')
  } catch (e: unknown) {
    error(e instanceof Error ? e.message : 'ลบไม่สำเร็จ')
  }
}

onMounted(() => fetchMenuItems())
</script>
