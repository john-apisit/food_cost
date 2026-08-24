<template>
  <AuthLayout title="Food Cost" subtitle="ระบบจัดการต้นทุนและวางแผนซื้อวัตถุดิบ">
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

      <div>
        <div class="flex items-center justify-between mb-2">
          <label for="password" class="block text-sm font-medium text-gray-700">รหัสผ่าน</label>
          <router-link to="/forgot-password" class="text-sm text-primary-600 hover:text-primary-700 font-medium">
            ลืมรหัสผ่าน?
          </router-link>
        </div>
        <input
          id="password"
          v-model="password"
          type="password"
          required
          minlength="6"
          autocomplete="current-password"
          class="input-field w-full"
          placeholder="••••••••"
        />
      </div>

      <p v-if="error" class="text-red-600 text-sm">{{ error }}</p>
      <p v-if="info" class="text-green-700 text-sm">{{ info }}</p>

      <button type="submit" class="w-full btn-primary" :disabled="isLoading">
        {{ isLoading ? 'กำลังดำเนินการ...' : submitLabel }}
      </button>

      <div class="text-center">
        <button
          type="button"
          class="text-primary-600 hover:text-primary-700 text-sm font-medium"
          @click="mode = mode === 'signup' ? 'login' : 'signup'"
        >
          {{ mode === 'signup' ? 'มีบัญชีแล้ว? เข้าสู่ระบบ' : 'ยังไม่มีบัญชี? สมัครสมาชิก' }}
        </button>
      </div>
    </form>
  </AuthLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const route = useRoute()
const { signIn, signUp } = useAuth()

function nextPath() {
  const redirect = String(route.query.redirect || '')
  if (redirect.startsWith('/') && !redirect.startsWith('//')) return redirect
  return '/dashboard'
}

const email = ref('')
const password = ref('')
const mode = ref<'login' | 'signup'>('login')
const isLoading = ref(false)
const error = ref('')
const info = ref('')

const submitLabel = computed(() => (mode.value === 'signup' ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'))

const handleSubmit = async () => {
  isLoading.value = true
  error.value = ''
  info.value = ''

  try {
    if (mode.value === 'signup') {
      const data = await signUp(email.value, password.value)
      if (data.session) {
        router.push(nextPath())
      } else {
        info.value = 'สมัครสมาชิกสำเร็จ! กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี'
      }
      return
    }

    await signIn(email.value, password.value)
    router.push(nextPath())
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'เกิดข้อผิดพลาด'
  } finally {
    isLoading.value = false
  }
}
</script>
