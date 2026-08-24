import { describe, expect, it } from 'vitest'
import type { Ingredient, MenuItem, PurchaseItem, RoutineItem } from '@/types/models'
import {
  addDaysIso,
  buildKitchenPrepSnapshot,
  buildRunSnapshot,
  buildStockCheckSnapshot,
  currentTimeHm,
  formatTimeRange,
  isRoutineScheduledOn,
  mergeRestockIntoPurchaseItems,
  normalizeTime,
  restockFromRunItems,
  restockPlanName,
  routineWindowStatus,
  runProgress,
  weekdayFromDate,
} from './routines'

const pork: Ingredient = {
  id: 'i1',
  userId: 'u1',
  name: 'หมูสับ',
  unit: 'kg',
  pricePerUnit: 150,
  type: 'ingredient',
  isActive: true,
  createdAt: '',
  updatedAt: '',
}

const cabbage: Ingredient = {
  id: 'i2',
  userId: 'u1',
  name: 'กะหล่ำ',
  unit: 'กำ',
  pricePerUnit: 20,
  type: 'ingredient',
  category: 'ผัก',
  isActive: true,
  createdAt: '',
  updatedAt: '',
}

const box: Ingredient = {
  id: 'p1',
  userId: 'u1',
  name: 'กล่องข้าว',
  unit: 'ใบ',
  pricePerUnit: 4,
  type: 'packaging',
  isActive: true,
  createdAt: '',
  updatedAt: '',
}

function menu(overrides: Partial<MenuItem> = {}): MenuItem {
  return {
    id: 'm1',
    userId: 'u1',
    name: 'กะเพราหมูสับ',
    saleUnitType: 'bag',
    sellingPrice: 50,
    status: 'ready_to_sell',
    prepSteps: ['รวนหมู', 'หุงข้าว'],
    isActive: true,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  }
}

function item(overrides: Partial<RoutineItem> & Pick<RoutineItem, 'title'>): RoutineItem {
  return {
    id: overrides.id ?? overrides.title,
    routineId: 'r1',
    source: 'manual',
    sortOrder: 0,
    createdAt: '',
    ...overrides,
  }
}

describe('normalizeTime / formatTimeRange', () => {
  it('strips seconds and pads hours', () => {
    expect(normalizeTime('9:00:00')).toBe('09:00')
    expect(formatTimeRange('09:00:00', '10:00')).toBe('09:00–10:00')
  })
})

describe('weekdayFromDate', () => {
  it('maps Monday and Friday in local calendar dates', () => {
    expect(weekdayFromDate('2026-08-24')).toBe('mon')
    expect(weekdayFromDate('2026-08-28')).toBe('fri')
    expect(weekdayFromDate('2026-08-23')).toBe('sun')
  })
})

describe('addDaysIso', () => {
  it('moves to the next calendar day', () => {
    expect(addDaysIso('2026-08-24', 1)).toBe('2026-08-25')
  })
})

describe('isRoutineScheduledOn', () => {
  it('requires an active routine on that weekday', () => {
    expect(
      isRoutineScheduledOn({ isActive: true, days: ['mon', 'fri'] }, 'mon'),
    ).toBe(true)
    expect(
      isRoutineScheduledOn({ isActive: true, days: ['mon', 'fri'] }, 'tue'),
    ).toBe(false)
    expect(
      isRoutineScheduledOn({ isActive: false, days: ['mon'] }, 'mon'),
    ).toBe(false)
  })
})

describe('routineWindowStatus', () => {
  it('classifies the window from the current time', () => {
    expect(routineWindowStatus('09:00', '10:00', 'pending', '08:59')).toBe('upcoming')
    expect(routineWindowStatus('09:00', '10:00', 'pending', '09:00')).toBe('active')
    expect(routineWindowStatus('09:00', '10:00', 'in_progress', '10:00')).toBe('active')
    expect(routineWindowStatus('09:00', '10:00', 'pending', '10:01')).toBe('overdue')
    expect(routineWindowStatus('09:00', '10:00', 'done', '10:01')).toBe('done')
    expect(routineWindowStatus('21:00', '22:00', 'skipped', '21:30')).toBe('skipped')
  })
})

describe('currentTimeHm', () => {
  it('formats hours and minutes', () => {
    expect(currentTimeHm(new Date(2026, 7, 24, 9, 5))).toBe('09:05')
  })
})

