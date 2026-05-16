import TransactionRow from './TransactionRow'

const HEADERS = [
  { label: 'Export', width: 'w-8' },
  { label: 'Date',   width: 'w-24' },
  { label: 'Narration' },
  { label: 'Note',   width: 'w-32' },
  { label: 'Category', width: 'w-36' },
  { label: 'Subcategory', width: 'w-36' },
  { label: 'Amount', width: 'w-28' },
  { label: 'Type',   width: 'w-28' },
]

export default function TransactionTable({ transactions }) {
  if (!transactions.length) {
    return (
      <div className="text-center py-16 text-sm text-gray-400">
        No transactions match the selected date range.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b-2 border-gray-200 text-xs text-gray-500 uppercase tracking-wide">
            {HEADERS.map(h => (
              <th key={h.label} className={`px-2 py-2 font-medium ${h.width ?? ''}`}>
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {transactions.map(txn => (
            <TransactionRow key={txn.id} txn={txn} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
