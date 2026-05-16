import { normalizeNarration, extractKeyword } from '../utils/stringUtils'

// ---------------------------------------------------------------------------
// Built-in heuristic rules
// Order matters — first match wins within heuristics.
// ---------------------------------------------------------------------------

const HEURISTIC_RULES = [
  // Food & Delivery
  { keywords: ['ZOMATO'],           category: 'Food',         subcategory: 'Delivery',          note: 'Zomato',         incomeExpense: 'Expense' },
  { keywords: ['SWIGGY'],           category: 'Food',         subcategory: 'Delivery',          note: 'Swiggy',         incomeExpense: 'Expense' },
  { keywords: ['BLINKIT', 'GROFER'],category: 'Food',         subcategory: 'Groceries',         note: 'Blinkit',        incomeExpense: 'Expense' },
  { keywords: ['BIGBASKET'],        category: 'Food',         subcategory: 'Groceries',         note: 'BigBasket',      incomeExpense: 'Expense' },
  { keywords: ['DUNZO'],            category: 'Food',         subcategory: 'Delivery',          note: 'Dunzo',          incomeExpense: 'Expense' },
  { keywords: ['ZEPTO'],            category: 'Food',         subcategory: 'Groceries',         note: 'Zepto',          incomeExpense: 'Expense' },
  { keywords: ['STARBUCKS'],        category: 'Food',         subcategory: 'Coffee & Tea',      note: 'Starbucks',      incomeExpense: 'Expense' },
  { keywords: ['CAFE COFFEE', 'CCD'],category: 'Food',        subcategory: 'Coffee & Tea',      note: 'CCD',            incomeExpense: 'Expense' },

  // Transport
  { keywords: ['UBER'],             category: 'Transport',    subcategory: 'Cab / Auto',        note: 'Uber',           incomeExpense: 'Expense' },
  { keywords: ['OLA CABS', 'OLACAB', 'ANI TECHNOLOGIES'], category: 'Transport', subcategory: 'Cab / Auto', note: 'Ola', incomeExpense: 'Expense' },
  { keywords: ['RAPIDO'],           category: 'Transport',    subcategory: 'Cab / Auto',        note: 'Rapido',         incomeExpense: 'Expense' },
  { keywords: ['FASTAG', 'NETC'],   category: 'Transport',    subcategory: 'Fuel',              note: 'FASTag',         incomeExpense: 'Expense' },
  { keywords: ['INDIAN OIL', 'IOCL', 'BHARAT PETRO', 'BPCL', 'HP PETRO', 'HPCL'],
                                    category: 'Transport',    subcategory: 'Fuel',              note: 'Fuel',           incomeExpense: 'Expense' },

  // Shopping
  { keywords: ['AMAZON'],           category: 'Shopping',     subcategory: 'Online Shopping',   note: 'Amazon',         incomeExpense: 'Expense' },
  { keywords: ['FLIPKART'],         category: 'Shopping',     subcategory: 'Online Shopping',   note: 'Flipkart',       incomeExpense: 'Expense' },
  { keywords: ['MYNTRA'],           category: 'Shopping',     subcategory: 'Clothing',          note: 'Myntra',         incomeExpense: 'Expense' },
  { keywords: ['NYKAA'],            category: 'Shopping',     subcategory: 'Accessories',       note: 'Nykaa',          incomeExpense: 'Expense' },
  { keywords: ['MEESHO'],           category: 'Shopping',     subcategory: 'Online Shopping',   note: 'Meesho',         incomeExpense: 'Expense' },

  // Entertainment & Subscriptions
  { keywords: ['NETFLIX'],          category: 'Entertainment',subcategory: 'Subscriptions',     note: 'Netflix',        incomeExpense: 'Expense' },
  { keywords: ['SPOTIFY'],          category: 'Entertainment',subcategory: 'Subscriptions',     note: 'Spotify',        incomeExpense: 'Expense' },
  { keywords: ['HOTSTAR', 'DISNEY'],category: 'Entertainment',subcategory: 'Subscriptions',     note: 'Disney+ Hotstar',incomeExpense: 'Expense' },
  { keywords: ['PRIME VIDEO', 'AMAZON PRIME'], category: 'Entertainment', subcategory: 'Subscriptions', note: 'Amazon Prime', incomeExpense: 'Expense' },
  { keywords: ['YOUTUBE PREMIUM'],  category: 'Entertainment',subcategory: 'Subscriptions',     note: 'YouTube Premium',incomeExpense: 'Expense' },
  { keywords: ['BOOKMYSHOW'],       category: 'Entertainment',subcategory: 'Movies',            note: 'BookMyShow',     incomeExpense: 'Expense' },

  // Travel
  { keywords: ['IRCTC'],            category: 'Travel',       subcategory: 'Local Transport',   note: 'IRCTC',          incomeExpense: 'Expense' },
  { keywords: ['MAKEMYTRIP', 'GOIBIBO', 'CLEARTRIP'],
                                    category: 'Travel',       subcategory: 'Flights',           note: 'Travel booking', incomeExpense: 'Expense' },
  { keywords: ['OYO'],              category: 'Travel',       subcategory: 'Hotels',            note: 'OYO',            incomeExpense: 'Expense' },

  // Health
  { keywords: ['PHARMEASY', 'NETMEDS', '1MG', 'APOLLO PHARM'],
                                    category: 'Health',       subcategory: 'Medicine',          note: 'Pharmacy',       incomeExpense: 'Expense' },
  { keywords: ['PRACTO'],           category: 'Health',       subcategory: 'Doctor',            note: 'Practo',         incomeExpense: 'Expense' },

  // Finance — EMI / Loan
  { keywords: ['EMI'],              category: 'Finance',      subcategory: 'EMI',               note: 'EMI',            incomeExpense: 'Expense' },
  { keywords: ['LOAN REPAY', 'LOAN INST'],
                                    category: 'Finance',      subcategory: 'Loan Repayment',    note: 'Loan',           incomeExpense: 'Expense' },
  { keywords: ['INSURANCE', 'INSUR', 'LIC'],
                                    category: 'Finance',      subcategory: 'Insurance Premium', note: 'Insurance',      incomeExpense: 'Expense' },
  { keywords: ['MUTUAL FUND', 'MF ', 'ZERODHA', 'GROWW', 'KUVERA'],
                                    category: 'Finance',      subcategory: 'Investment',        note: 'Investment',     incomeExpense: 'Expense' },

  // Bank charges & interest
  { keywords: ['INT COLL', 'INT PAID', 'INTEREST PAID'],
                                    category: 'Finance',      subcategory: 'Bank Charges',      note: 'Interest paid',  incomeExpense: 'Expense' },
  { keywords: ['INT CREDIT', 'INTEREST CREDIT', 'INTEREST EARNED'],
                                    category: 'Income',       subcategory: 'Interest',          note: 'Interest',       incomeExpense: 'Income' },
  { keywords: ['BANK CHG', 'BANK CHARGES', 'SERVICE CHARGE', 'GST ON CHRG'],
                                    category: 'Finance',      subcategory: 'Bank Charges',      note: 'Bank charges',   incomeExpense: 'Expense' },
  { keywords: ['ATM'],              category: 'Other',        subcategory: 'Miscellaneous',     note: 'ATM withdrawal', incomeExpense: 'Expense' },

  // Utilities
  { keywords: ['ELECTRICITY', 'BESCOM', 'MSEDCL', 'KSEB', 'TATA POWER', 'BSES', 'CESC'],
                                    category: 'House',        subcategory: 'Electricity',       note: 'Electricity bill',incomeExpense: 'Expense' },
  { keywords: ['BROADBAND', 'JIOFIBER', 'AIRTEL', 'ACT FIBER'],
                                    category: 'House',        subcategory: 'Internet',          note: 'Internet bill',  incomeExpense: 'Expense' },
  { keywords: ['MOBILE RECHARGE', 'PREPAID RECHARGE'],
                                    category: 'House',        subcategory: 'Other',             note: 'Mobile recharge',incomeExpense: 'Expense' },

  // Salary / Income
  { keywords: ['SALARY', 'SAL CR', 'SAL CREDIT', 'PAYROLL'],
                                    category: 'Income',       subcategory: 'Salary',            note: 'Salary',         incomeExpense: 'Income' },
  { keywords: ['DIVIDEND'],         category: 'Income',       subcategory: 'Dividend',          note: 'Dividend',       incomeExpense: 'Income' },
  { keywords: ['CASHBACK', 'REFUND', 'REVERSAL'],
                                    category: 'Income',       subcategory: 'Other',             note: 'Cashback/Refund',incomeExpense: 'Income' },

  // Self transfer (UPI P2P hints)
  { keywords: ['SELF', 'OWN ACCOUNT'],
                                    category: 'Transfer',     subcategory: 'Self Transfer',     note: 'Self transfer',  incomeExpense: 'Transfer-Out' },
]

