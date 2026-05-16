/**
 * Standard Money Manager category → subcategory map.
 * Used as fallback when the user's Pattern Library has no match,
 * and to populate category/subcategory dropdowns in the Review table.
 */
const DEFAULT_CATEGORIES = {
  'Food': [
    'Dining Out',
    'Groceries',
    'Coffee & Tea',
    'Snacks',
    'Delivery',
    'Other',
  ],
  'Transport': [
    'Fuel',
    'Cab / Auto',
    'Public Transport',
    'Parking',
    'Vehicle Maintenance',
    'Other',
  ],
  'House': [
    'Rent',
    'Maintenance',
    'Electricity',
    'Water',
    'Internet',
    'Gas',
    'Household Supplies',
    'Other',
  ],
  'Health': [
    'Doctor',
    'Medicine',
    'Lab / Tests',
    'Hospital',
    'Insurance',
    'Other',
  ],
  'Shopping': [
    'Clothing',
    'Electronics',
    'Accessories',
    'Online Shopping',
    'Other',
  ],
  'Entertainment': [
    'Movies',
    'Subscriptions',
    'Events',
    'Hobbies',
    'Other',
  ],
  'Education': [
    'Tuition',
    'Books',
    'Courses',
    'Stationery',
    'Other',
  ],
  'Personal Care': [
    'Salon & Spa',
    'Gym',
    'Clothing',
    'Other',
  ],
  'Travel': [
    'Flights',
    'Hotels',
    'Local Transport',
    'Food',
    'Other',
  ],
  'Finance': [
    'EMI',
    'Loan Repayment',
    'Investment',
    'Insurance Premium',
    'Bank Charges',
    'Other',
  ],
  'Income': [
    'Salary',
    'Freelance',
    'Interest',
    'Dividend',
    'Rental Income',
    'Other',
  ],
  'Transfer': [
    'Self Transfer',
    'Family',
    'Other',
  ],
  'Gifts & Donations': [
    'Gifts',
    'Donations',
    'Other',
  ],
  'Other': [
    'Miscellaneous',
    'Other',
  ],
}

export default DEFAULT_CATEGORIES

/**
 * Returns a deduplicated, sorted list of all category names,
 * merged with any custom categories from the user's pattern library.
 */
export function getAllCategories(patternLibrary = []) {
  const defaults = Object.keys(DEFAULT_CATEGORIES)
  const custom = patternLibrary.map(p => p.category).filter(Boolean)
  return [...new Set([...defaults, ...custom])].sort()
}

/**
 * Returns subcategories for a given category, merged with custom ones from the pattern library.
 */
export function getSubcategories(category, patternLibrary = []) {
  const defaults = DEFAULT_CATEGORIES[category] ?? []
  const custom = patternLibrary
    .filter(p => p.category === category && p.subcategory)
    .map(p => p.subcategory)
  return [...new Set([...defaults, ...custom])]
}
