import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { isDateToken, parseStatementDate, formatDateISO } from '../utils/dateUtils'
import { isAmountToken, parseAmount } from '../utils/stringUtils'

GlobalWorkerOptions.workerSrc = workerSrc

// ---------------------------------------------------------------------------
// Stage 1 — Extract text items from PDF
// ---------------------------------------------------------------------------

async function extractTextItems(pdf) {
  const allItems = []
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const content = await page.getTextContent()
    for (const item of content.items) {
      // Skip TextMarkedContent objects (pdfjs v4/v5 mix) — they have no 'str'
      if (typeof item.str !== 'string') continue
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
// Stage 3 — Shared helpers
// ---------------------------------------------------------------------------

/**
 * Group lines into transaction groups.
 * Each group has a primary (date) line and zero or more continuation lines.
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
      current.continuations.push(line)
    }
  }
  if (current) groups.push(current)
  return groups
}

/**
 * Extract amount tokens from a line working right-to-left.
 * KEY FIX: "-" dash placeholders are skipped (not treated as stop tokens).
 * Stops only when a non-amount, non-date, non-dash token is found after
 * amounts have been collected.
 *
 * Returns: [{value, x}, ...] — rightmost first (index 0 = balance column).
 */
function extractAmountsFromLine(line) {
  const amounts = []
  for (let i = line.length - 1; i >= 0; i--) {
    const text = line[i].text.trim()
    if (isAmountToken(text)) {
      amounts.push({ value: parseAmount(text), x: line[i].x })
    } else if (text === '-' || text === '') {
      continue // skip dash placeholders — keep scanning left
    } else if (isDateToken(text)) {
      continue // skip value-date tokens in the middle of the line
    } else if (amounts.length > 0) {
      break // found text after collecting amounts — stop
    }
  }
  return amounts
}

/**
 * Resolve debit / credit from balance delta across an ordered list of raw rows.
 * Falls back to x-position heuristic for the first row (no prior balance).
 *
 * @param {{ date, narration, balance: number|null, balanceX: number|null,
 *           txnAmounts: [{value,x}] }[]} rows
 */
function resolveDebitCredit(rows) {
  let prevBalance = null

  return rows.map(row => {
    let debit = null
    let credit = null

    if (prevBalance !== null && row.balance !== null) {
      // Primary method: balance delta
      const delta = parseFloat((row.balance - prevBalance).toFixed(2))
      if (delta > 0.005)  credit = delta
      else if (delta < -0.005) debit = Math.abs(delta)
    } else if (row.txnAmounts.length > 0 && row.balanceX != null) {
      // Fallback: x-position relative to balance column
      // Credit columns sit between ~78–95% of balance x.
      // Debit columns sit at ~60–75% of balance x.
      for (const { value, x } of row.txnAmounts) {
        if (x >= row.balanceX * 0.78) credit = value
        else debit = value
      }
    }

    if (row.balance !== null) prevBalance = row.balance

    return {
      date: row.date,
      narration: row.narration,
      debit:  debit  ?? null,
      credit: credit ?? null,
    }
  })
}

// ---------------------------------------------------------------------------
// Stage 3 — Bank adapters
// ---------------------------------------------------------------------------

/**
 * SBI Adapter
 * Statement layout:
 *   [Label line: "WDL TFR" / "CEMTEX DEP ACHCr"]   ← before each date line
 *   [Date line: txnDate | valueDate | - | debit|- | credit|- | balance]
 *   [Narration line(s)]
 *   (repeat)
 *
 * Amounts are on the DATE LINE. Narration is exclusively on continuation lines.
 */
const SbiAdapter = {
  name: 'SBI',

  detect(lines) {
    const flat = lines.flat().map(i => i.text.toUpperCase()).join(' ')
    return flat.includes('STATE BANK OF INDIA')
  },

  parse(lines) {
    const groups = groupTransactionLines(lines)
    const rows = groups.map(g => {
      const { primary, continuations } = g
      const dateStr = primary[0]?.text?.trim()
      const date = parseStatementDate(dateStr)
      if (!date) return null

      const allAmounts = extractAmountsFromLine(primary)
      const balance    = allAmounts[0] ?? null   // rightmost = closing balance
      const txnAmounts = allAmounts.slice(1)     // remaining = debit or credit

      // Narration lives entirely in continuation lines for SBI
      const narration = continuations
        .map(line => line.map(i => i.text).join(' ').trim())
        .filter(Boolean)
        .join(' ')

      return {
        date:      formatDateISO(date),
        narration: narration.trim(),
        balance:   balance?.value ?? null,
        balanceX:  balance?.x ?? null,
        txnAmounts,
      }
    }).filter(Boolean)

    return resolveDebitCredit(rows)
  },
}

/**
 * HDFC Adapter
 * Statement layout:
 *   [Date | narration (inline) | ref# | valueDate | withdrawal | deposit | balance]
 *   [Narration continuation lines]
 */
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
    const groups = groupTransactionLines(lines)
    const rows = groups.map(g => {
      const { primary, continuations } = g
      const dateStr = primary[0]?.text?.trim()
      const date = parseStatementDate(dateStr)
      if (!date) return null

      const allAmounts  = extractAmountsFromLine(primary)
      const balance     = allAmounts[0] ?? null
      const txnAmounts  = allAmounts.slice(1)

      // For HDFC, narration can be embedded in the primary line
      const primaryNarration = extractInlineNarration(primary)
      const contNarration = continuations
        .map(line => line.map(i => i.text).join(' ').trim())
        .filter(Boolean)
        .join(' ')
      const narration = [primaryNarration, contNarration].filter(Boolean).join(' ')

      return {
        date:      formatDateISO(date),
        narration: narration.trim(),
        balance:   balance?.value ?? null,
        balanceX:  balance?.x ?? null,
        txnAmounts,
      }
    }).filter(Boolean)

    return resolveDebitCredit(rows)
  },
}

