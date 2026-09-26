"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"

import { ChevronDown, FileDown } from "lucide-react"
import { FaSearch } from "react-icons/fa"

import { useFillRows } from "@/components/hooks/useFillRows"

export function MaintenanceLogsSkeleton() {
  const { panelRef, tableWrapRef, rows } = useFillRows({
    rowHeight: 33,
    initialRows: 14,
  })
  return (
    <div className="w-full h-full flex flex-col gap-2 max-w-full box-border">

      {/* Toolbar */}
      <div className="w-full flex gap-2 items-center justify-between">
        <div className="flex items-center bg-[#FAFCFD] border-2 border-[#C6C6C8] rounded-lg px-3 gap-2 h-9 w-150">
          <FaSearch size={14} className="text-[#C6C6C8]" />
          <input disabled suppressHydrationWarning placeholder="Search maintenance logs..." className="text-xs bg-transparent border-0 rounded-lg placeholder:text-gray text-[#122A48] outline-none w-full" />
        </div>

        <div className="relative flex gap-2">
          <button
            disabled
            className="flex items-center justify-between w-[200px] h-9 px-3 border border-[#D0D0D0] rounded-lg bg-white text-[12px] font-normal text-[#999999] outline-none text-left"
          >
            <span>All Months</span>
            <ChevronDown size={14} className="text-[#999999]" />
          </button>

          <Button disabled className="bg-[#2fd45b] opacity-60 py-[17px]">
            <FileDown size={16} /> Export PDF
          </Button>
        </div>
      </div>

      {/* Table card */}
      <div ref={panelRef} className="bg-[#FAFCFD] border border-[#00000040] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] w-full rounded-lg flex flex-col overflow-hidden min-w-0 mt-2 flex-1 min-h-[596px]">
        <Skeleton className="h-4 w-36 m-2" />

        <div ref={tableWrapRef} className="w-full overflow-x-auto">
          <Table className="w-full min-w-[500px]">
            <TableHeader className="bg-[#e8eef1b4] border border-[#CFD8DC]">
              <TableRow>
                <TableHead className="font-semibold text-left text-[#727272] text-xs px-1 whitespace-nowrap">NODE</TableHead>
                <TableHead className="font-semibold text-left text-[#727272] text-xs px-1 whitespace-nowrap">REASON</TableHead>
                <TableHead className="font-semibold text-left text-[#727272] text-xs px-1 whitespace-nowrap">DATE MARKED</TableHead>
                <TableHead className="font-semibold text-left text-[#727272] text-xs px-1 whitespace-nowrap">DATE FIXED</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(rows)].map((_, i) => (
                <TableRow key={i} className="border-b border-[#C6C6C8]">
                  <TableCell className="px-2 py-3"><Skeleton className="h-2 w-20" /></TableCell>
                  <TableCell className="px-2 py-3"><Skeleton className="h-2 w-56" /></TableCell>
                  <TableCell className="px-2 py-3"><Skeleton className="h-2 w-32" /></TableCell>
                  <TableCell className="px-2 py-3"><Skeleton className="h-2 w-32" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-auto flex items-center justify-between px-4 py-3 border-t border-[#00000015]">
          <Skeleton className="h-4 w-24" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24 rounded-lg" />
            <Skeleton className="h-9 w-20 rounded-lg" />
          </div>
        </div>
      </div>

    </div>
  )
}