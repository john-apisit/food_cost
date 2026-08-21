<template>
  <MainLayout>
    <div class="max-w-2xl space-y-6">
      <div>
        <h1 class="page-title">ตั้งค่าร้าน</h1>
        <p class="text-gray-500 mt-1">ข้อมูลร้าน ค่าบริการ LINE MAN และต้นทุนคงที่ต่อหน่วยขาย</p>
      </div>

      <form v-if="form" class="space-y-6" @submit.prevent="save">
        <section class="card p-6 space-y-4">
          <h2 class="font-semibold text-lg">ข้อมูลร้าน</h2>

          <div>
            <label class="block text-sm font-medium mb-1">ชื่อร้าน</label>
            <input v-model="form.storeName" class="input-field w-full" placeholder="เช่น ร้านครัวคุณแม่" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">รายละเอียดร้าน</label>
            <textarea
              v-model="form.storeDescription"
              rows="3"
              class="input-field w-full"
              placeholder="เช่น อาหารตามสั่ง รสชาติบ้าน ๆ จานใหญ่ ราคาประหยัด"
            ></textarea>
          </div>

          <div class="grid sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-1">Logo (URL)</label>
              <input
                v-model="form.logoUrl"
                type="url"
                class="input-field w-full"
                placeholder="https://example.com/logo.png"
              />
              <img
                v-if="form.logoUrl"
                :src="form.logoUrl"
                alt="ตัวอย่างโลโก้"
                class="mt-3 h-24 w-24 rounded-lg border border-gray-100 object-contain bg-white"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Banner (URL)</label>
              <input
                v-model="form.bannerUrl"
                type="url"
                class="input-field w-full"
                placeholder="https://example.com/banner.jpg"
              />
              <img
                v-if="form.bannerUrl"
                :src="form.bannerUrl"
                alt="ตัวอย่างแบนเนอร์"
                class="mt-3 h-24 w-full rounded-lg border border-gray-100 object-cover bg-gray-50"
              />
            </div>
          </div>

          <div class="grid sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-1">เวลาเปิด</label>
              <input v-model="form.openTime" type="time" class="input-field w-full" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">เวลาปิด</label>
              <input v-model="form.closeTime" type="time" class="input-field w-full" />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">วันที่เปิด</label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="day in WEEKDAYS"
                :key="day"
                type="button"
                class="min-w-[3.25rem] px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors"
                :class="form.openDays.includes(day)
                  ? 'bg-primary-500 text-white border-primary-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-primary-300'"
                @click="toggleDay(day)"
              >
                {{ WEEKDAY_LABELS[day] }}
              </button>
            </div>
            <p class="text-xs text-gray-500 mt-1">เลือกวันที่ร้านเปิด เช่น จันทร์–ศุกร์</p>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">ที่อยู่</label>
            <textarea
              v-model="form.address"
              rows="3"
              class="input-field w-full"
              placeholder="บ้านเลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด"
            ></textarea>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">เบอร์ติดต่อ</label>
            <input v-model="form.phone" type="tel" class="input-field w-full" placeholder="เช่น 081-234-5678" />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">พิกัด (Google Maps)</label>
            <input
              v-model="form.googleMapUrl"
              class="input-field w-full"
              placeholder="วางลิงก์ Google Maps หรือพิกัด เช่น 13.75,100.50"
            />
            <p class="text-xs text-gray-500 mt-1">
              วางลิงก์จากปุ่มแชร์ใน Google Maps — แผนที่จะอัปเดตทันทีเมื่อวางลิงก์
            </p>
            <div v-if="mapEmbedUrl" class="mt-3 overflow-hidden rounded-lg border border-gray-100">
              <iframe
                :key="mapEmbedUrl"
                :src="mapEmbedUrl"
                title="แผนที่ร้าน"
                class="w-full h-64 border-0"
                loading="lazy"
                referrerpolicy="no-referrer-when-downgrade"
                allowfullscreen
              ></iframe>
            </div>
          </div>
        </section>

        <section class="card p-6 space-y-4">
          <h2 class="font-semibold text-lg">ค่าบริการและต้นทุน</h2>
          <div>
            <label class="block text-sm font-medium mb-1">ชื่อแพลตฟอร์ม</label>
            <input v-model="form.platformName" class="input-field w-full" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">ค่าบริการแพลตฟอร์ม (%)</label>
            <input v-model.number="form.platformFeePercent" type="number" min="0" max="99" step="0.01" class="input-field w-full" />
            <p class="text-xs text-gray-500 mt-1">ค่าเริ่มต้น LINE MAN = 30% คิดจากราคาขายเต็ม</p>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-1">ต้นทุนคงที่ต่อกล่อง (บาท)</label>
              <input v-model.number="form.fixedCostBox" type="number" min="0" step="0.01" class="input-field w-full" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">ต้นทุนคงที่ต่อมัดถุง (บาท)</label>
              <input v-model.number="form.fixedCostBag" type="number" min="0" step="0.01" class="input-field w-full" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-1">เป้า Food Cost % (สูงสุด)</label>
              <input v-model.number="form.targetFoodCostPercent" type="number" min="0" max="100" step="0.1" class="input-field w-full" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">เป้า Net Margin % (ต่ำสุด)</label>
              <input v-model.number="form.targetMarginPercent" type="number" min="0" max="99" step="0.1" class="input-field w-full" />
            </div>
          </div>
        </section>

        <button type="submit" class="btn-primary" :disabled="loading">{{ loading ? 'กำลังบันทึก...' : 'บันทึกตั้งค่า' }}</button>
      </form>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, watch } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import { useStoreSettings } from '@/composables/useStoreSettings'
