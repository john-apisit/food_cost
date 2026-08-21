import type { Ingredient, SaleUnitType } from '@/types/models'

export interface PackagingPreset {
  keywords: string[]
  quantity: number
  label: string
  exclude?: string[]
  requireAll?: string[]
}

export const BOX_PRESETS: PackagingPreset[] = [
  { keywords: ['กล่องข้าว', 'กล่อง'], exclude: ['ถุง'], quantity: 1, label: 'กล่องข้าว' },
  { keywords: ['ช้อนพลาสติก', 'ช้อน'], quantity: 1, label: 'ช้อนพลาสติก' },
  {
    keywords: [
      'ถุงใส่กล่องข้าว',
      'ถุงใส่กล่อง',
      'ถุงกล่อง',
      'ถุงร้อน',
      'ถุงพลาสติก',
      'ถุงหูหิ้ว',
      'ถุงใส',
      'ถุง',
    ],
    exclude: ['ถุงมัด', 'มัดถุง'],
    requireAll: ['ถุง', 'กล่อง'],
    quantity: 1,
    label: 'ถุงใส่กล่องข้าว',
  },
]

export const BAG_PRESETS: PackagingPreset[] = [
  {
    keywords: ['ถุงมัด', 'มัดถุง', 'ถุง'],
    exclude: ['กล่อง'],
    quantity: 1,
    label: 'ถุงมัด',
  },
]

export const STANDARD_PACKAGING = [
  { name: 'กล่องข้าว', unit: 'ใบ', category: 'กล่อง', notes: 'ใช้กับเมนูแบบกล่อง' },
  { name: 'ช้อนพลาสติก', unit: 'ชิ้น', category: 'กล่อง', notes: 'ใช้กับเมนูแบบกล่องเท่านั้น' },
  { name: 'ถุงใส่กล่องข้าว', unit: 'ใบ', category: 'กล่อง', notes: 'ใช้กับเมนูแบบกล่อง' },
  { name: 'ถุงมัด', unit: 'ใบ', category: 'มัดถุง', notes: 'ใช้กับเมนูแบบมัดถุง' },
] as const

function normalizeName(name: string): string {
  return name.normalize('NFC').trim().replace(/\s+/g, '')
}

function matchScore(itemName: string, preset: PackagingPreset): number {
  const name = normalizeName(itemName)
  if (!name) return 0
  if (preset.exclude?.some((part) => name.includes(normalizeName(part)))) return 0

  const label = normalizeName(preset.label)
  if (name === label) return 1000
  if (name.includes(label)) return 500 + label.length

  let score = 0
  for (const keyword of preset.keywords) {
    const key = normalizeName(keyword)
    if (key && name.includes(key)) score = Math.max(score, 100 + key.length)
  }
  if (
    score === 0 &&
    preset.requireAll?.length &&
    preset.requireAll.every((part) => name.includes(normalizeName(part)))
  ) {
    return 80
  }
  return score
}

function assignPresets(
  presets: PackagingPreset[],
  packaging: Ingredient[],
): Map<number, Ingredient> {
  const pairs: Array<{ presetIndex: number; item: Ingredient; score: number }> = []
  presets.forEach((preset, presetIndex) => {
    for (const item of packaging) {
      const score = matchScore(item.name, preset)
      if (score > 0) pairs.push({ presetIndex, item, score })
    }
  })

  pairs.sort((a, b) => b.score - a.score || a.presetIndex - b.presetIndex)

  const assigned = new Map<number, Ingredient>()
  const usedItems = new Set<string>()
  for (const pair of pairs) {
    if (assigned.has(pair.presetIndex) || usedItems.has(pair.item.id)) continue
    assigned.set(pair.presetIndex, pair.item)
    usedItems.add(pair.item.id)
  }
  return assigned
}

function presetsFor(saleUnitType: SaleUnitType): PackagingPreset[] {
  return saleUnitType === 'box' ? BOX_PRESETS : BAG_PRESETS
}

export function getPackagingPresetLines(
  saleUnitType: SaleUnitType,
  packaging: Ingredient[],
): Array<{ ingredientId: string; quantityPerUnit: number; name: string }> {
  const presets = presetsFor(saleUnitType)
  const assigned = assignPresets(presets, packaging)
  return presets.flatMap((preset, index) => {
    const found = assigned.get(index)
    if (!found) return []
    return [{
      ingredientId: found.id,
      quantityPerUnit: preset.quantity,
      name: found.name,
    }]
  })
}

export function missingPresetLabels(saleUnitType: SaleUnitType, packaging: Ingredient[]): string[] {
  const presets = presetsFor(saleUnitType)
  const assigned = assignPresets(presets, packaging)
  return presets.filter((_, index) => !assigned.has(index)).map((preset) => preset.label)
}
