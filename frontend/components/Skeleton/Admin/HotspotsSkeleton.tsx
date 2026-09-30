"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { FaSearch } from "react-icons/fa"
import { useState } from "react"

import { useFillRows } from "@/components/hooks/useFillRows"

export function HotspotsSkeleton() {
  const [barangayFilter, setBarangayFilter] = useState<string>("All")

  const { panelRef, tableWrapRef, rows } = useFillRows({
    rowHeight: 56,
    initialRows: 4,
  })

  return (
    <div className="hidden md:flex md:flex-col md:h-full">

      {/* Header */}
      <div className="flex justify-between w-full mb-2">
        <div className="font-bold text-[#122A48] flex justify-center items-center">
          <p className="text-[15px]">Canal Hotspots</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 w-full text-[#122A48]">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-lg border-2 border-[#C6C6C8] h-17 min-[2560px]:h-20 min-[3840px]:h-24 w-full flex items-center p-3 gap-3 bg-[#FAFCFD] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)]">
            <Skeleton className="h-9 w-9 rounded-lg flex-shrink-0" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-5 w-8" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="flex gap-4 mt-2 flex-1 min-h-[528px]">
        <div ref={panelRef} className="bg-[#FAFCFD] border border-[#00000040] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] w-full rounded-lg flex flex-col">
          <div className="flex justify-between items-center p-2 px-3">
            <Skeleton className="h-4 w-24" />

            <div className="flex gap-3 items-center">
              <div className="flex items-center bg-[#FAFCFD] border-2 border-[#C6C6C8] rounded-lg px-3 gap-2 h-8 w-60">
                <FaSearch size={14} className="text-[#C6C6C8]" />
                <Input disabled placeholder="Search hotspot..." className="text-xs bg-transparent border-0 rounded-lg placeholder:text-gray text-[#122A48] focus-visible:ring-0 h-7 w-full" />
              </div>

              <Select value={barangayFilter} onValueChange={setBarangayFilter}>
                <SelectTrigger className="cursor-pointer text-xs px-3 py-3 bg-white border-2 border-[#C6C6C8] text-[#122A48] rounded-lg font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="All" className="cursor-pointer text-xs p-2">All Barangays</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

        <div ref={tableWrapRef}>
          <Table>
            <TableHeader className="bg-[#e8eef1b4] border border-[#CFD8DC]">
              <TableRow>
                <TableHead className="font-semibold text-left text-xs text-[#727272]">ID</TableHead>
                <TableHead className="font-semibold text-left text-xs text-[#727272]">BARANGAY</TableHead>
                <TableHead className="font-semibold text-left text-xs text-[#727272]">HOTSPOTS</TableHead>
                <TableHead className="font-semibold text-left text-[#727272] text-xs">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(rows)].map((_, i) => (
                <TableRow key={i} className="border-b border-[#C6C6C8]">
                  <TableCell className="h-14"><Skeleton className="h-3.5 w-6" /></TableCell>
                  <TableCell className="h-14"><Skeleton className="h-3.5 w-28" /></TableCell>
                  <TableCell className="h-14"><Skeleton className="h-3.5 w-20" /></TableCell>
                  <TableCell className="h-14">
                    <div className="flex gap-3">
                      <Skeleton className="h-9 w-24 rounded-lg" />
                      <Skeleton className="h-9 w-28 rounded-lg" />
                    </div>
                  </TableCell>
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
      </div>
    </div>
  )
}