import { useApp } from '../context/AppContext'
import { CategoryDropdown, SubcategoryDropdown } from './CategoryDropdown'

const IE_OPTIONS = ['Expense', 'Income', 'Transfer-Out']

export default function TransactionRow({ txn }) {
  const { updateTransaction } = useApp()

  const set = (field, value) => updateTransaction(txn.id, { [field]: value })

  const rowBg = !txn.included
    ? 'bg-gray-50 opacity-60'
    : txn.flagged
    ? 'bg-amber-50'
    : 'bg-white'

  return (
    <tr className={`border-b border-gray-100 text-xs ${rowBg}`}>
      {/* Include toggle */}
      <td className="px-2 py-2 text-center">
        <input
          type="checkbox"
          checked={txn.included}
          onChange={e => set('included', e.target.checked)}
          className="accent-blue-500 cursor-pointer"
          title={txn.included ? 'Included in export' : 'Excluded from export'}
        />
      </td>

      {/* Date */}
      <td className="px-2 py-2 whitespace-nowrap text-gray-600">{txn.date}</td>

      {/* Raw narration (read-only, truncated with tooltip) */}
      <td className="px-2 py-2 max-w-[200px]" title={txn.rawNarration}>
        <span className="block truncate text-gray-700">{txn.rawNarration}</span>
        {txn.flagged && txn.included && (
          <span className="text-amber-500 text-[10px]">needs review</span>
        )}
        {!txn.included && txn.category === 'Transfer' && (
          <span className="text-gray-400 text-[10px]">self-transfer excluded</span>
        )}
      </td>

      {/* Note — editable */}
      <td className="px-2 py-2">
        <input
          type="text"
          value={txn.note}
          onChange={e => set('note', e.target.value)}
          placeholder="note"
          className="w-28 border border-gray-200 rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      </td>

      {/* Category */}
      <td className="px-2 py-2">
        <CategoryDropdown
          value={txn.category}
          onChange={cat => {
            set('category', cat)
            set('subcategory', '')
            if (cat !== 'REVIEW_NEEDED') set('flagged', false)
            // Auto-toggle included when user changes Transfer category
            if (cat === 'Transfer') set('included', false)
            else if (txn.category === 'Transfer') set('included', true)
          }}
        />
      </td>

      {/* Subcategory */}
      <td className="px-2 py-2">
        <SubcategoryDropdown
          category={txn.category}
          value={txn.subcategory}
          onChange={sc => set('subcategory', sc)}
        />
      </td>

      {/* Amount */}
      <td className="px-2 py-2 text-right font-medium text-gray-800 whitespace-nowrap">
        {txn.amount != null
          ? '₹' + txn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : '—'}
      </td>

      {/* Income / Expense */}
      <td className="px-2 py-2">
        <select
          value={txn.incomeExpense}
          onChange={e => set('incomeExpense', e.target.value)}
          className="border border-gray-200 rounded px-1.5 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          {IE_OPTIONS.map(o => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </td>
    </tr>
  )
}
