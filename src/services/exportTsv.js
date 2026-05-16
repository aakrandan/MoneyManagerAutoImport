import { formatDateForMM } from '../utils/dateUtils'

const HEADERS = [
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
  'Account',
]

function escapeTsv(value) {
  const s = String(value ?? '')
  // If the value contains tabs or newlines, wrap in quotes
  if (s.includes('\t') || s.includes('\n') || s.includes('"')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function toRow(txn, accountName) {
  const date   = formatDateForMM(new Date(txn.date + 'T00:00:00'))
  const amount = txn.amount ?? 0

  const fields = [
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

  return fields.map(escapeTsv).join('\t')
}

/**
 * Build and trigger download of a .tsv file in MM import format.
 *
 * @param {Array}  transactions  - already filtered to included-only rows
 * @param {string} accountName   - from settings
 */
export function downloadTsv(transactions, accountName) {
  const lines = [
    HEADERS.join('\t'),
    ...transactions.map(t => toRow(t, accountName)),
  ]

  const content = lines.join('\n')
  const blob = new Blob([content], { type: 'text/tab-separated-values;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const today = new Date().toISOString().slice(0, 10)
  const a = document.createElement('a')
  a.href = url
  a.download = `MM_Import_${today}.tsv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
