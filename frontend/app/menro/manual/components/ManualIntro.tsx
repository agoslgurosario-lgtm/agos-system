export default function ManualIntro() {
  return (
    <div className="bg-white px-6 pt-5 pb-4 flex items-center gap-3 border-b border-gray-100">
      <div className="w-10 h-10 rounded-lg bg-blue-900 flex items-center justify-center text-white shrink-0">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      </div>
      <div>
        <h2 className="text-base font-semibold text-gray-900">MENRO Officer Manual</h2>
        <p className="text-xs text-gray-500">
          This manual covers the step-by-step guide for using the AGOS system
        </p>
      </div>
    </div>
  )
}