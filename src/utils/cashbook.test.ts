import { describe, expect, it } from 'vitest'
import type { CashEntry } from '@/types/models'
import {
  defaultCounterpartyFromSupplier,
  defaultIsAsset,
  defaultPaymentMethod,
  estimatePlatformPayout,
  payoutVariance,
  signedCashAmount,
  suggestedPayoutNet,
  suggestedPricePerUnit,
  summarizeCashEntries,
} from './cashbook'

function entry(overrides: Partial<CashEntry> & Pick<CashEntry, 'type' | 'category' | 'amount'>): CashEntry {
  return {
    id: '1',
    userId: 'u',
    occurredAt: '2026-08-10',
    paymentMethod: 'bank_transfer',
    isAsset: false,
    createdAt: '2026-08-10T00:00:00Z',
    updatedAt: '2026-08-10T00:00:00Z',
    ...overrides,
  }
}

describe('suggestedPricePerUnit', () => {
  it('divides amount by quantity', () => {
    expect(suggestedPricePerUnit(450, 2.5)).toBe(180)
  })

  it('returns null when quantity is missing', () => {
    expect(suggestedPricePerUnit(450, 0)).toBeNull()
  })
})

describe('suggestedPayoutNet', () => {
  it('subtracts fee and adds adjustments', () => {
    expect(suggestedPayoutNet(10000, 3000, -200)).toBe(6800)
  })

  it('returns null when no statement numbers are set', () => {
    expect(suggestedPayoutNet()).toBeNull()
  })
})

describe('estimatePlatformPayout', () => {
  it('applies the store platform fee to recorded sales', () => {
    const estimate = estimatePlatformPayout(
      [
        { actualQty: 10, sellingPrice: 80 },
        { actualQty: 5, sellingPrice: 100 },
      ],
      30,
    )
    expect(estimate).toEqual({
      qty: 15,
      gross: 1300,
      fee: 390,
      net: 910,
    })
  })
})

describe('estimatePlatformPayout with promotions', () => {
  it('uses the promo total for promo pieces', () => {
    const estimate = estimatePlatformPayout(
      [{ actualQty: 10, sellingPrice: 20, promoQty: 6, promoRevenue: 100 }],
      30,
    )
    expect(estimate).toEqual({ qty: 10, gross: 180, fee: 54, net: 126 })
  })
})

describe('payoutVariance', () => {
  it('treats a small difference as a match', () => {
    expect(payoutVariance(910, 900).status).toBe('match')
  })

  it('flags a short transfer', () => {
    expect(payoutVariance(700, 910).status).toBe('under')
  })
})

describe('summarizeCashEntries', () => {
  it('keeps asset purchases and owner draws out of operating cash', () => {
    const summary = summarizeCashEntries([
      entry({ type: 'income', category: 'platform_payout', amount: 48200 }),
      entry({ type: 'expense', category: 'ingredient', amount: 18400 }),
      entry({ type: 'expense', category: 'equipment', amount: 8000, isAsset: true }),
      entry({ type: 'transfer', category: 'owner_draw', amount: 2000 }),
    ])
    expect(summary.income).toBe(48200)
    expect(summary.operatingExpense).toBe(18400)
    expect(summary.assetSpend).toBe(8000)
    expect(summary.ownerDraw).toBe(2000)
    expect(summary.operatingCash).toBe(29800)
  })
})

describe('defaults', () => {
  it('uses cash at the market and treats kitchen equipment as an asset', () => {
    expect(defaultPaymentMethod('ingredient')).toBe('cash')
    expect(defaultPaymentMethod('platform_payout')).toBe('bank_transfer')
    expect(defaultIsAsset('equipment')).toBe(true)
    expect(defaultIsAsset('utility')).toBe(false)
  })

  it('defaults the shop name from the selected item supplier', () => {
    expect(defaultCounterpartyFromSupplier('', 'แม็คโคร')).toBe('แม็คโคร')
    expect(defaultCounterpartyFromSupplier('ตลาดนัด', '  แม็คโคร  ')).toBe('แม็คโคร')
    expect(defaultCounterpartyFromSupplier('ตลาดนัด', '   ')).toBe('ตลาดนัด')
    expect(defaultCounterpartyFromSupplier('ตลาดนัด', undefined)).toBe('ตลาดนัด')
  })
})

describe('signedCashAmount', () => {
  it('is positive for income and zero for transfers', () => {
    expect(signedCashAmount({ type: 'income', amount: 100 })).toBe(100)
    expect(signedCashAmount({ type: 'expense', amount: 100 })).toBe(-100)
    expect(signedCashAmount({ type: 'transfer', amount: 100 })).toBe(0)
  })
})
