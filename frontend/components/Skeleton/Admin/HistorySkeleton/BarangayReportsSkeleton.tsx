"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"

import { FaSearch } from "react-icons/fa"
import { Calendar as CalendarIcon } from "lucide-react"
import { useState } from "react"

import { useFillRows } from "@/components/hooks/useFillRows"

export function BarangayReportsSkeleton() {
  const [filterBarangay, setFilterBarangay] = useState<string>("All")
  const [selectedMonth, setSelectedMonth] = useState<string>("current")

  const { panelRef, tableWrapRef, rows } = useFillRows({
    rowHeight: 56,
    initialRows: 5,
  })

  return (
    <div className="hidden md:flex md:flex-col md:h-full">

      {/* filters */}
      <div className="flex justify-between">
        <div className="flex gap-3">
          <div className="flex items-center bg-[#FAFCFD] border-2 border-[#C6C6C8] rounded-lg px-3 gap-2 h-9 w-55">
            <FaSearch size={14} className="text-[#C6C6C8]" />
            <Input disabled placeholder="Search..." className="text-xs bg-transparent border-0 rounded-lg placeholder:text-gray text-[#122A48] focus-visible:ring-0 h-7 w-full" />
          </div>

          <Select value={filterBarangay} onValueChange={setFilterBarangay}>
            <SelectTrigger className="text-xs cursor-pointer w-40 px-3 py-4 bg-white border-2 border-[#C6C6C8] text-[#122A48] rounded-lg font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="All" className="p-2 text-xs">All Barangays</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="cursor-pointer text-xs w-40 px-3 py-4 bg-white border-2 border-[#C6C6C8] text-[#122A48] rounded-lg font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="current" className="p-2 text-xs">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
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

      {/* monthly report progress */}
      <div className="mt-2 flex gap-2 w-full">
        <div className="flex-[3]">
          <div className="bg-[#FAFCFD] border border-[#C2C1C1] rounded-lg p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-6 w-24" />
            </div>
            <Skeleton className="h-3 w-full rounded-full" />
            <div className="flex gap-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-2 w-2 rounded-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-[#58D07159] rounded-lg flex justify-center flex-1 min-w-[240px]">
          <div className="flex gap-4.5 items-center">
            <CalendarIcon color="#2C7B3C" size={32} />
            <div>
              <p className="text-sm font-semibold text-[#2C7B3C]">Reporting Period</p>
              <Skeleton className="h-3.5 w-32 mt-1 bg-[#2C7B3C33]" />
            </div>
          </div>
        </div>
      </div>

      {/* table */}
      <div ref={panelRef} className="flex-1 min-h-[412px] mt-2 bg-[#FAFCFD] border border-[#00000040] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] rounded-lg flex flex-col">
        <div ref={tableWrapRef}>
          <Table>
            <TableHeader className="bg-[#e8eef1b4] border border-[#CFD8DC] h-12 rounded-lg">
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
      </div>
    </div>
  )
}