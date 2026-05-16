export default function SummaryBar({ transactions, filtered }) {
  const included = filtered.filter(t => t.included)
  const flagged  = filtered.filter(t => t.flagged && t.included)

  const totalIncome  = included
    .filter(t => t.incomeExpense === 'Income')
    .reduce((s, t) => s + (t.amount ?? 0), 0)
  const totalExpense = included
    .filter(t => t.incomeExpense === 'Expense')
    .reduce((s, t) => s + (t.amount ?? 0), 0)
  const net = totalIncome - totalExpense

  const fmt = (n) =>
    '₹' + Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="flex flex-wrap gap-3 px-4 py-3 bg-white border-b border-gray-200 text-sm">
      <Stat label="In range" value={filtered.length} />
      <Stat label="Exporting" value={included.length} />
      {flagged.length > 0 && (
        <Stat label="Need review" value={flagged.length} warn />
      )}
      <div className="flex-1" />
      <Stat label="Income" value={fmt(totalIncome)} positive />
      <Stat label="Expenses" value={fmt(totalExpense)} negative />
      <Stat label="Net" value={(net >= 0 ? '+' : '−') + fmt(net)} neutral />
    </div>
  )
}

function Stat({ label, value, warn, positive, negative, neutral }) {
  const valueColor = warn
    ? 'text-amber-600'
    : positive
    ? 'text-green-600'
    : negative
    ? 'text-red-600'
    : 'text-gray-900'

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-gray-400 text-xs">{label}</span>
      <span className={`font-semibold text-xs ${valueColor}`}>{value}</span>
    </div>
  )
}
