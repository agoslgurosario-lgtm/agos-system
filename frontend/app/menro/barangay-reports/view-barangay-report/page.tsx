"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import CanalReportDetail from "@/components/CanalReportDetail"

function ViewBarangayReportMenroInner() {
  const id = useSearchParams().get("id")
  return <CanalReportDetail id={id} backHref="/menro/barangay-reports" />
}

export default function ViewBarangayReportMenro() {
  return (
    <Suspense fallback={null}>
      <ViewBarangayReportMenroInner />
    </Suspense>
  )
}