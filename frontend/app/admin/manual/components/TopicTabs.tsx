"use client"

import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { ChevronDown } from "lucide-react"

export interface ManualSubTopicRef {
  id: string
  label: string
}

interface TopicLike {
  id: string
  label: string
  subTopics?: ManualSubTopicRef[]
}

interface TopicTabsProps {
  topics: TopicLike[]
  activeTopicId: string
  activeSubTopicId: string | null
  onSelectTopic: (topicId: string) => void
  onSelectSubTopic: (topicId: string, subTopicId: string) => void
  // True while the user has typed something in the search bar. When true,
  // the dropdown for any topic that still has sub-topics after filtering
  // opens automatically so search matches inside it are visible.
  searchActive?: boolean
}

export default function TopicTabs({
  topics,
  activeTopicId,
  activeSubTopicId,
  onSelectTopic,
  onSelectSubTopic,
  searchActive = false,
}: TopicTabsProps) {
  const [openTopicId, setOpenTopicId] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  // Auto-open the first dropdown topic left in the (filtered) list while
  // searching, so a match on a sub-topic label is visible without a click.
  useEffect(() => {
    if (!searchActive) {
      setOpenTopicId(null)
      return
    }
    const firstDropdownTopic = topics.find(
      (t) => t.subTopics && t.subTopics.length > 0
    )
    setOpenTopicId(firstDropdownTopic ? firstDropdownTopic.id : null)
  }, [searchActive, topics])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      const clickedButton = Object.values(buttonRefs.current).some(
        (btn) => btn && btn.contains(target)
      )
      const menuEl = document.getElementById("topic-tabs-dropdown-menu")
      const clickedMenu = menuEl && menuEl.contains(target)
      if (!clickedButton && !clickedMenu) {
        setOpenTopicId(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (!openTopicId) return
    function updatePosition() {
      const btn = buttonRefs.current[openTopicId as string]
      if (!btn) return
      const rect = btn.getBoundingClientRect()
      setMenuPos({ top: rect.bottom + 4, left: rect.left })
    }
    updatePosition()
    window.addEventListener("scroll", updatePosition, true)
    window.addEventListener("resize", updatePosition)
    return () => {
      window.removeEventListener("scroll", updatePosition, true)
      window.removeEventListener("resize", updatePosition)
    }
  }, [openTopicId])

  const handleTabClick = (topic: TopicLike) => {
    const isDropdownTopic = !!topic.subTopics && topic.subTopics.length > 0

    if (!isDropdownTopic) {
      onSelectTopic(topic.id)
      setOpenTopicId(null)
      return
    }

    if (openTopicId === topic.id) {
      setOpenTopicId(null)
      return
    }

    setOpenTopicId(topic.id)
  }

  const openTopic = topics.find((t) => t.id === openTopicId)

  return (
    <div className="flex items-center gap-3 px-4 py-3 overflow-x-auto">
      {topics.map((topic) => {
        const isDropdownTopic = !!topic.subTopics && topic.subTopics.length > 0
        const isActive = activeTopicId === topic.id
        const isOpen = openTopicId === topic.id

        return (
          <div key={topic.id} className="relative">
            <button
              ref={(el) => {
                buttonRefs.current[topic.id] = el
              }}
              onClick={() => handleTabClick(topic)}
              className={`flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-full border-2 whitespace-nowrap transition-colors
                ${isActive
                  ? "bg-emerald-50 border-blue-900 text-blue-900"
                  : "bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"}`}
            >
              {topic.label}
              {isDropdownTopic && (
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                />
              )}
            </button>
          </div>
        )
      })}

      {openTopic &&
        openTopic.subTopics &&
        menuPos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            id="topic-tabs-dropdown-menu"
            style={{ position: "fixed", top: menuPos.top, left: menuPos.left }}
            className="w-53 rounded-md border border-gray-200 bg-white shadow-lg z-50 py-1"
          >
            {openTopic.subTopics.map((sub) => {
              const isSelected =
                activeTopicId === openTopic.id && activeSubTopicId === sub.id
              return (
                <button
                  key={sub.id}
                  onClick={() => {
                    onSelectSubTopic(openTopic.id, sub.id)
                    setOpenTopicId(null)
                  }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors
                    ${isSelected
                      ? "bg-sky-100 text-gray font-medium"
                      : "text-gray-500 hover:bg-sky-50"}`}
                >
                  {sub.label}
                </button>
              )
            })}
          </div>,
          document.body
        )}
    </div>
  )
}
