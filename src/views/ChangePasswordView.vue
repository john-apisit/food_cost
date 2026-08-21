<template>
  <MainLayout>
    <div class="max-w-xl space-y-6">
      <div>
        <h1 class="page-title">เปลี่ยนรหัสผ่าน</h1>
        <p class="text-gray-500 mt-1">ยืนยันรหัสผ่านปัจจุบันแล้วตั้งรหัสผ่านใหม่</p>
      </div>

      <form class="card p-6 space-y-4" @submit.prevent="handleSubmit">
        <div>
          <label for="currentPassword" class="block text-sm font-medium mb-1">รหัสผ่านปัจจุบัน</label>
          <input
            id="currentPassword"
            v-model="currentPassword"
            type="password"
            required
            autocomplete="current-password"
            class="input-field w-full"
          />
        </div>
        <div>
          <label for="newPassword" class="block text-sm font-medium mb-1">รหัสผ่านใหม่</label>
          <input
            id="newPassword"
            v-model="newPassword"
            type="password"
            required
            minlength="6"
            autocomplete="new-password"
            class="input-field w-full"
            placeholder="อย่างน้อย 6 ตัวอักษร"
          />
        </div>
        <div>
          <label for="confirmPassword" class="block text-sm font-medium mb-1">ยืนยันรหัสผ่านใหม่</label>
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            type="password"
            required
            minlength="6"
            autocomplete="new-password"
            class="input-field w-full"
          />
        </div>
        <p v-if="formError" class="text-red-600 text-sm">{{ formError }}</p>
        <div class="flex items-center gap-3">
          <button type="submit" class="btn-primary" :disabled="saving">
            {{ saving ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่าน' }}
          </button>
          <router-link to="/profile" class="text-sm text-gray-500 hover:text-gray-700">กลับไปโปรไฟล์</router-link>
        </div>
      </form>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const { changePassword } = useAuth()
const { success, error } = useToast()

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const formError = ref('')
const saving = ref(false)

const handleSubmit = async () => {
  formError.value = ''

  if (newPassword.value !== confirmPassword.value) {
    formError.value = 'รหัสผ่านใหม่ไม่ตรงกัน'
    return
  }

  if (newPassword.value === currentPassword.value) {
    formError.value = 'รหัสผ่านใหม่ต้องต่างจากรหัสผ่านปัจจุบัน'
    return
  }

  saving.value = true
  try {
    await changePassword(currentPassword.value, newPassword.value)
    success('เปลี่ยนรหัสผ่านแล้ว')
    router.push('/profile')
  } catch (e: unknown) {
    formError.value = e instanceof Error ? e.message : 'เปลี่ยนรหัสผ่านไม่สำเร็จ'
    error(formError.value)
  } finally {
    saving.value = false
  }
}
</script>
