import * as pdfjsLib from 'pdfjs-dist'
import { isDateToken, parseStatementDate, formatDateISO } from '../utils/dateUtils'
import { isAmountToken, parseAmount } from '../utils/stringUtils'

// Set worker source for pdfjs v5
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).href

// ---------------------------------------------------------------------------
// Types (JSDoc only — no TypeScript)
// ---------------------------------------------------------------------------
//
// TextItem: { text: string, x: number, y: number }
// Line:     TextItem[]                              (sorted left→right)
// RawTxn:   { date: string, narration: string, debit: number|null, credit: number|null }

// ---------------------------------------------------------------------------
// Stage 1 — Extract text items from PDF
// ---------------------------------------------------------------------------

async function extractTextItems(pdf) {
  const allItems = []
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const content = await page.getTextContent()
    for (const item of content.items) {
      const text = item.str
      if (!text.trim()) continue
      allItems.push({
        text,
        x: Math.round(item.transform[4]),
        y: Math.round(item.transform[5]),
      })
    }
  }
  return allItems
}

// ---------------------------------------------------------------------------
// Stage 2 — Group items into lines by y-coordinate proximity
// ---------------------------------------------------------------------------

function groupIntoLines(items, yThreshold = 3) {
  if (!items.length) return []

  // Sort top-to-bottom (PDF y is bottom-up, so descending y = top-to-bottom)
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x)

  const lines = []
  let current = [sorted[0]]
  let refY = sorted[0].y

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i]
    if (Math.abs(item.y - refY) <= yThreshold) {
      current.push(item)
    } else {
      lines.push(current.slice().sort((a, b) => a.x - b.x))
      current = [item]
      refY = item.y
    }
  }
  if (current.length) lines.push(current.slice().sort((a, b) => a.x - b.x))

  return lines
}

// ---------------------------------------------------------------------------
// Stage 3 — Bank adapters
// ---------------------------------------------------------------------------

/**
 * Adapter interface:
 *   detect(lines: Line[]): boolean
 *   parse(lines: Line[]): RawTxn[]
 */

// --- HDFC Bank Adapter ---
const HdfcAdapter = {
  name: 'HDFC',

  detect(lines) {
    const flat = lines.flat().map(i => i.text.toUpperCase()).join(' ')
    return (
      flat.includes('WITHDRAWAL') &&
      flat.includes('DEPOSIT') &&
      (flat.includes('NARRATION') || flat.includes('HDFC'))
    )
  },

  parse(lines) {
    // Find column x-positions from the header row
    const colX = findColumnPositions(lines, ['WITHDRAWAL', 'DEPOSIT', 'BALANCE'])

    const groups = groupTransactionLines(lines)
    return groups.map(g => parseHdfcGroup(g, colX)).filter(Boolean)
  },
}

// --- Generic / Fallback Adapter ---
const GenericAdapter = {
  name: 'Generic',

  detect() { return true }, // always matches as last resort

  parse(lines) {
    const colX = findColumnPositions(lines, ['DEBIT', 'CREDIT', 'BALANCE'])
    const groups = groupTransactionLines(lines)
    return groups.map(g => parseGenericGroup(g, colX)).filter(Boolean)
  },
}

const ADAPTERS = [HdfcAdapter, GenericAdapter]

// ---------------------------------------------------------------------------
// Helpers shared across adapters
// ---------------------------------------------------------------------------

/**
 * Find x-positions of named column headers in the header row.
 * Returns { [columnName]: xPosition } for each found header.
 */
function findColumnPositions(lines, columnNames) {
  const result = {}
  for (const line of lines) {
    const lineText = line.map(i => i.text.toUpperCase()).join(' ')
    for (const col of columnNames) {
      if (lineText.includes(col)) {
        const match = line.find(i => i.text.toUpperCase().includes(col))
        if (match) result[col] = match.x
      }
    }
    if (Object.keys(result).length >= 2) break
  }
  return result
}

/**
 * Group lines into transaction groups: each group starts with a date line
 * and may have following non-date lines as narration continuations.
 */
function groupTransactionLines(lines) {
  const groups = []
  let current = null

  for (const line of lines) {
    const firstText = line[0]?.text?.trim() ?? ''
    if (isDateToken(firstText)) {
      if (current) groups.push(current)
      current = { primary: line, continuations: [] }
    } else if (current) {
      // Only absorb as continuation if line doesn't look like a page header/footer
      // (simple heuristic: continuation lines have < 6 tokens and no second date token)
      const hasSecondDate = line.slice(1).some(i => isDateToken(i.text.trim()))
      if (!hasSecondDate) {
        current.continuations.push(line)
      }
    }
  }
  if (current) groups.push(current)
  return groups
}

/**
 * From a line's text items, extract amount tokens from the right side.
 * Returns amounts in order right→left (last = balance, second = credit or debit, third = debit or nothing).
 */
function extractAmountsFromLine(line) {
  // Work right-to-left, collecting amount tokens
  const amounts = []
  for (let i = line.length - 1; i >= 0; i--) {
    const text = line[i].text.trim()
    if (isAmountToken(text)) {
      amounts.push({ value: parseAmount(text), x: line[i].x })
    } else {
      // Stop at the first non-amount token from the right that isn't a date
      // (dates appear in the middle as "value date"; keep going past them)
      if (!isDateToken(text) && amounts.length > 0) break
    }
  }
  return amounts // [rightmost=balance, ..., leftmost-of-amounts]
}

