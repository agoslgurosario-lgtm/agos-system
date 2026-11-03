"use client"

import { AlertTriangle } from "lucide-react"
import type { SignatoryStatus } from "@/lib/hooks/useSignatoryStatus"

export function SignatoryBanner({ status }: { status: SignatoryStatus }) {
  if (status.loading || status.complete) return null
  return (
    <div role="alert" className="flex items-start gap-3 rounded-lg border border-[#FDD1D2] bg-[#FEF2F2] p-4 text-sm text-[#CC251F]">
      <AlertTriangle size={18} className="mt-0.5 shrink-0" />
      <div>
        <p className="font-bold">Reports can't be submitted yet</p>
        {status.error ? (
          <p>We couldn't check your barangay's signatories. Please try again.</p>
        ) : (
          <p>
            Your barangay needs all four signatories set before submitting. Missing:{" "}
            <span className="font-semibold">{status.missing.join(", ")}</span>.
            Please contact your administrator.
          </p>
        )}
      </div>
    </div>
  )
}
