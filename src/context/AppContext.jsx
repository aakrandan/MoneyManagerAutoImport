import { createContext, useContext, useState, useCallback } from 'react'
import {
  loadSettings,
  saveSettings,
  loadPatterns,
  savePatterns,
  mergePatterns,
} from '../services/patternStorage'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [currentPage, setCurrentPage] = useState('upload')
  const [transactions, setTransactions] = useState([])
  const [processingFiles, setProcessingFiles] = useState({ pdf: null, mmExport: null })
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Hydrate from localStorage on first render via lazy initializer
  const [settings, setSettingsState] = useState(() => loadSettings())
  const [patternLibrary, setPatternLibraryState] = useState(() => loadPatterns())

  // Wrapped setters that also persist to localStorage
  const setSettings = useCallback((updater) => {
    setSettingsState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      saveSettings(next)
      return next
    })
  }, [])

  const setPatternLibrary = useCallback((updater) => {
    setPatternLibraryState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      savePatterns(next)
      return next
    })
  }, [])

  /**
   * Merge new patterns into the library (used after MM export upload).
   * Deduplicates by keyword; incoming entries win on conflict.
   */
  const addPatterns = useCallback((incoming) => {
    setPatternLibraryState((prev) => {
      const next = mergePatterns(prev, incoming)
      savePatterns(next)
      return next
    })
  }, [])

  /**
   * Delete a single pattern by keyword.
   */
  const deletePattern = useCallback((keyword) => {
    setPatternLibraryState((prev) => {
      const next = prev.filter(
        (p) => p.keyword.toUpperCase() !== keyword.toUpperCase()
      )
      savePatterns(next)
      return next
    })
  }, [])

  /**
   * Clear all patterns from state and localStorage.
   */
  const clearAllPatterns = useCallback(() => {
    setPatternLibraryState([])
    savePatterns([])
  }, [])

  /**
   * Update a single transaction field by id.
   */
  const updateTransaction = useCallback((id, patch) => {
    setTransactions((prev) =>
      prev.map((txn) => (txn.id === id ? { ...txn, ...patch } : txn))
    )
  }, [])

  return (
    <AppContext.Provider
      value={{
        // Navigation
        currentPage,
        setCurrentPage,

        // Transactions
        transactions,
        setTransactions,
        updateTransaction,

        // Files handed from Upload → Processing page
        processingFiles,
        setProcessingFiles,

        // Settings panel open/close
        settingsOpen,
        setSettingsOpen,

        // Settings
        settings,
        setSettings,

        // Pattern Library
        patternLibrary,
        setPatternLibrary,
        addPatterns,
        deletePattern,
        clearAllPatterns,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
