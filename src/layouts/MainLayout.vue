<template>
  <div class="min-h-screen bg-gray-50">
    <header class="lg:hidden sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-gray-200 bg-white px-4">
      <router-link to="/dashboard" class="flex min-w-0 items-center gap-2">
        <span class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500 text-white font-bold">F</span>
        <span class="truncate text-lg font-bold text-primary-600">Food Cost</span>
      </router-link>
      <button
        type="button"
        class="p-2 text-gray-600"
        :aria-expanded="mobileOpen"
        aria-controls="app-sidebar"
        aria-label="เปิดเมนู"
        @click="mobileOpen = true"
      >
        <Menu class="h-6 w-6" />
      </button>
    </header>

    <div
      v-if="mobileOpen"
      class="fixed inset-0 z-40 bg-black/40 lg:hidden"
      @click="mobileOpen = false"
    />

    <aside
      id="app-sidebar"
      class="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-200 bg-white transition-transform duration-200 ease-out lg:translate-x-0"
      :class="mobileOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="flex h-16 items-center justify-between gap-2 border-b border-gray-100 px-4">
        <router-link
          to="/dashboard"
          class="flex min-w-0 items-center gap-2"
          @click="mobileOpen = false"
        >
          <span class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500 text-white font-bold">F</span>
          <span class="truncate text-lg font-bold text-primary-600">Food Cost</span>
        </router-link>
        <button
          type="button"
          class="p-1.5 text-gray-500 lg:hidden"
          aria-label="ปิดเมนู"
          @click="mobileOpen = false"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <div class="border-b border-gray-100 px-3 py-3 space-y-2">
        <label class="block text-xs font-medium text-gray-500">ร้านที่ใช้งาน</label>
        <select
          class="input-field w-full"
          :value="currentStoreId ?? ''"
          @change="onStoreChange"
        >
          <option v-for="item in memberships" :key="item.storeId" :value="item.storeId">
            {{ item.storeName }}
          </option>
        </select>
        <button type="button" class="text-sm font-medium text-primary-600 hover:text-primary-700" @click="showCreateStore = true">
          + สร้างร้านใหม่
        </button>
      </div>

      <nav class="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
        <router-link
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
          active-class="bg-primary-50 text-primary-700"
          inactive-class="text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          @click="mobileOpen = false"
        >
          <component :is="item.icon" class="h-5 w-5 shrink-0" />
          {{ item.label }}
        </router-link>
      </nav>

      <div class="space-y-1 border-t border-gray-100 p-3">
        <router-link
          to="/profile"
          class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          active-class="bg-primary-50 text-primary-700"
          @click="mobileOpen = false"
        >
          <User class="h-5 w-5 shrink-0" />
          <span class="truncate">{{ profileLabel }}</span>
        </router-link>
        <button
          type="button"
          class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          @click="handleSignOut"
        >
          <LogOut class="h-5 w-5 shrink-0" />
          ออกจากระบบ
        </button>
      </div>
    </aside>

    <div class="lg:pl-64">
      <slot name="banner" />

      <main
        class="mx-auto max-w-7xl px-4 pb-6 sm:px-6 sm:pb-8 lg:px-8"
        :class="hasBanner ? 'pt-2 sm:pt-3' : 'pt-6 sm:pt-8'"
      >
        <slot />
      </main>
    </div>

    <div
      v-if="showCreateStore"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <form class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4" @submit.prevent="handleCreateStore">
        <h3 class="text-lg font-bold">สร้างร้านใหม่</h3>
        <div>
          <label class="block text-sm font-medium mb-1">ชื่อร้าน</label>
          <input v-model="newStoreName" class="input-field w-full" placeholder="เช่น ร้านครัวคุณแม่" />
        </div>
        <p v-if="createError" class="text-sm text-red-600">{{ createError }}</p>
        <div class="flex justify-end gap-2">
          <button type="button" class="btn-secondary" @click="showCreateStore = false">ยกเลิก</button>
          <button type="submit" class="btn-primary" :disabled="creatingStore">
            {{ creatingStore ? 'กำลังสร้าง...' : 'สร้างร้าน' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useSlots, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Component } from 'vue'
import {
  BarChart3,
  Calculator,
  ClipboardList,
  Home,
  Layers,
  Leaf,
  LogOut,
  Menu,
  Package,
  Settings,
  Truck,
  User,
  Users,
  UtensilsCrossed,
  Wallet,
  X,
} from 'lucide-vue-next'
import { useAuth } from '@/composables/useAuth'
import { useCurrentStore } from '@/composables/useCurrentStore'
import { usePermissions } from '@/composables/usePermissions'

const router = useRouter()
const route = useRoute()
const slots = useSlots()
const { signOut, user, displayName } = useAuth()
const { memberships, currentStoreId, selectStore, createStore } = useCurrentStore()
const { isAdmin } = usePermissions()
const mobileOpen = ref(false)
const showCreateStore = ref(false)
const newStoreName = ref('')
const creatingStore = ref(false)
const createError = ref('')

const hasBanner = computed(() => Boolean(slots.banner))
const profileLabel = computed(() => displayName.value || user.value?.email || 'โปรไฟล์')

const navItems = computed(() => {
  const items: { label: string; to: string; icon: Component }[] = [
    { label: 'หน้าแรก', to: '/dashboard', icon: Home },
    { label: 'เมนู', to: '/menu', icon: UtensilsCrossed },
    { label: 'ชุดโปร', to: '/combos', icon: Layers },
    { label: 'วัตถุดิบ', to: '/ingredients', icon: Leaf },
    { label: 'บรรจุภัณฑ์', to: '/packaging', icon: Package },
    { label: 'ซัพพลายเออร์', to: '/suppliers', icon: Truck },
    { label: 'วางแผนซื้อ', to: '/planning', icon: ClipboardList },
    { label: 'บันทึกยอดขาย', to: '/sales', icon: BarChart3 },
    { label: 'รายรับ-จ่าย', to: '/cashbook', icon: Wallet },
    { label: 'คำนวนรายได้', to: '/revenue', icon: Calculator },
  ]
  if (isAdmin.value) items.push({ label: 'ผู้ใช้', to: '/users', icon: Users })
  items.push({ label: 'ตั้งค่า', to: '/settings', icon: Settings })
  return items
})

const onStoreChange = async (event: Event) => {
  const target = event.target
  if (!(target instanceof HTMLSelectElement)) return
  await selectStore(target.value)
}

const handleCreateStore = async () => {
  creatingStore.value = true
  createError.value = ''
  try {
    await createStore(newStoreName.value)
    showCreateStore.value = false
    newStoreName.value = ''
    mobileOpen.value = false
    router.push('/dashboard')
  } catch (e: unknown) {
    createError.value = e instanceof Error ? e.message : 'สร้างร้านไม่สำเร็จ'
  } finally {
    creatingStore.value = false
  }
}

watch(
  () => route.fullPath,
  () => {
    mobileOpen.value = false
  },
)

watch(mobileOpen, (open: boolean) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') mobileOpen.value = false
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})

const handleSignOut = async () => {
  try {
    await signOut()
    router.push('/login')
  } catch (error) {
    console.error('Sign out error:', error)
  }
}
</script>
