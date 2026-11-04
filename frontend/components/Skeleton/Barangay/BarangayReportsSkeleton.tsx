"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"

import { FaSearch } from "react-icons/fa"

import { useFillRows } from "@/components/hooks/useFillRows"

import { DateRangeFilter } from "@/components/DateRangeFilter"

const selectTrigger = "cursor-pointer text-xs px-3 py-4 bg-white border-2 border-[#C6C6C8] text-[#122A48] rounded-lg font-medium"

// loading state of the barangay's own Reports page (app/barangay/barangay-reports)
export function BarangayReportsSkeleton() {
  const { panelRef, tableWrapRef, rows } = useFillRows({
    rowHeight: 56,
    initialRows: 5,
  })

  return (
    <div className="flex flex-col h-full">

      {/* filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center bg-[#FAFCFD] border-2 border-[#C6C6C8] rounded-lg px-3 gap-2 h-9 w-55">
          <FaSearch size={14} className="text-[#C6C6C8]" />
          <Input disabled placeholder="Search..." className="text-xs bg-transparent border-0 rounded-lg placeholder:text-gray text-[#122A48] focus-visible:ring-0 h-7 w-full" />
        </div>

        <DateRangeFilter from="" to="" onChange={() => {}} disabled width="w-[260px]" />

        {["All Submissions", "All Severity", "All Status"].map(label => (
          <Select key={label} value="All" disabled>
            <SelectTrigger className={selectTrigger}>
              <SelectValue>{label}</SelectValue>
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="All" className="p-2 text-xs">{label}</SelectItem>
            </SelectContent>
          </Select>
        ))}

        <Skeleton className="ml-auto h-9 w-32 rounded-md" />
      </div>

      {/* summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full text-[#122A48] mt-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg border-2 border-[#C6C6C8] h-17 min-[2560px]:h-20 min-[3840px]:h-24 w-full flex items-center p-3 gap-3 bg-[#FAFCFD] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)]">
            <Skeleton className="h-9 w-9 rounded-lg flex-shrink-0" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-5 w-8" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>

      {/* submit to MENRO + performance */}
      <div className="mt-4 grid grid-cols-1 gap-x-3 gap-y-3 lg:grid-cols-2">
        <div className="flex h-full w-full flex-col rounded-xl border border-[#e2e8f0] bg-white p-3.5 shadow-[0_2px_4px_rgba(0,0,0,0.06)]">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-6 w-16 rounded-xl" />
          </div>
          <Skeleton className="h-3.5 w-56" />
          <Skeleton className="mt-2 h-3 w-44" />
          <Skeleton className="mt-3 h-3 w-28" />
        </div>

        <div className="flex h-full w-full flex-col rounded-xl border border-[#e2e8f0] bg-white p-3.5 shadow-[0_2px_4px_rgba(0,0,0,0.06)]">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <div className="flex flex-wrap items-stretch gap-x-5 gap-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-14" />
                <Skeleton className="h-2.5 w-16" />
              </div>
            ))}
            <div className="min-w-[16rem] flex-1 self-end">
              <Skeleton className="h-9 w-full" />
            </div>
          </div>
        </div>
      </div>

      {/* table */}
      <div ref={panelRef} className="flex-1 min-h-[412px] mt-2 bg-[#FAFCFD] border border-[#00000040] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] rounded-lg flex flex-col">
        <div className="w-full p-2">
          <p className="text-sm font-bold text-[#122A48]">Recent Reports</p>
        </div>

        <div ref={tableWrapRef}>
          <Table>
            <TableHeader className="bg-[#e8eef1b4] border border-[#CFD8DC] h-12 rounded-lg">
              <TableRow>
                {["DATE SUBMITTED", "PERIOD", "PUROK", "SEVERITY", "STATUS", "WASTE", "FILED BY", "ACTIONS"].map(h => (
                  <TableHead key={h} className="font-semibold text-left text-xs text-[#727272]">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(rows)].map((_, i) => (
                <TableRow key={i} className="border-b border-[#C6C6C8]">
                  <TableCell className="h-14"><Skeleton className="h-3.5 w-20" /></TableCell>
                  <TableCell className="h-14">
                    <Skeleton className="h-3.5 w-20" />
                    <Skeleton className="mt-1 h-4 w-14 rounded-full" />
                  </TableCell>
                  <TableCell className="h-14"><Skeleton className="h-3.5 w-20" /></TableCell>
                  <TableCell className="h-14"><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                  <TableCell className="h-14"><Skeleton className="h-5 w-24 rounded-lg" /></TableCell>
                  <TableCell className="h-14">
                    <Skeleton className="h-3.5 w-16" />
                    <Skeleton className="mt-1 h-2.5 w-10" />
                  </TableCell>
                  <TableCell className="h-14"><Skeleton className="h-3.5 w-24" /></TableCell>
                  <TableCell className="h-14">
                    <div className="flex gap-3">
                      <Skeleton className="h-9 w-16 rounded-lg" />
                      <Skeleton className="h-9 w-20 rounded-lg" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
