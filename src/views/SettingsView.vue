<template>
  <MainLayout>
    <div class="max-w-xl space-y-6">
      <div>
        <h1 class="page-title">ตั้งค่าร้าน</h1>
        <p class="text-gray-500 mt-1">ค่าบริการ LINE MAN และต้นทุนคงที่ต่อหน่วยขาย</p>
      </div>

      <form v-if="form" class="card p-6 space-y-4" @submit.prevent="save">
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
        <button type="submit" class="btn-primary" :disabled="loading">{{ loading ? 'กำลังบันทึก...' : 'บันทึกตั้งค่า' }}</button>
      </form>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { onMounted, reactive, watch } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import { useStoreSettings } from '@/composables/useStoreSettings'
import { useToast } from '@/composables/useToast'

const { settings, loading, fetchSettings, updateSettings } = useStoreSettings()
const { success, error } = useToast()

const form = reactive({
  platformName: 'LINE MAN',
  platformFeePercent: 30,
  fixedCostBox: 5,
  fixedCostBag: 3,
  targetFoodCostPercent: undefined as number | undefined,
  targetMarginPercent: undefined as number | undefined,
})

watch(settings, (value) => {
  if (!value) return
  form.platformName = value.platformName
  form.platformFeePercent = value.platformFeePercent
  form.fixedCostBox = value.fixedCostBox
  form.fixedCostBag = value.fixedCostBag
  form.targetFoodCostPercent = value.targetFoodCostPercent
  form.targetMarginPercent = value.targetMarginPercent
}, { immediate: true })

const save = async () => {
  try {
    await updateSettings({
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
