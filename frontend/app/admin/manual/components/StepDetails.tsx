import PreviousNextButtons from "./PreviousNextButtons"
import StepImages from "./StepImages"

interface StepDetailProps {
  stepIndex: number
  totalSteps: number
  title: string
  description: string
  whyItMatters: string
  images?: string[]
  extraSections?: { label?: string; description: string; images?: string[] }[]
  onPrevious: () => void
  onNext: () => void
  hasPrevious: boolean
  hasNext: boolean
}

export default function StepDetail({
  stepIndex,
  totalSteps,
  title,
  description,
  whyItMatters,
  images,
  extraSections,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
}: StepDetailProps) {
  return (
    <div className="flex-1 px-6 py-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-green-700 font-small">
          Step {stepIndex + 1} of {totalSteps}
        </span>
        <PreviousNextButtons
          onPrevious={onPrevious}
          onNext={onNext}
          hasPrevious={hasPrevious}
          hasNext={hasNext}
        />
      </div>

      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      <p className="text-xs text-gray-500 mt-1 mb-4 whitespace-pre-line">{description}</p>

      <StepImages images={images} alt={title} />

      {extraSections?.map((section, i) => (
        <div key={i}>
          {section.label && (
            <h2 className="text-sm font-semibold text-gray-900">{section.label}</h2>
          )}
          <p className="text-xs text-gray-500 mt-1 mb-4 whitespace-pre-line">
            {section.description}
          </p>
          <StepImages images={section.images} alt={section.label ?? title} />
        </div>
      ))}

      <h3 className="text-sm font-semibold text-gray-900 mb-1">Why is this important?</h3>
      <p className="text-xs text-gray-500 mb-4">{whyItMatters}</p>
    </div>
  )
}