<template>
  <MainLayout>
    <div class="max-w-3xl space-y-6">
      <div>
        <h1 class="page-title">{{ isEdit ? 'แก้ไขเมนู' : 'เพิ่มเมนู' }}</h1>
        <p class="text-gray-500 mt-1">ใส่สูตรวัตถุดิบ บรรจุภัณฑ์ และเมนูพ่วง — ระบบไม่แปลงหน่วยให้อัตโนมัติ</p>
      </div>

      <form class="card p-6 space-y-5" @submit.prevent="save">
        <div class="grid sm:grid-cols-2 gap-4">
          <div class="sm:col-span-2">
            <label class="block text-sm font-medium mb-1">ชื่อเมนู *</label>
            <input v-model="form.name" required class="input-field w-full" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">ประเภทหน่วยขาย *</label>
            <select v-model="form.saleUnitType" class="input-field w-full" @change="applyPreset">
              <option value="box">กล่อง (ราดข้าว)</option>
              <option value="bag">มัดถุง (กับข้าว)</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">ราคาขาย (บาท) *</label>
            <input v-model.number="form.sellingPrice" type="number" min="0" step="0.01" required class="input-field w-full" />
          </div>
          <div class="sm:col-span-2">
            <label class="block text-sm font-medium mb-1">หมวดหมู่</label>
            <input v-model="form.category" class="input-field w-full" placeholder="เช่น อาหารจานเดียว" />
          </div>
          <div class="sm:col-span-2">
            <label class="block text-sm font-medium mb-1">รูปอาหาร (URL สาธารณะ)</label>
            <input
              v-model="form.imageUrl"
              type="url"
              class="input-field w-full"
              placeholder="https://example.com/pad-kra-pao.jpg"
            />
            <p class="text-xs text-gray-500 mt-1">วางลิงก์รูปที่เปิดได้โดยไม่ต้องล็อกอิน เช่น จาก CDN หรือ hosting</p>
            <MenuImage
              v-if="form.imageUrl"
              class="mt-3 max-w-sm rounded-lg border border-gray-100"
              :src="form.imageUrl"
              :alt="form.name || 'ตัวอย่างรูปเมนู'"
              wrapper-class="aspect-[4/3]"
            />
          </div>
        </div>

        <p v-if="missingLabels.length" class="text-sm text-yellow-800 bg-yellow-50 rounded-lg px-3 py-2">
          ยังไม่พบบรรจุภัณฑ์มาตรฐาน: {{ missingLabels.join(', ') }} —
          <router-link to="/packaging" class="underline">ไปเพิ่มที่หน้าบรรจุภัณฑ์</router-link>
        </p>

        <section class="space-y-4">
          <h2 class="font-semibold">วัตถุดิบในสูตร</h2>
          <div
            v-for="cat in INGREDIENT_CATEGORIES"
            :key="cat"
            class="space-y-3 rounded-lg border border-gray-100 bg-gray-50/60 p-4"
          >
            <h3 class="text-sm font-medium text-gray-700">{{ cat }}</h3>
            <div
              v-for="(line, index) in ingredientLinesByCategory[cat]"
              :key="cat + '-' + index"
              class="flex gap-2"
            >
              <select v-model="line.ingredientId" class="input-field flex-1">
                <option value="">เลือก{{ cat }}...</option>
                <option v-for="item in ingredientsFor(cat)" :key="item.id" :value="item.id">
                  {{ item.name }} ({{ item.unit }})
                </option>
              </select>
              <input
                v-model.number="line.quantityPerUnit"
                type="number"
                min="0"
                step="0.0001"
                class="input-field w-28"
                placeholder="ปริมาณ"
              />
              <button type="button" class="text-red-600 text-sm" @click="removeIngredientLine(cat, index)">
                ลบ
              </button>
            </div>
            <button type="button" class="text-primary-600 text-sm font-medium" @click="addIngredientLine(cat)">
              + {{ cat === 'อื่นๆ' ? 'เพิ่มรายการอื่นๆ' : `เพิ่ม${cat}` }}
            </button>
          </div>
        </section>

        <section class="space-y-3">
          <div class="flex justify-between items-center">
            <h2 class="font-semibold">บรรจุภัณฑ์</h2>
            <button type="button" class="text-sm text-primary-600" @click="applyPreset">ใช้ preset ตามประเภทขาย</button>
          </div>
          <div v-for="(line, index) in packagingLines" :key="'pkg-' + index" class="flex gap-2">
            <select v-model="line.ingredientId" class="input-field flex-1">
              <option value="">เลือกบรรจุภัณฑ์...</option>
              <option v-for="item in packaging" :key="item.id" :value="item.id">
                {{ item.name }} ({{ item.unit }})
              </option>
            </select>
            <input v-model.number="line.quantityPerUnit" type="number" min="0" step="0.0001" class="input-field w-28" />
            <button type="button" class="text-red-600 text-sm" @click="packagingLines.splice(index, 1)">ลบ</button>
          </div>
          <button type="button" class="text-primary-600 text-sm font-medium" @click="packagingLines.push({ ingredientId: '', quantityPerUnit: 1 })">
            + เพิ่มบรรจุภัณฑ์
          </button>
        </section>

        <section class="space-y-3">
          <h2 class="font-semibold">เมนูพ่วง (เช่น ไข่ดาว)</h2>
          <div v-for="(addon, index) in addons" :key="'add-' + index" class="flex gap-2">
            <select v-model="addon.addonMenuItemId" class="input-field flex-1">
              <option value="">เลือกเมนูพ่วง...</option>
              <option v-for="menu in addonOptions" :key="menu.id" :value="menu.id">{{ menu.name }}</option>
            </select>
            <input v-model.number="addon.quantity" type="number" min="0.0001" step="0.0001" class="input-field w-24" />
            <button type="button" class="text-red-600 text-sm" @click="addons.splice(index, 1)">ลบ</button>
          </div>
          <button type="button" class="text-primary-600 text-sm font-medium" @click="addons.push({ addonMenuItemId: '', quantity: 1 })">
            + เพิ่มเมนูพ่วง
          </button>
        </section>

        <div v-if="preview" class="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
          <p>ต้นทุนรวมโดยประมาณ: <strong>{{ formatCurrency(preview.totalCost) }}</strong></p>
          <p>กำไรสุทธิโดยประมาณ: <strong :class="preview.netProfit < 0 ? 'text-red-600' : 'text-green-700'">{{ formatCurrency(preview.netProfit) }}</strong>
            ({{ preview.netMarginPercent.toFixed(1) }}%)</p>
        </div>

        <div class="flex gap-3">
          <button type="submit" class="btn-primary" :disabled="saving">{{ saving ? 'กำลังบันทึก...' : 'บันทึกเมนู' }}</button>
          <router-link to="/menu" class="btn-secondary">ยกเลิก</router-link>
        </div>
      </form>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import MenuImage from '@/components/menu/MenuImage.vue'