describe('buildKitchenPrepSnapshot', () => {
  it('keeps manual extras first and merges unique menu prep steps', () => {
    const snapshot = buildKitchenPrepSnapshot(
      [item({ title: 'เปิดเตา', sortOrder: 0 }), item({ title: 'หุงข้าว', sortOrder: 1 })],
      [
        menu(),
        menu({ id: 'm2', name: 'ข้าวผัด', prepSteps: ['หุงข้าว', 'ตีไข่'] }),
        menu({ id: 'm3', name: 'ยกเลิก', status: 'discontinued', prepSteps: ['ไม่ใช้'] }),
      ],
    )
    expect(snapshot.map((row) => row.title)).toEqual(['เปิดเตา', 'หุงข้าว', 'ตีไข่', 'รวนหมู'])
  })
})

describe('buildStockCheckSnapshot', () => {
  it('uses all active ingredients when none are selected', () => {
    const snapshot = buildStockCheckSnapshot([], [pork, cabbage, box])
    expect(snapshot.map((row) => row.sourceId)).toEqual(['i2', 'i1'])
  })

  it('can include packaging and honor a selected subset', () => {
    const withPackaging = buildStockCheckSnapshot([], [pork, box], true)
    expect(withPackaging.map((row) => row.sourceId)).toEqual(['i1', 'p1'])

    const selected = buildStockCheckSnapshot(
      [item({ id: 't1', title: 'กะหล่ำ', source: 'ingredient', sourceId: 'i2', sortOrder: 0 })],
      [pork, cabbage, box],
    )
    expect(selected.map((row) => row.sourceId)).toEqual(['i2'])
  })
})

describe('buildRunSnapshot', () => {
  it('routes by routine kind', () => {
    const custom = buildRunSnapshot(
      {
        kind: 'custom',
        includePackaging: false,
        items: [item({ title: 'ล้างพื้น' })],
      },
      [],
      [],
    )
    expect(custom).toEqual([
      expect.objectContaining({ title: 'ล้างพื้น', source: 'manual' }),
    ])
  })
})

describe('runProgress / restockFromRunItems', () => {
  it('counts stock statuses and collects low/out ingredients', () => {
    const items = [
      {
        id: '1',
        runId: 'run',
        title: 'หมูสับ',
        source: 'ingredient' as const,
        sourceId: 'i1',
        sortOrder: 0,
        isDone: true,
        stockStatus: 'low' as const,
        restockQuantity: 2,
        itemNote: 'เหลือครึ่งกิโล',
        createdAt: '',
      },
      {
        id: '2',
        runId: 'run',
        title: 'กะหล่ำ',
        source: 'ingredient' as const,
        sourceId: 'i2',
        sortOrder: 1,
        isDone: false,
        createdAt: '',
      },
    ]
    expect(runProgress('stock_check', items)).toEqual({ done: 1, total: 2 })
    expect(restockFromRunItems(items, [pork, cabbage])).toEqual([
      {
        ingredient: pork,
        quantity: 2,
        stockStatus: 'low',
        note: 'เหลือครึ่งกิโล',
      },
    ])
  })
})

describe('mergeRestockIntoPurchaseItems', () => {
  it('highlights overlap and inserts extra restock-only items first', () => {
    const calculated: PurchaseItem[] = [
      {
        ingredient: pork,
        totalQuantity: 1,
        totalCost: 150,
        fromMenus: [{ menuName: 'กะเพราหมูสับ', quantity: 1 }],
      },
    ]
    const merged = mergeRestockIntoPurchaseItems(calculated, [
      { ingredient: pork, quantity: 3, stockStatus: 'low', note: 'เหลือน้อย' },
      { ingredient: cabbage, stockStatus: 'out' },
    ])
    expect(merged[0]?.ingredient.id).toBe('i2')
    expect(merged[0]?.needsRestock).toBe(true)
    expect(merged[0]?.totalQuantity).toBe(0)
    expect(merged[1]?.ingredient.id).toBe('i1')
    expect(merged[1]?.totalQuantity).toBe(3)
    expect(merged[1]?.totalCost).toBe(450)
    expect(merged[1]?.fromMenus[0]?.menuName).toBe('เช็คสต็อก · ใกล้หมด')
  })
})

describe('restockPlanName', () => {
  it('is stable per purchase date', () => {
    expect(restockPlanName('2026-08-25')).toBe('ซื้อของจากเช็คสต็อก 2026-08-25')
  })
})
