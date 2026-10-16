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
    <div data-tour="topic-tabs" className="bg-white px-4 py-2 flex gap-9 overflow-x-auto border-b border-gray-100">
      {topics.map((topic) => (
        <button
          key={topic.id}
          onClick={() => onSelect(topic.id)}
              className={`flex items-center gap-1.5 shrink-0 px-3 py-2 text-xs font-medium rounded-full border
              whitespace-nowrap select-none cursor-pointer
              active:scale-95
              focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1
              ${
                activeTopic === topic.id
                  ? "bg-blue-900 text-white shadow-sm hover:bg-[#1565BC]"
                  : "bg-gray-50 border-gray-300 text-slate-700 hover:bg-blue-200 hover:border-gray-300 hover:text-gray-950"
              }`}
        >
          {topic.label}
        </button>
      ))}
    </div>
  )
}