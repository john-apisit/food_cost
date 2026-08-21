import Papa from 'papaparse'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { PurchaseItem } from '@/types/models'
import { groupPurchaseItemsBySupplier, supplierLabel } from '@/composables/usePurchasePlanning'
import { formatCurrency, formatNumber, ingredientTypeLabel } from './format'

type JsPdfWithAutoTable = jsPDF & { lastAutoTable?: { finalY: number } }

export function exportPurchaseListToCsv(items: PurchaseItem[], planName: string, days: number) {
  const groups = groupPurchaseItemsBySupplier(items)
  const rows: Array<Record<string, string | number>> = []

  for (const group of groups) {
    for (const item of group.items) {
      rows.push({
        ซัพพลายเออร์: group.supplier,
        รายการ: item.ingredient.name,
        ประเภท: ingredientTypeLabel(item.ingredient.type),
        ปริมาณรวม: item.totalQuantity,
        หน่วย: item.ingredient.unit,
        'ราคา/หน่วย': item.ingredient.pricePerUnit,
        ราคารวม: item.totalCost,
        ที่มา: item.fromMenus.map((m) => `${m.menuName} (${m.quantity})`).join(', '),
      })
    }
    rows.push({
      ซัพพลายเออร์: group.supplier,
      รายการ: `รวม ${group.supplier}`,
      ประเภท: '',
      ปริมาณรวม: '',
      หน่วย: '',
      'ราคา/หน่วย': '',
      ราคารวม: group.totalCost,
      ที่มา: `${group.items.length} รายการ`,
    })
  }

  const total = items.reduce((sum, item) => sum + item.totalCost, 0)
  rows.push({
    ซัพพลายเออร์: '',
    รายการ: 'รวมงบซื้อทั้งหมด',
    ประเภท: '',
    ปริมาณรวม: '',
    หน่วย: '',
    'ราคา/หน่วย': '',
    ราคารวม: total,
    ที่มา: `${planName} · ${days} วัน`,
  })

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
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' }) as JsPdfWithAutoTable
  const groups = groupPurchaseItemsBySupplier(items)
  const total = items.reduce((sum, item) => sum + item.totalCost, 0)

  doc.setFontSize(16)
  doc.text('Food Cost — Purchase List by Supplier', 14, 16)
  doc.setFontSize(11)
  doc.text(`${planName}  |  ${days} day(s)  |  Total: ${formatCurrency(total)}`, 14, 24)

  let startY = 30

  for (const group of groups) {
    if (startY > 170) {
      doc.addPage()
      startY = 16
    }

    autoTable(doc, {
      startY,
      head: [
        [
          {
            content: `${group.supplier}  ·  ${group.items.length} items  ·  ${formatCurrency(group.totalCost)}`,
            colSpan: 6,
          },
        ],
        ['Item', 'Type', 'Qty', 'Unit', 'Price/unit', 'Total'],
      ],
      body: group.items.map((item) => [
        item.ingredient.name,
        item.ingredient.type === 'ingredient' ? 'Ingredient' : 'Packaging',
        formatNumber(item.totalQuantity, 2),
        item.ingredient.unit,
        formatNumber(item.ingredient.pricePerUnit, 2),
        formatNumber(item.totalCost, 2),
      ]),
      foot: [[`Subtotal · ${supplierLabel(group.supplier)}`, '', '', '', '', formatNumber(group.totalCost, 2)]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [230, 137, 0], cellPadding: 3 },
      footStyles: { fillColor: [253, 231, 197], textColor: [0, 0, 0], fontStyle: 'bold' },
      columnStyles: {
        2: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
      },
    })

    startY = (doc.lastAutoTable?.finalY ?? startY) + 10
  }

  autoTable(doc, {
    startY,
    body: [['Grand total', '', '', '', '', formatNumber(total, 2)]],
    styles: { fontSize: 10, fontStyle: 'bold' },
    theme: 'plain',
    columnStyles: {
      5: { halign: 'right' },
    },
  })

  doc.save(`purchase-plan-${Date.now()}.pdf`)
}
