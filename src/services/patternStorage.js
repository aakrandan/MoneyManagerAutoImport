const KEYS = {
  settings: 'mm_settings',
  patterns: 'mm_pattern_library',
}

const DEFAULT_SETTINGS = {
  accountName: 'HDFC Bank',
  apiKey: '',
  mode: 'rule_based',
}

// --- Settings ---

export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEYS.settings)
    if (!raw) return { ...DEFAULT_SETTINGS }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(KEYS.settings, JSON.stringify(settings))
  } catch {
    // localStorage unavailable (e.g. private browsing quota)
  }
}

// --- Pattern Library ---

export function loadPatterns() {
  try {
    const raw = localStorage.getItem(KEYS.patterns)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export function savePatterns(patterns) {
  try {
    localStorage.setItem(KEYS.patterns, JSON.stringify(patterns))
  } catch {
    // ignore
  }
}

/**
 * Merge newPatterns into existing. Deduplicates by keyword (case-insensitive).
 * On conflict, newer entry (from newPatterns) wins.
 */
export function mergePatterns(existing, incoming) {
  const map = new Map()
  for (const entry of existing) {
    map.set(entry.keyword.toUpperCase(), entry)
  }
  for (const entry of incoming) {
    map.set(entry.keyword.toUpperCase(), entry)
  }
  return Array.from(map.values())
}

export function clearPatterns() {
  try {
    localStorage.removeItem(KEYS.patterns)
  } catch {
    // ignore
  }
}
