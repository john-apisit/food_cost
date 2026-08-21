import { afterEach, describe, expect, it } from 'vitest'
import {
  clearRevenueQtyCache,
  loadRevenueQtyCache,
  parseRevenueQtyCache,
  saveRevenueQtyCache,
} from './revenueQtyCache'

function mockLocalStorage() {
  const store = new Map<string, string>()
  const localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
  }
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: localStorage,
  })
  return store
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'localStorage')
})

describe('parseRevenueQtyCache', () => {
  it('keeps positive whole numbers only', () => {
    expect(parseRevenueQtyCache({ a: 10, b: 0, c: -2, d: 3.9, e: '12' })).toEqual({
      a: 10,
      d: 3,
      e: 12,
    })
  })

  it('returns empty for invalid payloads', () => {
    expect(parseRevenueQtyCache(null)).toEqual({})
    expect(parseRevenueQtyCache([])).toEqual({})
    expect(parseRevenueQtyCache('nope')).toEqual({})
  })
})

describe('revenue qty localStorage', () => {
  it('saves, loads, and clears per user', () => {
    mockLocalStorage()
    saveRevenueQtyCache('u1', { m1: 8, m2: 0 })
    expect(loadRevenueQtyCache('u1')).toEqual({ m1: 8 })
    expect(loadRevenueQtyCache('u2')).toEqual({})

    clearRevenueQtyCache('u1')
    expect(loadRevenueQtyCache('u1')).toEqual({})
  })

  it('removes the key when all quantities are cleared', () => {
    const store = mockLocalStorage()
    saveRevenueQtyCache('u1', { m1: 5 })
    saveRevenueQtyCache('u1', {})
    expect(store.size).toBe(0)
  })
})
