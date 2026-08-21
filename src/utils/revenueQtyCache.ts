const STORAGE_PREFIX = 'food_cost.revenue.avgDailyQty'

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}:${userId}`
}

function canUseStorage() {
  return typeof localStorage !== 'undefined'
}

export function parseRevenueQtyCache(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}

  const result: Record<string, number> = {}
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    const qty = Number.parseInt(String(value), 10)
    if (id && Number.isFinite(qty) && qty > 0) result[id] = qty
  }
  return result
}

export function loadRevenueQtyCache(userId: string): Record<string, number> {
  if (!userId || !canUseStorage()) return {}
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return {}
    return parseRevenueQtyCache(JSON.parse(raw) as unknown)
  } catch {
    return {}
  }
}

export function saveRevenueQtyCache(userId: string, qtyByMenuId: Record<string, number>) {
  if (!userId || !canUseStorage()) return
  const cleaned = parseRevenueQtyCache(qtyByMenuId)
  try {
    if (Object.keys(cleaned).length === 0) {
      localStorage.removeItem(storageKey(userId))
      return
    }
    localStorage.setItem(storageKey(userId), JSON.stringify(cleaned))
  } catch {
    // Ignore quota / private-mode failures
  }
}

export function clearRevenueQtyCache(userId: string) {
  if (!userId || !canUseStorage()) return
  try {
    localStorage.removeItem(storageKey(userId))
  } catch {
    // Ignore storage failures
  }
}
