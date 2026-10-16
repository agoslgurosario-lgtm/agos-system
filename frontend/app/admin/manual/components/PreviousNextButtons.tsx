interface PreviousNextButtonsProps {
  onPrevious: () => void
  onNext: () => void
  hasPrevious: boolean
  hasNext: boolean
  nextLabel?: string
}

export default function PreviousNextButtons({
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  nextLabel = "Next",
}: PreviousNextButtonsProps) {
  return (
    <div className="flex gap-2" data-tour="nav">
      <button
        onClick={onPrevious}
        disabled={!hasPrevious}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-700 disabled:opacity-40 hover:bg-gray-50"
      >
        ← Previous
      </button>
      <button
        onClick={onNext}
        disabled={!hasNext}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-700 text-white disabled:opacity-40 hover:bg-green-800"
      >
        {nextLabel} →
      </button>
    </div>
    
  )
}