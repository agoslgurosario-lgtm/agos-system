"use client"

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  filter: string
  onFilterChange: (value: string) => void
  filterOptions: string[]
}

export default function SearchBar({
  value,
  onChange,
  filter,
  onFilterChange,
  filterOptions,
}: SearchBarProps) {
  return (
    <div className="bg-white px-6 py-3 flex gap-3 border-b border-gray-100">
      <div className="relative flex-1">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search user manual"
          className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {/* <select
        value={filter}
        onChange={(e) => onFilterChange(e.target.value)}
        className="border border-gray-200 rounded-lg px-1 py-1 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="all">All topics</option>
        {filterOptions.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select> */}
    </div>
  )
}