import { useToast } from '@/composables/useToast'
import { WEEKDAY_LABELS, WEEKDAYS, type Weekday } from '@/types/models'
import { googleMapsEmbedUrl } from '@/utils/googleMaps'

const { settings, loading, fetchSettings, updateSettings } = useStoreSettings()
const { success, error } = useToast()

const form = reactive({
  storeName: '',
  storeDescription: '',
  logoUrl: '',
  bannerUrl: '',
  openTime: '',
  closeTime: '',
  openDays: [] as Weekday[],
  googleMapUrl: '',
  address: '',
  phone: '',
  platformName: 'LINE MAN',
  platformFeePercent: 30,
  fixedCostBox: 5,
  fixedCostBag: 3,
  targetFoodCostPercent: undefined as number | undefined,
  targetMarginPercent: undefined as number | undefined,
})

const mapEmbedUrl = computed(() => googleMapsEmbedUrl(form.googleMapUrl))

watch(settings, (value) => {
  if (!value) return
  form.storeName = value.storeName || ''
  form.storeDescription = value.storeDescription || ''
  form.logoUrl = value.logoUrl || ''
  form.bannerUrl = value.bannerUrl || ''
  form.openTime = value.openTime || ''
  form.closeTime = value.closeTime || ''
  form.openDays = [...value.openDays]
  form.googleMapUrl = value.googleMapUrl || ''
  form.address = value.address || ''
  form.phone = value.phone || ''
  form.platformName = value.platformName
  form.platformFeePercent = value.platformFeePercent
  form.fixedCostBox = value.fixedCostBox
  form.fixedCostBag = value.fixedCostBag
  form.targetFoodCostPercent = value.targetFoodCostPercent
  form.targetMarginPercent = value.targetMarginPercent
}, { immediate: true })

const toggleDay = (day: Weekday) => {
  const index = form.openDays.indexOf(day)
  if (index >= 0) form.openDays.splice(index, 1)
  else form.openDays.push(day)
}

const save = async () => {
  try {
    await updateSettings({
      storeName: form.storeName,
      storeDescription: form.storeDescription,
      logoUrl: form.logoUrl,
      bannerUrl: form.bannerUrl,
      openTime: form.openTime,
      closeTime: form.closeTime,
      openDays: WEEKDAYS.filter((day) => form.openDays.includes(day)),
      googleMapUrl: form.googleMapUrl,
      address: form.address,
      phone: form.phone,
      platformName: form.platformName,
      platformFeePercent: form.platformFeePercent,
      fixedCostBox: form.fixedCostBox,
      fixedCostBag: form.fixedCostBag,
      targetFoodCostPercent: Number.isFinite(form.targetFoodCostPercent) ? form.targetFoodCostPercent : undefined,
      targetMarginPercent: Number.isFinite(form.targetMarginPercent) ? form.targetMarginPercent : undefined,
    })
    success('บันทึกตั้งค่าแล้ว')
  } catch (e: unknown) {
    error(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
  }
}

onMounted(() => fetchSettings())
</script>