/**
 * Extract narration text from a line, excluding the leading date, trailing amounts,
 * and the "value date" (second date token).
 */
function extractNarrationText(line) {
  let datesSeen = 0
  const tokens = []
  for (let i = 0; i < line.length; i++) {
    const text = line[i].text.trim()
    if (!text) continue
    if (isDateToken(text)) {
      datesSeen++
      continue // skip date and value-date tokens
    }
    if (isAmountToken(text)) break // narration ends at first amount from right would be better
    tokens.push(text)
  }
  // Re-join (pdfjs sometimes splits one word into multiple items)
  return tokens.join(' ').replace(/\s+/g, ' ').trim()
}

/**
 * Determine whether an amount is a debit or credit based on x-position
 * relative to known column positions.
 * Falls back to returning the amounts as-is if column positions are unknown.
 */
function classifyAmounts(amountItems, colX, adapterColumns) {
  const [debitKey, creditKey] = adapterColumns
  const debitX = colX[debitKey]
  const creditX = colX[creditKey]

  let debit = null
  let credit = null

  if (debitX != null && creditX != null) {
    for (const { value, x } of amountItems) {
      const distDebit = Math.abs(x - debitX)
      const distCredit = Math.abs(x - creditX)
      if (distDebit < distCredit) {
        debit = value
      } else {
        credit = value
      }
    }
  } else {
    // Fallback: can't tell — mark both null and let categorizer handle it
    if (amountItems.length === 2) {
      debit = amountItems[1].value // second from right
    } else if (amountItems.length >= 3) {
      // right-to-left: [balance, credit-or-zero, debit-or-zero]
      credit = amountItems[1].value
      debit = amountItems[2].value
      if (debit === 0) debit = null
      if (credit === 0) credit = null
    }
  }

  return { debit, credit }
}

// --- HDFC-specific row parser ---
function parseHdfcGroup(group, colX) {
  const { primary, continuations } = group
  const dateStr = primary[0]?.text?.trim()
  const date = parseStatementDate(dateStr)
  if (!date) return null

  // Build full narration: primary line narration + continuation lines
  const primaryNarration = extractNarrationText(primary)
  const contNarration = continuations
    .map(line => line.map(i => i.text).join(' ').trim())
    .filter(Boolean)
    .join(' ')
  const narration = [primaryNarration, contNarration].filter(Boolean).join(' ')

  // Extract amounts from the right of the primary line
  const amountItems = extractAmountsFromLine(primary)
  // amountItems[0] = balance (rightmost), amountItems[1] = credit or debit, amountItems[2] = debit or nothing
  const nonBalance = amountItems.slice(1)

  const { debit, credit } = classifyAmounts(nonBalance, colX, ['WITHDRAWAL', 'DEPOSIT'])

  return {
    date: formatDateISO(date),
    narration: narration.trim(),
    debit: debit || null,
    credit: credit || null,
  }
}

// --- Generic row parser ---
function parseGenericGroup(group, colX) {
  const { primary, continuations } = group
  const dateStr = primary[0]?.text?.trim()
  const date = parseStatementDate(dateStr)
  if (!date) return null

  const primaryNarration = extractNarrationText(primary)
  const contNarration = continuations
    .map(line => line.map(i => i.text).join(' ').trim())
    .filter(Boolean)
    .join(' ')
  const narration = [primaryNarration, contNarration].filter(Boolean).join(' ')

  const amountItems = extractAmountsFromLine(primary)
  const nonBalance = amountItems.slice(1)

  const { debit, credit } = classifyAmounts(nonBalance, colX, ['DEBIT', 'CREDIT'])

  return {
    date: formatDateISO(date),
    narration: narration.trim(),
    debit: debit || null,
    credit: credit || null,
  }
}

// ---------------------------------------------------------------------------
// Stage 4 — Assign unique IDs and final shape
// ---------------------------------------------------------------------------

function finalizeTransactions(rawTxns) {
  return rawTxns
    .filter(t => t.narration || t.debit || t.credit)
    .map((t, i) => ({
      id: `txn_${String(i + 1).padStart(3, '0')}`,
      date: t.date,
      rawNarration: t.narration,
      debit: t.debit,
      credit: t.credit,
      // Categorization fields — filled by categorizer
      note: '',
      category: '',
      subcategory: '',
      incomeExpense: t.credit != null ? 'Income' : 'Expense',
      amount: t.debit ?? t.credit ?? 0,
      flagged: true,
      matchSource: 'none',
      included: true,   // set to false by categorizer for Transfer rows
    }))
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a bank statement PDF file.
 * @param {File} file
 * @returns {Promise<Array>} Array of transaction objects
 */
export async function parsePDF(file) {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise

  const items = await extractTextItems(pdf)
  if (!items.length) throw new Error('No text found in PDF. Is it a scanned/image PDF?')

  const lines = groupIntoLines(items)

  const adapter = ADAPTERS.find(a => a.detect(lines)) ?? GenericAdapter
  const rawTxns = adapter.parse(lines)

  if (!rawTxns.length) {
    throw new Error(
      `No transactions found in PDF (detected format: ${adapter.name}). ` +
      'Please check that the file is a text-based bank statement.'
    )
  }

  return finalizeTransactions(rawTxns)
}
