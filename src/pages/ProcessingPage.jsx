import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'

const STEPS = [
  'Extracting transactions from PDF…',
  'Loading pattern library…',
  'Categorizing transactions…',
  'Done!',
]

export default function ProcessingPage() {
  const {
    processingFiles,
    patternLibrary,
    addPatterns,
    setTransactions,
    setCurrentPage,
  } = useApp()

  const [stepIndex, setStepIndex] = useState(0)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!processingFiles?.pdf) {
      setCurrentPage('upload')
      return
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function run() {
    try {
      // Step 1 — Parse PDF (dynamic import keeps initial bundle lean)
      setStepIndex(0)
      const { parsePDF } = await import('../services/pdfParser')
      const rawTxns = await parsePDF(processingFiles.pdf)

      // Step 2 — Load MM export patterns (if provided)
      setStepIndex(1)
      let library = patternLibrary
      if (processingFiles.mmExport) {
        const { parseMMExport } = await import('../services/mmExcelParser')
        const newPatterns = await parseMMExport(processingFiles.mmExport)
        addPatterns(newPatterns)
        // Use the merged library for this run
        library = [...patternLibrary, ...newPatterns]
      }

      // Step 3 — Categorize
      setStepIndex(2)
      // Yield to the event loop so the UI can update before the sync categorizer runs
      await new Promise(r => setTimeout(r, 50))
      const { categorizeTransactions } = await import('../services/categorizer')
      const categorized = categorizeTransactions(rawTxns, library)

      setTransactions(categorized)

      // Step 4 — Navigate
      setStepIndex(3)
      await new Promise(r => setTimeout(r, 600))
      setCurrentPage('review')
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.')
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md w-full">
          <h3 className="text-base font-semibold text-red-800 mb-2">Processing Failed</h3>
          <p className="text-sm text-red-700 mb-4">{error}</p>
          <button
            onClick={() => setCurrentPage('upload')}
            className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
          >
            Start Over
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <div className="w-full max-w-xs">
        <div className="flex justify-center mb-6">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
        </div>

        <div className="flex flex-col gap-2">
          {STEPS.map((step, i) => (
            <div
              key={step}
              className={`flex items-center gap-3 text-sm transition-opacity duration-300 ${
                i < stepIndex
                  ? 'opacity-40'
                  : i === stepIndex
                  ? 'opacity-100 font-medium text-gray-900'
                  : 'opacity-20'
              }`}
            >
              {i < stepIndex ? (
                <span className="text-green-500">✓</span>
              ) : i === stepIndex ? (
                <span className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin inline-block" />
              ) : (
                <span className="w-4 text-gray-300">○</span>
              )}
              {step}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
