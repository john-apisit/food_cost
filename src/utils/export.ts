import Papa from 'papaparse'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { PurchaseItem } from '@/types/models'
import { formatCurrency, formatNumber, ingredientTypeLabel } from './format'

export function exportPurchaseListToCsv(items: PurchaseItem[], planName: string, days: number) {
  const rows = items.map((item) => ({
    รายการ: item.ingredient.name,
    ประเภท: ingredientTypeLabel(item.ingredient.type),
    หน่วย: item.ingredient.unit,
    ปริมาณรวม: item.totalQuantity,
    'ราคา/หน่วย': item.ingredient.pricePerUnit,
    ราคารวม: item.totalCost,
    ที่มา: item.fromMenus.map((m) => `${m.menuName} (${m.quantity})`).join(', '),
  }))

  const total = items.reduce((sum, item) => sum + item.totalCost, 0)
  rows.push({
    รายการ: 'รวมงบซื้อทั้งหมด',
    ประเภท: '',
    หน่วย: '',
    ปริมาณรวม: '',
    'ราคา/หน่วย': '',
    ราคารวม: total,
    ที่มา: `${planName} · ${days} วัน`,
  } as never)

  const csv = Papa.unparse(rows)
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `purchase-plan-${Date.now()}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export function exportPurchaseListToPdf(items: PurchaseItem[], planName: string, days: number) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const total = items.reduce((sum, item) => sum + item.totalCost, 0)

  doc.setFontSize(16)
  doc.text('Food Cost — Purchase List', 14, 16)
  doc.setFontSize(11)
  doc.text(`${planName}  |  ${days} day(s)  |  Total: ${formatCurrency(total)}`, 14, 24)

  autoTable(doc, {
    startY: 30,
    head: [['Item', 'Type', 'Unit', 'Qty', 'Price/unit', 'Total']],
    body: items.map((item) => [
      item.ingredient.name,
      item.ingredient.type === 'ingredient' ? 'Ingredient' : 'Packaging',
      item.ingredient.unit,
      formatNumber(item.totalQuantity, 2),
      formatNumber(item.ingredient.pricePerUnit, 2),
      formatNumber(item.totalCost, 2),
    ]),
    foot: [['Total', '', '', '', '', formatNumber(total, 2)]],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [230, 137, 0] },
    footStyles: { fillColor: [253, 231, 197], textColor: [0, 0, 0], fontStyle: 'bold' },
  })

  doc.save(`purchase-plan-${Date.now()}.pdf`)
}
