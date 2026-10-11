"use client"

export interface Topic {
  id: string
  label: string
}

interface TopicTabsProps {
  topics: Topic[]
  activeTopic: string
  onSelect: (id: string) => void
}

export default function TopicTabs({ topics, activeTopic, onSelect }: TopicTabsProps) {
  return (
    <div className="bg-white px-4 py-2 flex gap-9 overflow-x-auto border-b border-gray-100">
      {topics.map((topic) => (
        <button
          key={topic.id}
          onClick={() => onSelect(topic.id)}
          className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
            activeTopic === topic.id
              ? "bg-emerald-50 border-blue-900 text-blue-900"
              : "bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"
          }`}
        >
          {topic.label}
        </button>
      ))}
    </div>
  )
}