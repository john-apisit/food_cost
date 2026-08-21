<template>
  <AuthLayout title="ลืมรหัสผ่าน" subtitle="กรอกอีเมลเพื่อรับลิงก์ตั้งรหัสผ่านใหม่">
    <form class="space-y-5" @submit.prevent="handleSubmit">
      <div>
        <label for="email" class="block text-sm font-medium text-gray-700 mb-2">อีเมล</label>
        <input
          id="email"
          v-model="email"
          type="email"
          required
          autocomplete="email"
          class="input-field w-full"
          placeholder="your@email.com"
        />
      </div>

      <p v-if="error" class="text-red-600 text-sm">{{ error }}</p>
      <p v-if="info" class="text-green-700 text-sm">{{ info }}</p>

      <button type="submit" class="w-full btn-primary" :disabled="isLoading">
        {{ isLoading ? 'กำลังส่งลิงก์...' : 'ส่งลิงก์รีเซ็ตรหัสผ่าน' }}
      </button>

      <div class="text-center">
        <router-link to="/login" class="text-gray-500 hover:text-gray-700 text-sm">
          กลับไปเข้าสู่ระบบ
        </router-link>
      </div>
    </form>
  </AuthLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { useAuth } from '@/composables/useAuth'

const { resetPassword } = useAuth()

const email = ref('')
const isLoading = ref(false)
const error = ref('')
const info = ref('')

const handleSubmit = async () => {
  isLoading.value = true
  error.value = ''
  info.value = ''

  try {
    await resetPassword(email.value)
    info.value = 'ส่งลิงก์รีเซ็ตรหัสผ่านไปที่อีเมลแล้ว กรุณาตรวจสอบกล่องจดหมาย'
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'ส่งลิงก์ไม่สำเร็จ'
  } finally {
    isLoading.value = false
  }
}
</script>
