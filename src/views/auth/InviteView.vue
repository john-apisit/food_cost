<template>
  <AuthLayout title="คำเชิญเข้าร้าน" :subtitle="subtitle">
    <div class="space-y-5">
      <p v-if="loading" class="text-gray-500">กำลังโหลดคำเชิญ...</p>
      <p v-else-if="loadError" class="text-red-600 text-sm">{{ loadError }}</p>
      <template v-else-if="invite">
        <div class="rounded-lg bg-gray-50 p-4 space-y-1">
          <p class="font-medium text-gray-900">{{ invite.store_name }}</p>
          <p class="text-sm text-gray-600">บทบาท: {{ roleLabel }}</p>
          <p class="text-sm text-gray-600">อีเมล: {{ invite.email }}</p>
        </div>
        <p v-if="actionError" class="text-red-600 text-sm">{{ actionError }}</p>
        <button
          v-if="isAuthenticated"
          type="button"
          class="w-full btn-primary"
          :disabled="accepting"
          @click="accept"
        >
          {{ accepting ? 'กำลังเข้าร้าน...' : 'ยอมรับคำเชิญ' }}
        </button>
        <router-link
          v-else
          class="w-full btn-primary"
          :to="{ path: '/login', query: { redirect: `/invite/${token}` } }"
        >
          เข้าสู่ระบบเพื่อยอมรับ
        </router-link>
      </template>
    </div>
  </AuthLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { supabase } from '@/config/supabase'
import { useAuth } from '@/composables/useAuth'
import { useStoreMembers } from '@/composables/useStoreMembers'
import { STORE_ROLE_LABELS, isStoreRole } from '@/utils/permissions'

const route = useRoute()
const router = useRouter()
const { isAuthenticated } = useAuth()
const { acceptInvite } = useStoreMembers()

const token = computed(() => String(route.params.token || ''))
const loading = ref(true)
const loadError = ref('')
const actionError = ref('')
const accepting = ref(false)
const invite = ref<{
  store_name: string
  role: string
  email: string
  status: string
} | null>(null)

const subtitle = computed(() =>
  invite.value ? 'คุณถูกเชิญให้ช่วยดูแลร้านนี้' : 'ตรวจสอบลิงก์คำเชิญ',
)
const roleLabel = computed(() =>
  isStoreRole(invite.value?.role) ? STORE_ROLE_LABELS[invite.value.role] : invite.value?.role || '',
)

onMounted(async () => {
  try {
    const { data, error } = await supabase.rpc('get_store_invite', { p_token: token.value })
    if (error) throw error
    const row = Array.isArray(data) ? data[0] : data
    if (!row) {
      loadError.value = 'ไม่พบคำเชิญนี้'
      return
    }
    if (row.status !== 'pending') {
      loadError.value = 'คำเชิญนี้ถูกใช้ไปแล้วหรือหมดอายุ'
      return
    }
    invite.value = row
  } catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : 'โหลดคำเชิญไม่สำเร็จ'
  } finally {
    loading.value = false
  }
})

const accept = async () => {
  accepting.value = true
  actionError.value = ''
  try {
    await acceptInvite(token.value)
    router.push('/dashboard')
  } catch (e: unknown) {
    actionError.value = e instanceof Error ? e.message : 'ยอมรับคำเชิญไม่สำเร็จ'
  } finally {
    accepting.value = false
  }
}
</script>
