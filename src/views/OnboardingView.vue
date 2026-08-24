<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
    <div class="max-w-md w-full space-y-6">
      <div class="text-center">
        <div class="mx-auto mb-4 h-12 w-12 rounded-xl bg-primary-500 text-white flex items-center justify-center text-xl font-bold">F</div>
        <h1 class="text-2xl font-bold">เริ่มต้นใช้งาน</h1>
        <p class="text-gray-500 mt-1">สร้างร้านของตัวเอง หรือรับคำเชิญที่มีอยู่</p>
      </div>

      <form class="card p-6 space-y-4" @submit.prevent="create">
        <h2 class="font-semibold">สร้างร้านใหม่</h2>
        <div>
          <label class="block text-sm font-medium mb-1">ชื่อร้าน</label>
          <input v-model="name" class="input-field w-full" placeholder="เช่น ร้านครัวคุณแม่" />
        </div>
        <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>
        <button type="submit" class="w-full btn-primary" :disabled="saving">
          {{ saving ? 'กำลังสร้าง...' : 'สร้างร้าน' }}
        </button>
      </form>

      <section v-if="pendingInvites.length" class="card p-6 space-y-3">
        <h2 class="font-semibold">คำเชิญที่รอคุณตอบรับ</h2>
        <ul class="space-y-2">
          <li v-for="invite in pendingInvites" :key="invite.id">
            <router-link class="text-primary-600 hover:text-primary-700 font-medium" :to="`/invite/${invite.token}`">
              {{ invite.email }} · {{ STORE_ROLE_LABELS[invite.role] }}
            </router-link>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/config/supabase'
import { useCurrentStore } from '@/composables/useCurrentStore'
import { STORE_ROLE_LABELS, isStoreRole, type StoreRole } from '@/utils/permissions'

const router = useRouter()
const { createStore } = useCurrentStore()

const name = ref('')
const saving = ref(false)
const errorMessage = ref('')
const pendingInvites = ref<Array<{ id: string; email: string; role: StoreRole; token: string }>>([])

const create = async () => {
  saving.value = true
  errorMessage.value = ''
  try {
    await createStore(name.value)
    router.push('/dashboard')
  } catch (e: unknown) {
    errorMessage.value = e instanceof Error ? e.message : 'สร้างร้านไม่สำเร็จ'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  const { data } = await supabase
    .from('store_invites')
    .select('id, email, role, token, status')
    .eq('status', 'pending')
  pendingInvites.value = (data || []).flatMap((row) => {
    if (!isStoreRole(row.role)) return []
    return [{ id: row.id, email: row.email, role: row.role, token: row.token }]
  })
})
</script>
