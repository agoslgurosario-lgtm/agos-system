interface IntroScreenProps {
  onGetStarted: () => void
}

export default function IntroScreen({ onGetStarted }: IntroScreenProps) {
  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-[#132A49] via-[#1565BC] to-[#2C7B3C] px-4 h-14 flex justify-between items-center">
        <h1 className="text-white text-m font-semibold">User Manual</h1>
      </div>

      <div className="px-6 py-6 flex flex-col items-center">
        <div className="w-10 h-10 rounded-xl bg-blue-900 flex items-center justify-center text-white mb-3">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        </div>

        <h2 className="text-l font-semibold text-gray-900 mb-2">
          Welcome to the MENRO Officer Manual
        </h2>
        <p className="text-sm text-gray-500 max-w-md mb-3">
          This guide walks you through every part of the AGOS system — from reading
          the regional map to managing canal hotspots and generating reports. Pick a
          topic anytime, or follow the steps in order.
        </p>

        <div className="grid grid-cols-3 gap-3 max-w-md w-full mb-5">
          <div className="bg-gray-50 rounded-lg px-3 py-3 text-left">
            <p className="text-sm font-medium text-gray-900">7 Topics</p>
            <p className="text-xs text-gray-500">Covering the full dashboard</p>
          </div>
          <div className="bg-gray-50 rounded-lg px-3 py-3 text-left">
            <p className="text-sm font-medium text-gray-900">Step-by-Step</p>
            <p className="text-xs text-gray-500">Guides with screenshots</p>
          </div>
          <div className="bg-gray-50 rounded-lg px-3 py-3 text-left">
            <p className="text-sm font-medium text-gray-900">Searchable</p>
            <p className="text-xs text-gray-500">Find what you need fast</p>
          </div>
        </div>

        <button
          onClick={onGetStarted}
          className="bg-green-700 text-white text-sm font-medium px-4 py-3 rounded-lg hover:bg-green-700"
        >
          Get started →
        </button>
      </div>
    </div>
</div>
  )
}