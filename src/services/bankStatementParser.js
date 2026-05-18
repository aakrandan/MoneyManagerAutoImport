import * as XLSX from 'xlsx'
import { parseStatementDate, formatDateISO } from '../utils/dateUtils'

// ---------------------------------------------------------------------------
// Column header aliases — covers SBI, HDFC, ICICI, Axis, Kotak and generics
// ---------------------------------------------------------------------------

const COL_ALIASES = {
  date: [
    'date', 'txn date', 'transaction date', 'trans date', 'tran date',
    'posting date', 'value date', 'transaction date(dd mm yyyy)',
  ],
  narration: [
    'description', 'narration', 'particulars', 'details', 'remarks',
    'transaction remarks', 'transaction details', 'particulars of transaction',
    'transaction narration', 'chq / ref no. / transaction id',
  ],
  debit: [
    'debit', 'withdrawal', 'withdrawal amt', 'withdrawal amt (dr)',
    'withdrawals', 'dr amount', 'amount (dr)', 'debit amount', 'dr amt',
    'debit amt', 'dr', 'withdrawal amount (inr )', 'debit(inr)',
  ],
  credit: [
    'credit', 'deposit', 'deposit amt', 'deposit amt (cr)',
    'deposits', 'cr amount', 'amount (cr)', 'credit amount', 'cr amt',
    'credit amt', 'cr', 'deposit amount (inr )', 'credit(inr)',
  ],
  balance: [
    'balance', 'closing balance', 'running balance', 'available balance',
    'balance (inr)', 'closing balance (inr)', 'balance (inr )',
  ],
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findColIndex(headers, aliases) {
  for (const alias of aliases) {
    const idx = headers.indexOf(alias)
    if (idx !== -1) return idx
  }
  return -1
}

/**
 * Detect the header row: first row within the first 20 rows that has
 * at least 3 recognisable column names.
 */
function detectHeaderRow(rows) {
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const row = rows[i].map(c => String(c ?? '').toLowerCase().trim())
    let hits = 0
    if (findColIndex(row, COL_ALIASES.date)      !== -1) hits++
    if (findColIndex(row, COL_ALIASES.narration)  !== -1) hits++
    if (findColIndex(row, COL_ALIASES.debit)      !== -1) hits++
    if (findColIndex(row, COL_ALIASES.credit)     !== -1) hits++
    if (findColIndex(row, COL_ALIASES.balance)    !== -1) hits++
    if (hits >= 3) return i
  }
  return -1
}

/**
 * Parse an amount cell. Handles:
 * - Numbers:  33000, 33000.00
 * - Strings:  "33,000.00", "₹33,000", "-", "—", ""
 * Returns null for empty / dash / unparseable cells.
 */
function parseAmt(cell) {
  if (cell === '' || cell == null) return null
  const s = String(cell).replace(/[,\s₹]/g, '').trim()
  if (!s || s === '-' || s === '—' || s === '--') return null
  const n = parseFloat(s)
  return isNaN(n) ? null : Math.abs(n)
}

/**
 * Convert an Excel date serial number or formatted date string to a Date.
 * SheetJS with raw:false returns strings; with cellDates:true it returns Dates.
 */
function parseCell(cell) {
  if (cell instanceof Date) return cell
  return null
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a bank statement XLSX or CSV file into the same transaction format
 * that parsePDF() returns.
 *
 * @param {File} file
 * @returns {Promise<Array>}
 */
export async function parseBankStatement(file) {
  const buffer = await file.arrayBuffer()

  // SheetJS handles both XLSX and CSV automatically
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, raw: false })

  const sheetName = workbook.SheetNames[0]
  if (!sheetName) throw new Error('No sheets found in the file.')

  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false })
  if (!rows.length) throw new Error('The file appears to be empty.')

  const headerRowIdx = detectHeaderRow(rows)
  if (headerRowIdx === -1) {
    throw new Error(
      'Could not detect column headers. Expected columns like: ' +
      'Date, Description/Narration, Debit/Withdrawal, Credit/Deposit, Balance. ' +
      'Please check the file is a bank statement export.'
    )
  }

  const headers = rows[headerRowIdx].map(c => String(c ?? '').toLowerCase().trim())

  const cols = {
    date:      findColIndex(headers, COL_ALIASES.date),
    narration: findColIndex(headers, COL_ALIASES.narration),
    debit:     findColIndex(headers, COL_ALIASES.debit),
    credit:    findColIndex(headers, COL_ALIASES.credit),
    balance:   findColIndex(headers, COL_ALIASES.balance),
  }

  if (cols.date === -1) throw new Error(
    'Could not find a Date column. Found headers: ' + headers.filter(Boolean).join(', ')
  )
  if (cols.narration === -1) throw new Error(
    'Could not find a Description/Narration column. Found headers: ' + headers.filter(Boolean).join(', ')
  )

  // ---------------------------------------------------------------------------
  // Parse rows
  // ---------------------------------------------------------------------------

  const transactions = []

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || !row.some(c => c !== '')) continue   // skip blank rows

    // Date — handle both Date objects (cellDates) and formatted strings
    const rawDateCell = row[cols.date]
    let date = null
    if (rawDateCell instanceof Date && !isNaN(rawDateCell)) {
      date = rawDateCell
    } else {
      date = parseStatementDate(String(rawDateCell ?? '').trim())
    }
    if (!date) continue

    const narration = String(row[cols.narration] ?? '').trim()
    const debit     = cols.debit   !== -1 ? parseAmt(row[cols.debit])   : null
    const credit    = cols.credit  !== -1 ? parseAmt(row[cols.credit])  : null
    const balance   = cols.balance !== -1 ? parseAmt(row[cols.balance]) : null

    // Rows with neither debit nor credit are header repeats / summaries — skip
    if (debit == null && credit == null) continue

    // When a row has both debit and credit (shouldn't happen, but guard it):
    // trust the larger value and treat the other as 0
    const effectiveDebit  = (debit  != null && (credit == null || debit  >= credit)) ? debit  : null
    const effectiveCredit = (credit != null && (debit  == null || credit >  debit))  ? credit : null

    transactions.push({
      date:          formatDateISO(date),
      rawNarration:  narration,
      debit:         effectiveDebit,
      credit:        effectiveCredit,
      incomeExpense: effectiveCredit != null ? 'Income' : 'Expense',
      amount:        effectiveDebit ?? effectiveCredit ?? 0,
    })
  }

  if (!transactions.length) {
    throw new Error(
      'No transactions found in the file. ' +
      'Make sure the file has data rows below the header.'
    )
  }

  return transactions.map((t, i) => ({
    id:            `txn_${String(i + 1).padStart(3, '0')}`,
    date:          t.date,
    rawNarration:  t.rawNarration,
    debit:         t.debit,
    credit:        t.credit,
    note:          '',
    category:      '',
    subcategory:   '',
    incomeExpense: t.incomeExpense,
    amount:        t.amount,
    flagged:       true,
    matchSource:   'none',
    included:      true,
  }))
}
