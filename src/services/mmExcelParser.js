import * as XLSX from 'xlsx'
import { normalizeNarration, extractKeyword } from '../utils/stringUtils'

// ---------------------------------------------------------------------------
// Column header aliases
// MM exports may use slightly different header names across versions.
// ---------------------------------------------------------------------------

const COL_ALIASES = {
  description: ['description', 'narration', 'particulars', 'details', 'remarks'],
  note:        ['note', 'notes', 'memo', 'comment'],
  category:    ['category', 'cat'],
  subcategory: ['subcategory', 'sub category', 'sub-category', 'subcat'],
  incomeExpense: ['income/expense', 'type', 'transaction type', 'inc/exp'],
  amount:      ['amount', 'inr', 'value'],
}

/**
 * Find the index of a column given a list of known aliases.
 * Headers array should already be lowercased + trimmed.
 */
function findColIndex(headers, aliases) {
  for (const alias of aliases) {
    const idx = headers.indexOf(alias)
    if (idx !== -1) return idx
  }
  return -1
}

/**
 * Detect the header row index in a 2-D array of raw cell values.
 * Returns the index of the first row that contains recognizable column names.
 */
function detectHeaderRow(rows) {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i].map(c => String(c ?? '').toLowerCase().trim())
    const hasCategory = findColIndex(row, COL_ALIASES.category) !== -1
    const hasAmount   = findColIndex(row, COL_ALIASES.amount) !== -1
    if (hasCategory && hasAmount) return i
  }
  return -1
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a Money Manager export .xlsx file and return an array of
 * Pattern Library entries.
 *
 * @param {File} file
 * @returns {Promise<Array>} pattern entries
 */
export async function parseMMExport(file) {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })

  const sheetName = workbook.SheetNames[0]
  if (!sheetName) throw new Error('No sheets found in the uploaded file.')

  const sheet = workbook.Sheets[sheetName]

  // Read as 2-D array; defval keeps empty cells as '' rather than undefined
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
  if (!rows.length) throw new Error('The uploaded file appears to be empty.')

  const headerRowIdx = detectHeaderRow(rows)
  if (headerRowIdx === -1) {
    throw new Error(
      'Could not detect column headers in the file. ' +
      'Expected columns: Category, Amount, Description (or similar).'
    )
  }

  const headers = rows[headerRowIdx].map(c => String(c).toLowerCase().trim())

  // Map column aliases to indices
  const cols = {
    description:   findColIndex(headers, COL_ALIASES.description),
    note:          findColIndex(headers, COL_ALIASES.note),
    category:      findColIndex(headers, COL_ALIASES.category),
    subcategory:   findColIndex(headers, COL_ALIASES.subcategory),
    incomeExpense: findColIndex(headers, COL_ALIASES.incomeExpense),
    amount:        findColIndex(headers, COL_ALIASES.amount),
  }

  if (cols.category === -1) {
    throw new Error('Required column "Category" not found in the file.')
  }

  const patterns = []
  const seenKeywords = new Set()

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || !row.some(c => c !== '')) continue // skip blank rows

    const category    = String(row[cols.category]    ?? '').trim()
    const subcategory = String(row[cols.subcategory] ?? '').trim()
    const note        = cols.note !== -1 ? String(row[cols.note] ?? '').trim() : ''
    const description = cols.description !== -1 ? String(row[cols.description] ?? '').trim() : ''
    const incomeExpense = cols.incomeExpense !== -1
      ? normalizeIncomeExpense(String(row[cols.incomeExpense] ?? ''))
      : inferIncomeExpense(row[cols.amount])

    if (!category) continue

    // Build a keyword from description; fall back to note if description is absent
    const keywordSource = description || note
    if (!keywordSource) continue
    const keyword = extractKeyword(keywordSource)
    if (!keyword || keyword.length < 2) continue

    // Use uppercased keyword as dedup key
    const key = keyword.toUpperCase()
    if (seenKeywords.has(key)) continue
    seenKeywords.add(key)

    patterns.push({
      keyword,
      category,
      subcategory,
      note,
      incomeExpense,
      confidence: 1.0,
      source: 'mm_export',
    })
  }

  if (!patterns.length) {
    throw new Error(
      'No usable patterns found. Make sure the file has Description and Category columns with data.'
    )
  }

  return patterns
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalize the Income/Expense column value to our internal strings.
 */
function normalizeIncomeExpense(raw) {
  const s = raw.toLowerCase().trim()
  if (s.includes('income') || s === 'cr' || s === 'credit') return 'Income'
  if (s.includes('transfer')) return 'Transfer-Out'
  return 'Expense'
}

/**
 * Infer Income/Expense from the sign or format of the amount cell
 * when there is no explicit type column.
 */
function inferIncomeExpense(amountCell) {
  if (amountCell === '' || amountCell == null) return 'Expense'
  const n = parseFloat(String(amountCell).replace(/[^0-9.\-]/g, ''))
  if (isNaN(n)) return 'Expense'
  return n >= 0 ? 'Income' : 'Expense'
}