import { useIngredients } from '@/composables/useIngredients'
import { useMenu } from '@/composables/useMenu'
import { usePageTitle } from '@/composables/usePageTitle'
import { useStoreSettings } from '@/composables/useStoreSettings'
import { useToast } from '@/composables/useToast'
import { calculateMenuCost } from '@/utils/costCalculator'
import { getPackagingPresetLines, missingPresetLabels } from '@/utils/packagingPresets'
import { formatCurrency } from '@/utils/format'
import {
  INGREDIENT_CATEGORIES,
  isOtherIngredientCategory,
  type IngredientCategory,
  type MenuItem,
  type SaleUnitType,
} from '@/types/models'

type RecipeLineDraft = { ingredientId: string; quantityPerUnit: number }

const emptyGroupedLines = (): Record<IngredientCategory, RecipeLineDraft[]> => ({
  เนื้อสัตว์: [],
  ผัก: [],
  เครื่องปรุง: [],
  อื่นๆ: [],
})

const categoryOf = (category?: string): IngredientCategory =>
  isOtherIngredientCategory(category) ? 'อื่นๆ' : (category as IngredientCategory)

const route = useRoute()
const router = useRouter()
const { ingredients, fetchIngredients } = useIngredients()
const { menuItems, fetchMenuItems, fetchMenuItemById, createMenuItem, updateMenuItem } = useMenu()
const { settings, fetchSettings } = useStoreSettings()
const { success, error } = useToast()

const isEdit = computed(() => Boolean(route.params.id))
const saving = ref(false)
const appliedPreset = ref(false)

const form = reactive({
  name: '',
  saleUnitType: 'box' as SaleUnitType,
  sellingPrice: 0,
  category: '',
  imageUrl: '',
})

usePageTitle(
  computed(() => {
    if (!isEdit.value) return 'เพิ่มเมนู'
    const name = form.name.trim()
    return name ? `แก้ไข ${name}` : 'แก้ไขเมนู'
  }),
)

const ingredientLinesByCategory = ref(emptyGroupedLines())
const packagingLines = ref<RecipeLineDraft[]>([])
const addons = ref<Array<{ addonMenuItemId: string; quantity: number }>>([])