// ---------------------------------------------------------------------------
// Matching helpers
// ---------------------------------------------------------------------------

/**
 * Exact keyword match: extractKeyword(narration) === pattern.keyword (case-insensitive)
 */
function exactMatch(normalizedNarration, patternLibrary) {
  const keyword = extractKeyword(normalizedNarration)
  if (!keyword) return null
  const key = keyword.toUpperCase()
  return patternLibrary.find(p => p.keyword.toUpperCase() === key) ?? null
}

/**
 * Partial match: check whether any pattern keyword is a substring of the
 * normalized narration, or vice versa.
 * Returns the best (longest keyword) match.
 */
function partialMatch(normalizedNarration, patternLibrary) {
  const narr = normalizedNarration.toUpperCase()
  let best = null
  let bestLen = 0

  for (const pattern of patternLibrary) {
    const kw = pattern.keyword.toUpperCase()
    if (narr.includes(kw) || kw.includes(narr)) {
      if (kw.length > bestLen) {
        best = pattern
        bestLen = kw.length
      }
    }
  }
  return best
}

/**
 * Heuristic match: check built-in rules.
 * Returns a synthetic pattern-like object or null.
 */
function heuristicMatch(normalizedNarration) {
  const narr = normalizedNarration.toUpperCase()
  for (const rule of HEURISTIC_RULES) {
    if (rule.keywords.some(kw => narr.includes(kw))) {
      return {
        category: rule.category,
        subcategory: rule.subcategory,
        note: rule.note,
        incomeExpense: rule.incomeExpense,
      }
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Apply a match result to a transaction
// ---------------------------------------------------------------------------

function applyMatch(txn, match, source, confidence) {
  // Respect the credit/debit hint from the PDF parser unless the pattern
  // explicitly says Income (e.g. salary credits should not be flipped by
  // a pattern that says Expense if the bank shows it as a credit)
  let incomeExpense = match.incomeExpense || txn.incomeExpense
  if (txn.credit != null && txn.debit == null && incomeExpense === 'Expense') {
    incomeExpense = 'Income'
  }
  if (txn.debit != null && txn.credit == null && incomeExpense === 'Income') {
    incomeExpense = 'Expense'
  }

  // Transfer rows are excluded from export by default to prevent double-counting
  // when the same transfer appears in two bank statements (once as debit, once as credit).
  const isTransfer = match.category === 'Transfer'

  return {
    ...txn,
    note:         match.note || txn.note,
    category:     match.category,
    subcategory:  match.subcategory || '',
    incomeExpense,
    flagged:      confidence < 0.8,
    matchSource:  source,
    confidence,
    included:     !isTransfer,
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Categorize an array of transactions using the pattern library + heuristics.
 *
 * @param {Array}  transactions   - raw transactions from parsePDF()
 * @param {Array}  patternLibrary - entries from AppContext / localStorage
 * @returns {Array} enriched transactions
 */
export function categorizeTransactions(transactions, patternLibrary) {
  return transactions.map(txn => categorizeOne(txn, patternLibrary))
}

function categorizeOne(txn, patternLibrary) {
  const normalized = normalizeNarration(txn.rawNarration)

  // 1. Exact match against pattern library (confidence 1.0)
  const exact = exactMatch(normalized, patternLibrary)
  if (exact) return applyMatch(txn, exact, 'pattern_exact', 1.0)

  // 2. Partial match against pattern library (confidence 0.8)
  const partial = partialMatch(normalized, patternLibrary)
  if (partial) return applyMatch(txn, partial, 'pattern_partial', 0.8)

  // 3. Built-in heuristic rules (confidence 0.6)
  const heuristic = heuristicMatch(normalized)
  if (heuristic) return applyMatch(txn, heuristic, 'heuristic', 0.6)

  // 4. Unknown — flag for review
  return {
    ...txn,
    category:     'REVIEW_NEEDED',
    subcategory:  '',
    note:         '',
    flagged:      true,
    matchSource:  'none',
    confidence:   0,
    included:     true,
  }
}
