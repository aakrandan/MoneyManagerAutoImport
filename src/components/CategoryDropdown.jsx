import { useApp } from '../context/AppContext'
import { getAllCategories, getSubcategories } from '../data/defaultCategories'

export function CategoryDropdown({ value, onChange, className = '' }) {
  const { patternLibrary } = useApp()
  const categories = getAllCategories(patternLibrary)

  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`border border-gray-200 rounded px-1.5 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 ${className}`}
    >
      <option value="REVIEW_NEEDED">— select —</option>
      {categories.map(cat => (
        <option key={cat} value={cat}>{cat}</option>
      ))}
    </select>
  )
}

export function SubcategoryDropdown({ category, value, onChange, className = '' }) {
  const { patternLibrary } = useApp()
  const subcats = getSubcategories(category, patternLibrary)

  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={!category || category === 'REVIEW_NEEDED'}
      className={`border border-gray-200 rounded px-1.5 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-40 ${className}`}
    >
      <option value="">—</option>
      {subcats.map(sc => (
        <option key={sc} value={sc}>{sc}</option>
      ))}
    </select>
  )
}
