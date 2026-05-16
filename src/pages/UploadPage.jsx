import { useState } from 'react'
import { useApp } from '../context/AppContext'
import FileUploadZone from '../components/FileUploadZone'

export default function UploadPage() {
  const { setCurrentPage, setProcessingFiles, patternLibrary } = useApp()
  const [pdfFile, setPdfFile] = useState(null)
  const [mmFile, setMmFile] = useState(null)
  const [error, setError] = useState('')

  function handleProcess() {
    if (!pdfFile) {
      setError('Please upload a bank statement PDF before continuing.')
      return
    }
    setError('')
    setProcessingFiles({ pdf: pdfFile, mmExport: mmFile })
    setCurrentPage('processing')
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-semibold text-gray-900">Import Bank Transactions</h2>
        <p className="mt-2 text-sm text-gray-500">
          Upload your bank statement PDF to extract and categorize transactions.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {/* PDF upload — required */}
        <FileUploadZone
          label="Bank Statement PDF"
          accept=".pdf"
          file={pdfFile}
          onChange={setPdfFile}
          required
        />

        {/* MM export — optional */}
        <FileUploadZone
          label="Money Manager Export (optional)"
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
        disabled={!pdfFile}
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
