"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { useState } from "react"

import { useFillRows } from "@/components/hooks/useFillRows"

export function BarangayReportsSkeleton() {
  const [selectedMonth, setSelectedMonth] = useState<string>("current")
  const [filterBarangay, setFilterBarangay] = useState<string>("All")
  const [filterStatus, setFilterStatus] = useState<string>("All")

  const { panelRef, tableWrapRef, rows } = useFillRows({
    rowHeight: 56,
    initialRows: 8,
  })

  return (
    <div className="hidden md:flex md:flex-col md:h-full">

      {/* top filter */}
      <div className="flex justify-between">
        <div className="flex gap-3">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="cursor-pointer px-3 py-3 bg-white border-2 border-[#C6C6C8] text-[#122A48] rounded-lg font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem className="p-2 py-1 text-[#122A48]" value="current">This Month</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterBarangay} onValueChange={setFilterBarangay}>
            <SelectTrigger className="px-3 py-2 bg-white border-2 border-[#C6C6C8] text-[#122A48] rounded-lg font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="All">All Barangays</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="cursor-pointer px-3 py-3 bg-white border-2 border-[#C6C6C8] text-[#122A48] rounded-lg font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="All" className="p-2 py-1 text-[#122A48]">All Severity</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* barangay reports table */}
      <div className="flex gap-4 mt-3 flex-1 min-h-[600px]">
        <div ref={panelRef} className="bg-[#FAFCFD] border border-[#00000040] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] w-full rounded-lg flex flex-col">
          <Skeleton className="h-4 w-32 m-3" />

          <div ref={tableWrapRef}>
            <Table>
              <TableHeader className="bg-[#e8eef1b4] border border-[#CFD8DC]">
                <TableRow>
                  <TableHead className="font-semibold text-left text-xs text-[#727272]">DATE OBSERVED</TableHead>
                  <TableHead className="font-semibold text-left text-xs text-[#727272]">BARANGAY</TableHead>
                  <TableHead className="font-semibold text-left text-xs text-[#727272]">CANAL</TableHead>
                  <TableHead className="font-semibold text-left text-xs text-[#727272]">SEVERITY</TableHead>
                  <TableHead className="font-semibold text-left text-xs text-[#727272]">FINAL CONDITION</TableHead>
                  <TableHead className="font-semibold text-left text-xs text-[#727272]">FILED BY</TableHead>
                  <TableHead className="font-semibold text-left text-xs text-[#727272]">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(rows)].map((_, i) => (
                  <TableRow key={i} className="border-b border-[#C6C6C8]">
                    <TableCell className="h-14"><Skeleton className="h-3.5 w-20" /></TableCell>
                    <TableCell className="h-14"><Skeleton className="h-3.5 w-24" /></TableCell>
                    <TableCell className="h-14"><Skeleton className="h-3.5 w-28" /></TableCell>
                    <TableCell className="h-14"><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                    <TableCell className="h-14"><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                    <TableCell className="h-14"><Skeleton className="h-3.5 w-24" /></TableCell>
                    <TableCell className="h-14">
                      <div className="flex gap-3">
                        <Skeleton className="h-9 w-16 rounded-lg" />
                        <Skeleton className="h-9 w-26 rounded-lg" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-auto">
            <div className="flex items-center justify-between px-4 py-3 border-t border-[#C6C6C8]">
              <Skeleton className="h-4 w-24" />
              <div className="flex gap-2">
                <Skeleton className="h-9 w-24 rounded-lg" />
                <Skeleton className="h-9 w-20 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}