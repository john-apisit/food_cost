<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
    <div class="max-w-md w-full">
      <div class="bg-white rounded-2xl shadow-xl p-8">
        <div class="text-center mb-8">
          <div class="mx-auto mb-4 h-12 w-12 rounded-xl bg-primary-500 text-white flex items-center justify-center text-xl font-bold">F</div>
          <h1 class="text-3xl font-bold text-gray-900 mb-2">Food Cost</h1>
          <p class="text-gray-600">ระบบจัดการต้นทุนและวางแผนซื้อวัตถุดิบ</p>
        </div>

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

          <div v-if="mode !== 'reset'">
            <label for="password" class="block text-sm font-medium text-gray-700 mb-2">รหัสผ่าน</label>
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
            {{ submitLabel }}
          </button>

          <div class="text-center space-y-2">
            <button
              v-if="mode !== 'reset'"
              type="button"
              class="text-primary-600 hover:text-primary-700 text-sm font-medium"
              @click="mode = mode === 'signup' ? 'login' : 'signup'"
            >
              {{ mode === 'signup' ? 'มีบัญชีแล้ว? เข้าสู่ระบบ' : 'ยังไม่มีบัญชี? สมัครสมาชิก' }}
            </button>
            <div>
              <button
                type="button"
                class="text-gray-500 hover:text-gray-700 text-sm"
                @click="mode = mode === 'reset' ? 'login' : 'reset'"
              >
                {{ mode === 'reset' ? 'กลับไปเข้าสู่ระบบ' : 'ลืมรหัสผ่าน?' }}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { signIn, signUp, resetPassword } = useAuth()

const email = ref('')
const password = ref('')
const mode = ref<'login' | 'signup' | 'reset'>('login')
const isLoading = ref(false)
const error = ref('')
const info = ref('')

const submitLabel = computed(() => {
  if (isLoading.value) return 'กำลังดำเนินการ...'
  if (mode.value === 'signup') return 'สมัครสมาชิก'
  if (mode.value === 'reset') return 'ส่งลิงก์รีเซ็ตรหัสผ่าน'
  return 'เข้าสู่ระบบ'
})

const handleSubmit = async () => {
  isLoading.value = true
  error.value = ''
  info.value = ''

  try {
    if (mode.value === 'reset') {
      await resetPassword(email.value)
      info.value = 'ส่งลิงก์รีเซ็ตรหัสผ่านไปที่อีเมลแล้ว'
      return
    }

    if (mode.value === 'signup') {
      const data = await signUp(email.value, password.value)
      if (data.session) {
        router.push('/dashboard')
      } else {
        info.value = 'สมัครสมาชิกสำเร็จ! กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี'
      }
      return
    }

    await signIn(email.value, password.value)
    router.push('/dashboard')
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'เกิดข้อผิดพลาด'
  } finally {
    isLoading.value = false
  }
}
</script>
