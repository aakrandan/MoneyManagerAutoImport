import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import SummaryBar from '../components/SummaryBar'
import TransactionTable from '../components/TransactionTable'

export default function ReviewPage() {
  const { transactions, setTransactions, setCurrentPage } = useApp()

  // --- Derive date bounds from the loaded transactions ---
  const { minDate, maxDate } = useMemo(() => {
    if (!transactions.length) return { minDate: '', maxDate: '' }
    const dates = transactions.map(t => t.date).filter(Boolean).sort()
    return { minDate: dates[0], maxDate: dates[dates.length - 1] }
  }, [transactions])

  const [filterStart, setFilterStart] = useState('')
  const [filterEnd,   setFilterEnd]   = useState('')

  // Effective bounds (fall back to statement bounds when user hasn't set them)
  const effectiveStart = filterStart || minDate
  const effectiveEnd   = filterEnd   || maxDate

  // --- Filtered transactions (within date range) ---
  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (!t.date) return true
      if (effectiveStart && t.date < effectiveStart) return false
      if (effectiveEnd   && t.date > effectiveEnd)   return false
      return true
    })
  }, [transactions, effectiveStart, effectiveEnd])

  const transferCount = filtered.filter(
    t => t.category === 'Transfer' && !t.included
  ).length

  function handleStartOver() {
    setTransactions([])
    setCurrentPage('upload')
  }

  function markAllReviewed() {
    setTransactions(prev =>
      prev.map(t =>
        t.flagged && filtered.some(f => f.id === t.id)
          ? { ...t, flagged: false }
          : t
      )
    )
  }

  if (!transactions.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
        <p className="text-gray-500">No transactions loaded.</p>
        <button
          onClick={() => setCurrentPage('upload')}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm"
        >
          Go to Upload
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Summary bar */}
      <SummaryBar transactions={transactions} filtered={filtered} />

      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
        {/* Date range filter */}
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span className="font-medium">Date range:</span>
          <input
            type="date"
            value={filterStart || minDate}
            min={minDate}
            max={effectiveEnd}
            onChange={e => setFilterStart(e.target.value)}
            className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <span>to</span>
          <input
            type="date"
            value={filterEnd || maxDate}
            min={effectiveStart}
            max={maxDate}
            onChange={e => setFilterEnd(e.target.value)}
            className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          {(filterStart || filterEnd) && (
            <button
              onClick={() => { setFilterStart(''); setFilterEnd('') }}
              className="text-blue-500 hover:underline"
            >
              Reset
            </button>
          )}
        </div>

        <div className="flex-1" />

        <button
          onClick={markAllReviewed}
          className="text-xs text-gray-500 hover:text-gray-800 underline"
        >
          Mark all reviewed
        </button>
      </div>

      {/* Transfer warning banner */}
      {transferCount > 0 && (
        <div className="mx-4 mt-3 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-start gap-2">
          <span className="mt-0.5">ℹ️</span>
          <span>
            <strong>{transferCount} self-transfer {transferCount === 1 ? 'transaction' : 'transactions'} excluded</strong> from the export
            to prevent double-counting (the same transfer may appear as income in another bank's statement).
            Use the checkbox to include any that should be exported.
          </span>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto px-4 pt-3 pb-4">
        <TransactionTable transactions={filtered} />
      </div>

      {/* Footer actions */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={handleStartOver}
          className="text-xs text-gray-400 hover:text-gray-700 underline"
        >
          Start Over
        </button>
        <div className="flex-1" />
        <DownloadButtons filtered={filtered} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Download buttons
// ---------------------------------------------------------------------------

function DownloadButtons({ filtered }) {
  const { settings } = useApp()
  const [busy, setBusy] = useState(false)
  const exportable = filtered.filter(t => t.included)
  const accountName = settings.accountName || 'HDFC Bank'

  async function handleXlsx() {
    setBusy(true)
    const { downloadXlsx } = await import('../services/exportXlsx')
    downloadXlsx(exportable, accountName)
    setBusy(false)
  }

  async function handleTsv() {
    setBusy(true)
    const { downloadTsv } = await import('../services/exportTsv')
    downloadTsv(exportable, accountName)
    setBusy(false)
  }

  return (
    <div className="flex gap-2">
      <button
        disabled={!exportable.length || busy}
        onClick={handleXlsx}
        className="px-4 py-2 rounded-lg bg-green-600 text-white text-xs font-semibold
          hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        Download .xlsx ({exportable.length})
      </button>
      <button
        disabled={!exportable.length || busy}
        onClick={handleTsv}
        className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold
          hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        Download .tsv ({exportable.length})
      </button>
    </div>
  )
}
