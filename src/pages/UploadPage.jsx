import { useState } from 'react'
import { useApp } from '../context/AppContext'
import FileUploadZone from '../components/FileUploadZone'

const STATEMENT_ACCEPT = '.pdf,.xlsx,.xls,.csv'

export default function UploadPage() {
  const { setCurrentPage, setProcessingFiles, patternLibrary } = useApp()
  const [statementFile, setStatementFile] = useState(null)
  const [mmFile, setMmFile] = useState(null)
  const [error, setError] = useState('')

  function handleProcess() {
    if (!statementFile) {
      setError('Please upload a bank statement before continuing.')
      return
    }
    setError('')
    setProcessingFiles({ statement: statementFile, mmExport: mmFile })
    setCurrentPage('processing')
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-semibold text-gray-900">Import Bank Transactions</h2>
        <p className="mt-2 text-sm text-gray-500">
          Upload your bank statement to extract and categorize transactions.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Statement upload — required */}
        <FileUploadZone
          label="Bank Statement"
          hint="PDF, Excel (.xlsx) or CSV — download from your bank's netbanking portal"
          accept={STATEMENT_ACCEPT}
          file={statementFile}
          onChange={setStatementFile}
          required
        />

        {/* MM export — optional */}
        <FileUploadZone
          label="Money Manager Export (optional)"
          hint="Helps auto-categorize using your past transaction history"
          accept=".xlsx"
          file={mmFile}
          onChange={setMmFile}
        />

        {patternLibrary.length > 0 && (
          <p className="text-xs text-center text-gray-400">
            {patternLibrary.length} patterns loaded from your library
          </p>
        )}
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-600 text-center">{error}</p>
      )}

      <button
        onClick={handleProcess}
        disabled={!statementFile}
        className="mt-6 w-full py-3 px-4 rounded-xl text-sm font-semibold text-white
          bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed
          transition-colors"
      >
        Extract &amp; Categorize
      </button>

      <p className="mt-4 text-xs text-center text-gray-400">
        All processing happens in your browser. No data is uploaded to any server.
      </p>
    </div>
  )
}
