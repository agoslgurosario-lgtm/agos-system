export interface ManualStepSection {
  label?: string
  description: string
}

export interface ManualStep {
  id: string
  label: string
  description: string
  whyItMatters: string
  images?: string[]        // NEW — images shown after the main description
  extraSections?: {
    label?: string
    description: string
    images?: string[]      // NEW — images shown after this section's description
  }[]
}

interface StepsListProps {
  title: string
  description: string
  steps: ManualStep[]
  activeStepId: string
  visitedStepIds: string[]
  onSelect: (id: string) => void
}

export default function StepsList({
  title,
  description,
  steps,
  activeStepId,
  visitedStepIds,
  onSelect,
}: StepsListProps) {
  return (
    <div className="w-64 shrink-0 border-r border-gray-100 px-5 py-5">
      <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-xs text-gray-500 mb-4">{description}</p>
      <ol className="space-y-1">
        {steps.map((step, i) => {
          const isActive = step.id === activeStepId
          const isVisited = !isActive && visitedStepIds.includes(step.id)

          return (
            <li key={step.id}>
              <button
                onClick={() => onSelect(step.id)}
                className={`w-full flex items-start gap-2.5 text-left px-2 py-2 rounded-lg text-xs transition ${
                  isActive ? "bg-green-50 text-green-800" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span
                  className={`w-5 h-5 shrink-0 rounded-full text-xs flex items-center justify-center font-medium ${
                    isActive
                      ? "bg-green-700 text-white"
                      : isVisited
                      ? "bg-blue-900 text-white"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {i + 1}
                </span>
                <span>{step.label}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}