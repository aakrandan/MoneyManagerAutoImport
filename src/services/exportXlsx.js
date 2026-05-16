import * as XLSX from 'xlsx'
import { formatDateForMM } from '../utils/dateUtils'

/**
 * Money Manager import column order (exact):
 * Date | Account | Category | Subcategory | Note | INR | Income/Expense | Description | Amount | Currency | Account2
 *
 * - Date:         mm/dd/yyyy
 * - Account:      user's account name (e.g. "HDFC Bank")
 * - INR:          amount as a number (same as Amount for INR accounts)
 * - Amount:       same as INR
 * - Currency:     "INR"
 * - Account2:     destination account for transfers (empty for non-transfers)
 */
const COLUMNS = [
  'Date',
  'Account',
  'Category',
  'Subcategory',
  'Note',
  'INR',
  'Income/Expense',
  'Description',
  'Amount',
  'Currency',
  'Account',   // destination / "To Account" — blank for non-transfers
]

function toRow(txn, accountName) {
  const date = formatDateForMM(new Date(txn.date + 'T00:00:00'))
  const amount = txn.amount ?? 0

  return [
    date,
    accountName,
    txn.category === 'REVIEW_NEEDED' ? '' : txn.category,
    txn.subcategory ?? '',
    txn.note ?? '',
    amount,
    txn.incomeExpense,
    txn.rawNarration ?? '',
    amount,
    'INR',
    txn.incomeExpense === 'Transfer-Out' ? accountName : '',
  ]
}

/**
 * Build and trigger download of a .xlsx file in MM import format.
 *
 * @param {Array}  transactions  - already filtered to included-only rows
 * @param {string} accountName   - from settings
 */
export function downloadXlsx(transactions, accountName) {
  const rows = [COLUMNS, ...transactions.map(t => toRow(t, accountName))]

  const ws = XLSX.utils.aoa_to_sheet(rows)

  // Column widths (approximate)
  ws['!cols'] = [
    { wch: 12 }, // Date
    { wch: 14 }, // Account
    { wch: 18 }, // Category
    { wch: 18 }, // Subcategory
    { wch: 20 }, // Note
    { wch: 12 }, // INR
    { wch: 14 }, // Income/Expense
    { wch: 40 }, // Description
    { wch: 12 }, // Amount
    { wch: 8  }, // Currency
    { wch: 14 }, // Account2
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Transactions')

  const today = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `MM_Import_${today}.xlsx`)
}
