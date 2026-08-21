<template>
  <MainLayout>
    <div class="max-w-xl space-y-6">
      <div>
        <h1 class="page-title">โปรไฟล์</h1>
        <p class="text-gray-500 mt-1">ข้อมูลบัญชีและการเข้าสู่ระบบ</p>
      </div>

      <form class="card p-6 space-y-4" @submit.prevent="saveProfile">
        <div>
          <label for="displayName" class="block text-sm font-medium mb-1">ชื่อที่แสดง</label>
          <input
            id="displayName"
            v-model="name"
            class="input-field w-full"
            maxlength="80"
            placeholder="ชื่อของคุณ"
          />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">อีเมล</label>
          <input :value="user?.email" class="input-field w-full bg-gray-50" disabled />
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p class="text-gray-500">สร้างบัญชีเมื่อ</p>
            <p class="font-medium mt-1">{{ user?.created_at ? formatDate(user.created_at) : '-' }}</p>
          </div>
          <div>
            <p class="text-gray-500">เข้าสู่ระบบล่าสุด</p>
            <p class="font-medium mt-1">{{ user?.last_sign_in_at ? formatDate(user.last_sign_in_at) : '-' }}</p>
          </div>
        </div>
        <button type="submit" class="btn-primary" :disabled="saving">
          {{ saving ? 'กำลังบันทึก...' : 'บันทึกโปรไฟล์' }}
        </button>
      </form>

      <div class="card p-6 space-y-3">
        <h2 class="text-lg font-bold">ความปลอดภัย</h2>
        <p class="text-sm text-gray-500">เปลี่ยนรหัสผ่านสำหรับบัญชีนี้</p>
        <router-link to="/change-password" class="btn-secondary">เปลี่ยนรหัสผ่าน</router-link>
      </div>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import { formatDate } from '@/utils/format'

const { user, displayName, updateProfile } = useAuth()
const { success, error } = useToast()

const name = ref(displayName.value)
const saving = ref(false)

watch(displayName, (value) => {
  name.value = value
})

const saveProfile = async () => {
  saving.value = true
  try {
    await updateProfile(name.value)
    success('บันทึกโปรไฟล์แล้ว')
  } catch (e: unknown) {
    error(e instanceof Error ? e.message : 'บันทึกโปรไฟล์ไม่สำเร็จ')
  } finally {
    saving.value = false
  }
}
</script>
