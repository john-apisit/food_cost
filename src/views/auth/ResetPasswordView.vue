<template>
  <AuthLayout title="ตั้งรหัสผ่านใหม่" subtitle="กำหนดรหัสผ่านใหม่สำหรับบัญชีของคุณ">
    <form class="space-y-5" @submit.prevent="handleSubmit">
      <div>
        <label for="password" class="block text-sm font-medium text-gray-700 mb-2">รหัสผ่านใหม่</label>
        <input
          id="password"
          v-model="password"
          type="password"
          required
          minlength="6"
          autocomplete="new-password"
          class="input-field w-full"
          placeholder="อย่างน้อย 6 ตัวอักษร"
        />
      </div>

      <div>
        <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-2">ยืนยันรหัสผ่านใหม่</label>
        <input
          id="confirmPassword"
          v-model="confirmPassword"
          type="password"
          required
          minlength="6"
          autocomplete="new-password"
          class="input-field w-full"
          placeholder="••••••••"
        />
      </div>

      <p v-if="error" class="text-red-600 text-sm">{{ error }}</p>

      <button type="submit" class="w-full btn-primary" :disabled="isLoading">
        {{ isLoading ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่' }}
      </button>
    </form>
  </AuthLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const { updatePassword } = useAuth()
const { success } = useToast()

const password = ref('')
const confirmPassword = ref('')
const isLoading = ref(false)
const error = ref('')

const handleSubmit = async () => {
  error.value = ''

  if (password.value !== confirmPassword.value) {
    error.value = 'รหัสผ่านใหม่ไม่ตรงกัน'
    return
  }

  isLoading.value = true
  try {
    await updatePassword(password.value)
    success('ตั้งรหัสผ่านใหม่แล้ว')
    router.push('/dashboard')
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'ตั้งรหัสผ่านไม่สำเร็จ'
  } finally {
    isLoading.value = false
  }
}
</script>
