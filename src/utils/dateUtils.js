/**
 * Parse a date string from a bank statement.
 * Handles: DD/MM/YY, DD/MM/YYYY, DD-MM-YY, DD-MM-YYYY
 * Returns a Date object or null if unparseable.
 */
export function parseStatementDate(str) {
  if (!str) return null
  const s = str.trim()
  // Match DD/MM/YY or DD/MM/YYYY (with / or -)
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
  if (!m) return null

  let [, day, month, year] = m
  day = parseInt(day, 10)
  month = parseInt(month, 10)
  year = parseInt(year, 10)

  // Two-digit year: 00–49 → 2000s, 50–99 → 1900s
  if (year < 100) year += year < 50 ? 2000 : 1900

  if (month < 1 || month > 12) return null
  if (day < 1 || day > 31) return null

  return new Date(year, month - 1, day)
}

/**
 * Format a Date for Money Manager import: MM/DD/YYYY
 */
export function formatDateForMM(date) {
  if (!(date instanceof Date) || isNaN(date)) return ''
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const yyyy = date.getFullYear()
  return `${mm}/${dd}/${yyyy}`
}

/**
 * Format a Date as ISO YYYY-MM-DD (used internally).
 */
export function formatDateISO(date) {
  if (!(date instanceof Date) || isNaN(date)) return ''
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/**
 * Returns true if the string looks like a date token from a bank statement.
 */
export function isDateToken(str) {
  return /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(str.trim())
}
