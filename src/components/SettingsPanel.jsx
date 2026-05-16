import { useRef, useState } from 'react'
import { useApp } from '../context/AppContext'

export default function SettingsPanel() {
  const {
    settingsOpen,
    setSettingsOpen,
    settings,
    setSettings,
    patternLibrary,
    addPatterns,
    deletePattern,
    clearAllPatterns,
  } = useApp()

  if (!settingsOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={() => setSettingsOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Settings</h2>
          <button
            onClick={() => setSettingsOpen(false)}
            className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            aria-label="Close settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-8">
          <GeneralSection settings={settings} setSettings={setSettings} />
          <PatternLibrarySection
            patternLibrary={patternLibrary}
            addPatterns={addPatterns}
            deletePattern={deletePattern}
            clearAllPatterns={clearAllPatterns}
          />
        </div>
      </aside>
    </>
  )
}

// ---------------------------------------------------------------------------
// General Settings
// ---------------------------------------------------------------------------

function GeneralSection({ settings, setSettings }) {
  return (
    <section>
      <SectionTitle>General</SectionTitle>
      <div className="flex flex-col gap-4">
        <Field label="Account Name" hint="Written into every exported row">
          <input
            type="text"
            value={settings.accountName}
            onChange={e => setSettings(s => ({ ...s, accountName: e.target.value }))}
            placeholder="e.g. HDFC Bank"
            className={inputCls}
          />
        </Field>

        <Field label="API Key (Phase 2)" hint="Anthropic key for AI-assisted categorization — coming soon">
          <input
            type="password"
            value={settings.apiKey}
            onChange={e => setSettings(s => ({ ...s, apiKey: e.target.value }))}
            placeholder="sk-ant-..."
            autoComplete="off"
            className={inputCls}
            disabled
          />
        </Field>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Pattern Library
// ---------------------------------------------------------------------------

function PatternLibrarySection({ patternLibrary, addPatterns, deletePattern, clearAllPatterns }) {
  const importRef = useRef(null)
  const [importError, setImportError] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)

  // --- Export patterns.json ---
  function handleExport() {
    const blob = new Blob([JSON.stringify(patternLibrary, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'patterns.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // --- Import patterns.json ---
  async function handleImport(e) {
    setImportError('')
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      if (!Array.isArray(parsed)) throw new Error('File must be a JSON array.')
      // Validate each entry has at least keyword + category
      const valid = parsed.filter(p => p.keyword && p.category)
      if (!valid.length) throw new Error('No valid pattern entries found.')
      addPatterns(valid)
    } catch (err) {
      setImportError(err.message)
    }
    // Reset so same file can be re-imported
    e.target.value = ''
  }

  // --- Clear all ---
  function handleClear() {
    if (!confirmClear) { setConfirmClear(true); return }
    clearAllPatterns()
    setConfirmClear(false)
  }

  return (
    <section>
      <SectionTitle>Pattern Library</SectionTitle>
      <p className="text-xs text-gray-500 mb-3">
        {patternLibrary.length} pattern{patternLibrary.length !== 1 ? 's' : ''} stored.
        Patterns are learned from your Money Manager exports and used to auto-categorize transactions.
      </p>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => importRef.current?.click()}
          className={secondaryBtn}
        >
          Import JSON
        </button>
        <input
          ref={importRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImport}
        />

        <button
          onClick={handleExport}
          disabled={!patternLibrary.length}
          className={secondaryBtn + ' disabled:opacity-40 disabled:cursor-not-allowed'}
        >
          Export JSON
        </button>

        <button
          onClick={handleClear}
          disabled={!patternLibrary.length}
          className={
            confirmClear
              ? 'px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700'
              : `${secondaryBtn} text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed`
          }
        >
          {confirmClear ? 'Confirm clear' : 'Clear all'}
        </button>
        {confirmClear && (
          <button onClick={() => setConfirmClear(false)} className={secondaryBtn}>
            Cancel
          </button>
        )}
      </div>

      {importError && (
        <p className="text-xs text-red-600 mb-3">{importError}</p>
      )}

      {/* Pattern table */}
      {patternLibrary.length > 0 ? (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-y-auto max-h-80">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr className="border-b border-gray-200">
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Keyword</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Category</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Note</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {patternLibrary.map((p, i) => (
                  <tr
                    key={p.keyword}
                    className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                  >
                    <td className="px-3 py-1.5 font-mono text-gray-700 max-w-[120px] truncate" title={p.keyword}>
                      {p.keyword}
                    </td>
                    <td className="px-3 py-1.5 text-gray-600">
                      {p.category}
                      {p.subcategory ? ` / ${p.subcategory}` : ''}
                    </td>
                    <td className="px-3 py-1.5 text-gray-500 max-w-[80px] truncate" title={p.note}>
                      {p.note || '—'}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <button
                        onClick={() => deletePattern(p.keyword)}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                        aria-label={`Delete pattern ${p.keyword}`}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-400 italic">
          No patterns yet. Upload a Money Manager export on the home screen to build your library.
        </p>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function SectionTitle({ children }) {
  return (
    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
      {children}
    </h3>
  )
}

function Field({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

const inputCls =
  'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50 disabled:text-gray-400'

const secondaryBtn =
  'px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors'
