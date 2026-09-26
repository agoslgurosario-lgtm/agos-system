"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import CanalReportDetail from "@/components/CanalReportDetail"

function ViewBarangayReportAdminInner() {
  const id = useSearchParams().get("id")
  return <CanalReportDetail id={id} backHref="/admin/history/barangay-reports" />
}

export default function ViewBarangayReportAdmin() {
  return (
    <Suspense fallback={null}>
      <ViewBarangayReportAdminInner />
    </Suspense>
  )
}