/**
 * Generic / Fallback Adapter — same logic as HDFC without bank-specific detection.
 */
const GenericAdapter = {
  name: 'Generic',
  detect() { return true },

  parse(lines) {
    const groups = groupTransactionLines(lines)
    const rows = groups.map(g => {
      const { primary, continuations } = g
      const dateStr = primary[0]?.text?.trim()
      const date = parseStatementDate(dateStr)
      if (!date) return null

      const allAmounts = extractAmountsFromLine(primary)
      const balance    = allAmounts[0] ?? null
      const txnAmounts = allAmounts.slice(1)

      const primaryNarration = extractInlineNarration(primary)
      const contNarration = continuations
        .map(line => line.map(i => i.text).join(' ').trim())
        .filter(Boolean)
        .join(' ')
      const narration = [primaryNarration, contNarration].filter(Boolean).join(' ')

      return {
        date:      formatDateISO(date),
        narration: narration.trim(),
        balance:   balance?.value ?? null,
        balanceX:  balance?.x ?? null,
        txnAmounts,
      }
    }).filter(Boolean)

    return resolveDebitCredit(rows)
  },
}

const ADAPTERS = [SbiAdapter, HdfcAdapter, GenericAdapter]

/**
 * Extract narration text embedded in the primary (date) line itself —
 * tokens between the date(s) and the amount columns.
 */
function extractInlineNarration(line) {
  const tokens = []
  let datesSeen = 0
  for (const item of line) {
    const text = item.text.trim()
    if (!text) continue
    if (isDateToken(text)) { datesSeen++; continue }
    if (isAmountToken(text) && datesSeen > 0) break
    if (text === '-') continue
    if (datesSeen > 0) tokens.push(text)
  }
  return tokens.join(' ').replace(/\s+/g, ' ').trim()
}

// ---------------------------------------------------------------------------
// Stage 4 — Finalize
// ---------------------------------------------------------------------------

function finalizeTransactions(rawTxns) {
  return rawTxns
    .filter(t => t.narration || t.debit || t.credit)
    .map((t, i) => ({
      id: `txn_${String(i + 1).padStart(3, '0')}`,
      date: t.date,
      rawNarration: t.narration,
      debit:  t.debit,
      credit: t.credit,
      note: '',
      category: '',
      subcategory: '',
      incomeExpense: t.credit != null ? 'Income' : 'Expense',
      amount: t.debit ?? t.credit ?? 0,
      flagged: true,
      matchSource: 'none',
      included: true,
    }))
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function parsePDF(file) {
  const buffer = await file.arrayBuffer()
  const pdf = await getDocument({ data: buffer }).promise

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
