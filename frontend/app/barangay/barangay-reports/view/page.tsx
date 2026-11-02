"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import CanalReportDetail from "@/components/CanalReportDetail"

function ViewBarangayReportInner() {
  const id = useSearchParams().get("id")
  return <CanalReportDetail id={id} backHref="/barangay/barangay-reports" />
}

export default function ViewBarangayReport() {
  return (
    <Suspense fallback={null}>
      <ViewBarangayReportInner />
    </Suspense>
  )
}