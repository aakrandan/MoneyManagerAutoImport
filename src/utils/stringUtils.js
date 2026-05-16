// Prefixes to strip before keyword matching
const STRIP_PREFIXES = [
  /^UPI[\/\-:]/i,
  /^IMPS[\/\-:]/i,
  /^NEFT[\/\-:]/i,
  /^RTGS[\/\-:]/i,
  /^ACH[\/\-:]/i,
  /^NACH[\/\-:]/i,
  /^CMS[\/\-:]/i,
  /^POS\s+/i,
  /^MMT[\/\-:]/i,   // MobiKwik / money transfer
  /^BIL[\/\-:]/i,   // Bill payment prefix
  /^INT[\/\-:]/i,   // Interest
]

// Long numeric runs (transaction IDs, account numbers ≥ 6 digits)
const LONG_NUM_RE = /\b\d{6,}\b/g

// Trailing/leading non-alphanumeric
const EDGE_JUNK_RE = /^[\s\-_\/]+|[\s\-_\/]+$/g

/**
 * Normalize a raw bank narration string for keyword matching:
 * 1. Uppercase
 * 2. Strip banking prefixes (UPI-, IMPS-, etc.)
 * 3. Remove long numeric transaction IDs / account numbers
 * 4. Collapse whitespace
 */
export function normalizeNarration(text) {
  if (!text) return ''
  let s = text.toUpperCase().trim()
  for (const re of STRIP_PREFIXES) {
    s = s.replace(re, '')
  }
  s = s.replace(LONG_NUM_RE, ' ')
  s = s.replace(EDGE_JUNK_RE, '')
  s = s.replace(/\s+/g, ' ').trim()
  return s
}

/**
 * Extract the primary keyword from a normalized narration.
 * Takes the first 1–3 meaningful tokens (length > 1).
 */
export function extractKeyword(narration) {
  const norm = normalizeNarration(narration)
  const tokens = norm.split(/[\s\-_\/]+/).filter(t => t.length > 1)
  return tokens.slice(0, 3).join(' ')
}

/**
 * Returns true if the string is an Indian-format amount.
 * e.g. "500.00", "1,00,000.00", "50,000"
 */
export function isAmountToken(str) {
  return /^\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})?$/.test(str.trim())
}

/**
 * Parse an Indian-format amount string to a float.
 */
export function parseAmount(str) {
  return parseFloat(str.replace(/,/g, ''))
}
