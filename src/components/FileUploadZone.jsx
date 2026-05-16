import { useRef, useState } from 'react'

export default function FileUploadZone({ label, accept, file, onChange, required = false }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  function handleFiles(files) {
    const f = files[0]
    if (!f) return
    onChange(f)
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  function onDragOver(e) {
    e.preventDefault()
    setDragging(true)
  }

  function onDragLeave() {
    setDragging(false)
  }

  function onInputChange(e) {
    handleFiles(e.target.files)
    // Reset input so the same file can be re-selected
    e.target.value = ''
  }

  const borderColor = dragging
    ? 'border-blue-500 bg-blue-50'
    : file
    ? 'border-green-400 bg-green-50'
    : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50'

  return (
    <div
      className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${borderColor}`}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      aria-label={label}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={onInputChange}
      />

      {file ? (
        <div className="flex flex-col items-center gap-1">
          <CheckIcon />
          <p className="text-sm font-medium text-green-700 break-all">{file.name}</p>
          <p className="text-xs text-gray-500">{formatSize(file.size)} — click to replace</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <UploadIcon />
          <p className="text-sm font-medium text-gray-700">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </p>
          <p className="text-xs text-gray-400">Drag & drop or click to browse</p>
          <p className="text-xs text-gray-400">{accept}</p>
        </div>
      )}
    </div>
  )
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function UploadIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}