const foodIngredients = computed(() => ingredients.value.filter((i) => i.type === 'ingredient'))
const allIngredientLines = computed(() =>
  INGREDIENT_CATEGORIES.flatMap((cat) => ingredientLinesByCategory.value[cat]),
)
const ingredientsFor = (cat: IngredientCategory) =>
  foodIngredients.value.filter((i) => categoryOf(i.category) === cat)

const addIngredientLine = (cat: IngredientCategory) => {
  ingredientLinesByCategory.value[cat].push({ ingredientId: '', quantityPerUnit: 0 })
}

const removeIngredientLine = (cat: IngredientCategory, index: number) => {
  ingredientLinesByCategory.value[cat].splice(index, 1)
}
const packaging = computed(() => ingredients.value.filter((i) => i.type === 'packaging'))
const addonOptions = computed(() =>
  menuItems.value.filter((m) => m.id !== route.params.id),
)
const missingLabels = computed(() => missingPresetLabels(form.saleUnitType, packaging.value))

const applyPreset = () => {
  const lines = getPackagingPresetLines(form.saleUnitType, packaging.value)
  if (lines.length) {
    packagingLines.value = lines.map((line) => ({
      ingredientId: line.ingredientId,
      quantityPerUnit: line.quantityPerUnit,
    }))
    appliedPreset.value = true
  }
}

const preview = computed(() => {
  if (!settings.value) return null
  const draft: MenuItem = {
    id: 'draft',
    userId: '',
    name: form.name || 'draft',
    saleUnitType: form.saleUnitType,
    sellingPrice: form.sellingPrice || 0,
    isActive: true,
    createdAt: '',
    updatedAt: '',
    recipeLines: [...allIngredientLines.value, ...packagingLines.value]
      .filter((l) => l.ingredientId && l.quantityPerUnit > 0)
      .map((l, i) => ({
        id: String(i),
        menuItemId: 'draft',
        ingredientId: l.ingredientId,
        quantityPerUnit: l.quantityPerUnit,
        createdAt: '',
      })),
    addons: addons.value
      .filter((a) => a.addonMenuItemId)
      .map((a, i) => ({
        id: String(i),
        menuItemId: 'draft',
        addonMenuItemId: a.addonMenuItemId,
        quantity: a.quantity,
        createdAt: '',
      })),
  }
  try {
    return calculateMenuCost(draft, settings.value, ingredients.value, menuItems.value)
  } catch {
    return null
  }
})

const save = async () => {
  saving.value = true
  try {
    const payload = {
      name: form.name,
      saleUnitType: form.saleUnitType,
      sellingPrice: form.sellingPrice,
      category: form.category || undefined,
      imageUrl: form.imageUrl.trim() || undefined,
      recipeLines: [...allIngredientLines.value, ...packagingLines.value].filter(
        (l) => l.ingredientId && l.quantityPerUnit > 0,
      ),
      addons: addons.value.filter((a) => a.addonMenuItemId && a.quantity > 0),
    }
    if (isEdit.value) {
      await updateMenuItem(String(route.params.id), payload)
      success('บันทึกเมนูแล้ว')
    } else {
      const created = await createMenuItem(payload)
      success('สร้างเมนูแล้ว')
      if (created) {
        await router.replace(`/menu/${created.id}/edit`)
      }
    }
  } catch (e: unknown) {
    error(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
  } finally {
    saving.value = false
  }
}

watch(
  () => packaging.value.length,
  () => {
    if (!isEdit.value && !appliedPreset.value && packaging.value.length) applyPreset()
  },
)

onMounted(async () => {
  await Promise.all([fetchIngredients(), fetchMenuItems(), fetchSettings()])
  if (isEdit.value) {
    const menu = await fetchMenuItemById(String(route.params.id))
    form.name = menu.name
    form.saleUnitType = menu.saleUnitType
    form.sellingPrice = menu.sellingPrice
    form.category = menu.category || ''
    form.imageUrl = menu.imageUrl || ''
    const grouped = emptyGroupedLines()
    for (const line of menu.recipeLines || []) {
      if (line.ingredient?.type === 'packaging') continue
      grouped[categoryOf(line.ingredient?.category)].push({
        ingredientId: line.ingredientId,
        quantityPerUnit: line.quantityPerUnit,
      })
    }
    ingredientLinesByCategory.value = grouped
    packagingLines.value = (menu.recipeLines || [])
      .filter((l) => l.ingredient?.type === 'packaging')
      .map((l) => ({ ingredientId: l.ingredientId, quantityPerUnit: l.quantityPerUnit }))
    addons.value = (menu.addons || []).map((a) => ({
      addonMenuItemId: a.addonMenuItemId,
      quantity: a.quantity,
    }))
    appliedPreset.value = true
  }
})
</script>
