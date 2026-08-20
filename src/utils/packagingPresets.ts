import type { Ingredient, SaleUnitType } from '@/types/models'

export interface PackagingPreset {
  keywords: string[]
  quantity: number
  label: string
}

export const BOX_PRESETS: PackagingPreset[] = [
  { keywords: ['กล่องข้าว', 'กล่อง'], quantity: 1, label: 'กล่องข้าว' },
  { keywords: ['ช้อนพลาสติก', 'ช้อน'], quantity: 1, label: 'ช้อนพลาสติก' },
  { keywords: ['ถุงใส่กล่อง', 'ถุงกล่อง'], quantity: 1, label: 'ถุงใส่กล่องข้าว' },
]

export const BAG_PRESETS: PackagingPreset[] = [
  { keywords: ['ถุงมัด', 'มัดถุง'], quantity: 1, label: 'ถุงมัด' },
]

export const STANDARD_PACKAGING = [
  { name: 'กล่องข้าว', unit: 'ใบ', category: 'กล่อง', notes: 'ใช้กับเมนูแบบกล่อง' },
  { name: 'ช้อนพลาสติก', unit: 'ชิ้น', category: 'กล่อง', notes: 'ใช้กับเมนูแบบกล่องเท่านั้น' },
  { name: 'ถุงใส่กล่องข้าว', unit: 'ใบ', category: 'กล่อง', notes: 'ใช้กับเมนูแบบกล่อง' },
  { name: 'ถุงมัด', unit: 'ใบ', category: 'มัดถุง', notes: 'ใช้กับเมนูแบบมัดถุง' },
] as const

function matchPackaging(packaging: Ingredient[], preset: PackagingPreset): Ingredient | undefined {
  return packaging.find((item) =>
    preset.keywords.some((keyword) => item.name.includes(keyword)),
  )
}

export function getPackagingPresetLines(
  saleUnitType: SaleUnitType,
  packaging: Ingredient[],
): Array<{ ingredientId: string; quantityPerUnit: number; name: string }> {
  const presets = saleUnitType === 'box' ? BOX_PRESETS : BAG_PRESETS
  return presets
    .map((preset) => {
      const found = matchPackaging(packaging, preset)
      if (!found) return null
      return {
        ingredientId: found.id,
        quantityPerUnit: preset.quantity,
        name: found.name,
      }
    })
    .filter((line): line is NonNullable<typeof line> => line !== null)
}

export function missingPresetLabels(saleUnitType: SaleUnitType, packaging: Ingredient[]): string[] {
  const presets = saleUnitType === 'box' ? BOX_PRESETS : BAG_PRESETS
  return presets
    .filter((preset) => !matchPackaging(packaging, preset))
    .map((preset) => preset.label)
}
