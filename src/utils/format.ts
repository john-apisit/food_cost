export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
  }).format(amount)
}

export function formatNumber(amount: number, digits = 2): string {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(amount)
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function saleUnitLabel(type: 'box' | 'bag'): string {
  return type === 'box' ? 'กล่อง' : 'มัดถุง'
}

export function ingredientTypeLabel(type: 'ingredient' | 'packaging'): string {
  return type === 'ingredient' ? 'วัตถุดิบ' : 'บรรจุภัณฑ์'
}
