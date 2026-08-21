import { describe, expect, it } from 'vitest'
import type { Ingredient } from '@/types/models'
import { getPackagingPresetLines, missingPresetLabels } from './packagingPresets'

function pkg(id: string, name: string): Ingredient {
  return {
    id,
    userId: 'u1',
    name,
    unit: 'ใบ',
    pricePerUnit: 1,
    type: 'packaging',
    isActive: true,
    createdAt: '',
    updatedAt: '',
  }
}

describe('missingPresetLabels', () => {
  it('does not warn when standard box packaging exists', () => {
    const packaging = [
      pkg('1', 'กล่องข้าว'),
      pkg('2', 'ช้อนพลาสติก'),
      pkg('3', 'ถุงใส่กล่องข้าว'),
    ]
    expect(missingPresetLabels('box', packaging)).toEqual([])
  })

  it('does not warn for common bag names used with rice boxes', () => {
    const packaging = [
      pkg('1', 'กล่องข้าว'),
      pkg('2', 'ช้อนพลาสติก'),
      pkg('3', 'ถุงร้อน'),
    ]
    expect(missingPresetLabels('box', packaging)).toEqual([])
  })

  it('does not warn when the bag is named simply ถุง', () => {
    const packaging = [pkg('1', 'กล่อง'), pkg('2', 'ช้อน'), pkg('3', 'ถุง')]
    expect(missingPresetLabels('box', packaging)).toEqual([])
  })

  it('does not warn when the standard bag name has extra spaces', () => {
    const packaging = [
      pkg('1', 'กล่องข้าว'),
      pkg('2', 'ช้อนพลาสติก'),
      pkg('3', 'ถุงใส่กล่อง ข้าว'),
    ]
    expect(missingPresetLabels('box', packaging)).toEqual([])
  })

  it('matches a bag that contains both ถุง and กล่อง', () => {
    const packaging = [
      pkg('1', 'กล่องข้าว'),
      pkg('2', 'ช้อนพลาสติก'),
      pkg('3', 'ถุงสำหรับกล่องข้าว'),
    ]
    expect(missingPresetLabels('box', packaging)).toEqual([])
  })

  it('still warns when only a tie bag exists', () => {
    const packaging = [
      pkg('1', 'กล่องข้าว'),
      pkg('2', 'ช้อนพลาสติก'),
      pkg('3', 'ถุงมัด'),
    ]
    expect(missingPresetLabels('box', packaging)).toEqual(['ถุงใส่กล่องข้าว'])
  })

  it('does not treat the rice-box bag as a food box', () => {
    const packaging = [pkg('1', 'ถุงใส่กล่องข้าว'), pkg('2', 'ช้อนพลาสติก')]
    expect(missingPresetLabels('box', packaging)).toEqual(['กล่องข้าว'])
  })
})

describe('getPackagingPresetLines', () => {
  it('assigns each standard item once', () => {
    const packaging = [
      pkg('box', 'กล่องข้าว'),
      pkg('spoon', 'ช้อนพลาสติก'),
      pkg('bag', 'ถุงใส่กล่องข้าว'),
    ]
    const lines = getPackagingPresetLines('box', packaging)
    expect(lines.map((line) => line.ingredientId).sort()).toEqual(['bag', 'box', 'spoon'])
  })

  it('prefers the exact rice-box bag over a generic ถุง', () => {
    const packaging = [pkg('generic', 'ถุง'), pkg('exact', 'ถุงใส่กล่องข้าว'), pkg('box', 'กล่องข้าว'), pkg('spoon', 'ช้อน')]
    const lines = getPackagingPresetLines('box', packaging)
    const bagLine = lines.find((line) => line.name.includes('ถุงใส่กล่องข้าว'))
    expect(bagLine?.ingredientId).toBe('exact')
  })
})
