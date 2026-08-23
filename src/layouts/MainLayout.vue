<template>
  <div class="min-h-screen bg-gray-50">
    <nav class="bg-white shadow-sm sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center min-w-0">
            <router-link to="/dashboard" class="flex-shrink-0 flex items-center gap-2">
              <span class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500 text-white font-bold">F</span>
              <h1 class="text-lg font-bold text-primary-600 hidden sm:block">Food Cost</h1>
            </router-link>
            <div class="hidden lg:ml-8 lg:flex lg:space-x-6">
              <router-link
                v-for="item in navItems"
                :key="item.to"
                :to="item.to"
                class="inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2 transition-colors"
                active-class="border-primary-500 text-gray-900"
                inactive-class="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                {{ item.label }}
              </router-link>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <button
              class="lg:hidden p-2 text-gray-600"
              type="button"
              aria-label="เปิดเมนู"
              @click="mobileOpen = !mobileOpen"
            >
              <X v-if="mobileOpen" class="h-6 w-6" />
              <Menu v-else class="h-6 w-6" />
            </button>
            <router-link
              to="/profile"
              class="hidden sm:inline-flex items-center max-w-[10rem] truncate text-gray-500 hover:text-gray-700 text-sm font-medium"
            >
              {{ profileLabel }}
            </router-link>
            <button
              type="button"
              class="hidden sm:inline text-gray-500 hover:text-gray-700 text-sm font-medium"
              @click="handleSignOut"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>
      </div>

      <div v-if="mobileOpen" class="lg:hidden border-t bg-white">
        <div class="px-4 py-3 space-y-1">
          <router-link
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="block rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            active-class="bg-primary-50 text-primary-700"
            @click="mobileOpen = false"
          >
            {{ item.label }}
          </router-link>
          <router-link
            to="/profile"
            class="block rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            active-class="bg-primary-50 text-primary-700"
            @click="mobileOpen = false"
          >
            โปรไฟล์
          </router-link>
          <button
            type="button"
            class="block w-full text-left rounded-lg px-3 py-2 text-sm font-medium text-red-600"
            @click="handleSignOut"
          >
            ออกจากระบบ
          </button>
        </div>
      </div>
    </nav>

    <slot name="banner" />

    <main
      class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8"
      :class="hasBanner ? 'pt-2 sm:pt-3' : 'pt-6 sm:pt-8'"
    >
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useSlots } from 'vue'
import { useRouter } from 'vue-router'
import { Menu, X } from 'lucide-vue-next'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const slots = useSlots()
const { signOut, user, displayName } = useAuth()
const mobileOpen = ref(false)

const hasBanner = computed(() => Boolean(slots.banner))
const profileLabel = computed(() => displayName.value || user.value?.email || 'โปรไฟล์')

const navItems = [
  { label: 'หน้าแรก', to: '/dashboard' },
  { label: 'เมนู', to: '/menu' },
  { label: 'ชุดโปร', to: '/combos' },
  { label: 'วัตถุดิบ', to: '/ingredients' },
  { label: 'บรรจุภัณฑ์', to: '/packaging' },
  { label: 'วางแผนซื้อ', to: '/planning' },
  { label: 'บันทึกยอดขาย', to: '/sales' },
  { label: 'รายรับ-จ่าย', to: '/cashbook' },
  { label: 'คำนวนรายได้', to: '/revenue' },
  { label: 'ตั้งค่า', to: '/settings' },
]

const handleSignOut = async () => {
  try {
    await signOut()
    router.push('/login')
  } catch (error) {
    console.error('Sign out error:', error)
  }
}
</script>
