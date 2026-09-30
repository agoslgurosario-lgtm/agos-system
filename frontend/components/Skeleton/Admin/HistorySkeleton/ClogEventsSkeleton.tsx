"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"

import { FaSearch } from "react-icons/fa"
import { FileSearch, FileDown } from "lucide-react"
import { useState } from "react"

import { useFillRows } from "@/components/hooks/useFillRows"

export function ClogEventsSkeleton() {
  const [barangay, setBarangay] = useState<string>("All Barangay")
  const [severity, setSeverity] = useState<string>("All Severity")
  const [status, setStatus] = useState<string>("All Status")
  const [selectedMonth, setSelectedMonth] = useState<string>("All Months")

  const { panelRef, tableWrapRef, rows } = useFillRows({
    rowHeight: 52,
    initialRows: 9,
  })

  return (
    <div className="hidden md:flex md:flex-col md:h-full">

      {/* filter and export container */}
      <div className="flex justify-between w-full">
        <div className="flex gap-3 w-full">
          <div className="flex items-center bg-[#FAFCFD] border-2 border-[#C6C6C8] rounded-lg px-3 gap-2 h-9 w-60">
            <FaSearch size={14} className="text-[#C6C6C8]" />
            <input disabled suppressHydrationWarning placeholder="Search clog event..." className="text-xs bg-transparent border-0 rounded-lg placeholder:text-gray text-[#122A48] outline-none w-full" />
          </div>

          <Select value={barangay} onValueChange={setBarangay}>
            <SelectTrigger className="text-xs cursor-pointer px-3 py-[16px] bg-white border-2 border-[#C6C6C8] text-[#122A48] rounded-lg font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem className="text-xs p-2" value="All Barangay">All Barangay</SelectItem>
            </SelectContent>
          </Select>

          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger className="text-xs cursor-pointer px-3 py-[16px] bg-white border-2 border-[#C6C6C8] text-[#122A48] rounded-lg font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem className="text-xs p-2" value="All Severity">All Severity</SelectItem>
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="text-xs cursor-pointer px-3 py-[16px] bg-white border-2 border-[#C6C6C8] text-[#122A48] rounded-lg font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem className="text-xs p-2" value="All Status">All Status</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="text-xs cursor-pointer px-3 py-[16px] bg-white border-2 border-[#C6C6C8] text-[#122A48] rounded-lg font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem className="text-xs p-2" value="All Months">All Months</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Button disabled className="bg-[#2fd45b] opacity-60">
            <FileDown size={16} className="mr-1" /> Export PDF
          </Button>
        </div>
      </div>

      {/* summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full text-[#122A48] mt-3">
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

      {/* table and preview */}
      <div className="flex gap-3 mt-3 flex-1 min-h-[520px]">

        {/* Table */}
        <div ref={panelRef} className="bg-[#FAFCFD] border border-[#00000040] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] flex-[3] min-w-0 rounded-lg flex flex-col">
          <div ref={tableWrapRef}>
            <Table>
              <TableHeader className="bg-[#e8eef1b4] border border-[#CFD8DC] h-12">
                <TableRow>
                  <TableHead className="font-semibold text-left text-xs text-[#727272]">EVENT ID</TableHead>
                  <TableHead className="font-semibold text-left text-xs text-[#727272]">SEVERITY</TableHead>
                  <TableHead className="font-semibold text-left text-xs text-[#727272]">DETECTED AT</TableHead>
                  <TableHead className="font-semibold text-left text-xs text-[#727272]">RESOLVED AT</TableHead>
                  <TableHead className="font-semibold text-left text-xs text-[#727272]">LOCATION</TableHead>
                  <TableHead className="font-semibold text-left text-xs text-[#727272]">WATER LEVEL</TableHead>
                  <TableHead className="font-semibold text-left text-xs text-[#727272]">WATER FLOW</TableHead>
                  <TableHead className="font-semibold text-left text-xs text-[#727272]">STATUS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(rows)].map((_, i) => (
                  <TableRow key={i} className="border-b border-[#C6C6C8]">
                    <TableCell className="h-13"><Skeleton className="h-3.5 w-6" /></TableCell>
                    <TableCell className="h-13"><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell className="h-13"><Skeleton className="h-3.5 w-24" /></TableCell>
                    <TableCell className="h-13"><Skeleton className="h-3.5 w-24" /></TableCell>
                    <TableCell className="h-13"><Skeleton className="h-3.5 w-20" /></TableCell>
                    <TableCell className="h-13"><Skeleton className="h-3.5 w-14" /></TableCell>
                    <TableCell className="h-13"><Skeleton className="h-3.5 w-16" /></TableCell>
                    <TableCell className="h-13"><Skeleton className="h-3.5 w-14" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-auto flex items-center justify-between px-4 py-3 border-t border-[#C6C6C8]">
            <Skeleton className="h-4 w-24" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24 rounded-lg" />
              <Skeleton className="h-9 w-20 rounded-lg" />
            </div>
          </div>
        </div>

        {/* preview panel — stays in its real "no selection" empty state */}
        <div className="border border-[#C6C6C8] rounded-lg bg-[#F8F9FA] flex-1 min-w-[240px]">
          <div className="flex flex-col gap-3 justify-center items-center h-full">
            <FileSearch size={70} className="text-[#1565BC80]" />
            <p className="text-[#122A488F] font-bold -my-1">No Event Selected</p>
            <p className="text-[#122A4873] text-xs text-center">Select a record from the table <br />to view details.</p>
          </div>
        </div>

      </div>
    </div>
  )
}