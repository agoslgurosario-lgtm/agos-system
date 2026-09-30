"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

import { FaSearch } from "react-icons/fa"
import { useState } from "react"

import { useFillRows } from "@/components/hooks/useFillRows"

const ALERT_TYPE_LABELS = ["All", "Water Level Rising", "Low Clog Alert", "Moderate Clog Alert", "Critical Clog"]

export function AlertsSkeleton() {
  const [barangay, setBarangay] = useState<string>("All Barangay")
  const [dateFilter, setDateFilter] = useState<string>("Today")

  const { panelRef, tableWrapRef, rows } = useFillRows({
    rowHeight: 50.5,
    initialRows: 9,
  })

  return (
    <div className="hidden md:flex md:flex-col md:h-full">

      {/* filter container */}
      <div className="flex justify-between">
        <div className="flex items-center bg-[#FAFCFD] border-2 border-[#C6C6C8] rounded-lg px-3 gap-2 h-9 w-100">
          <FaSearch size={14} className="text-[#C6C6C8]" />
          <Input disabled suppressHydrationWarning placeholder="Search notification..." className="text-xs bg-transparent border-0 rounded-lg placeholder:text-gray text-[#122A48] focus-visible:ring-0 h-7 w-full" />
        </div>

        <div className="flex gap-3">
          <Select value={barangay} onValueChange={setBarangay}>
            <SelectTrigger className="w-40 px-3 py-4 text-xs bg-white border-2 border-[#C6C6C8] text-[#122A48] rounded-lg font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem className="text-xs" value="All Barangay">All Barangay</SelectItem>
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="text-xs px-3 py-4 bg-white border-2 border-[#C6C6C8] text-[#122A48] rounded-lg font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem className="p-2 text-xs" value="Today">Today</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* notif list container */}
      <div ref={panelRef} className="bg-[#F8F9FA] rounded-lg mt-2 shadow-[0_0_8px_rgba(0,0,0,0.15)] flex flex-col flex-1 min-h-[604px]">
        <div className="flex w-full p-3 items-center justify-between flex-wrap gap-2">
          <Skeleton className="h-4 w-28" />
          <div className="flex gap-2 flex-wrap">
            {ALERT_TYPE_LABELS.map(t => (
              <Button key={t} disabled className="rounded-full border px-4 py-1.5 text-xs font-medium bg-transparent text-[#122A48] border-[#C6C6C8]">
                {t}
              </Button>
            ))}
          </div>
        </div>

        <hr />

        {/* alert table */}
        <div ref={tableWrapRef} className="flex flex-col gap-3 flex-1">
          <Table>
            <TableHeader className="bg-[#e8eef1b4] border border-[#CFD8DC] h-12">
              <TableRow>
                <TableHead className="font-semibold text-left text-xs text-[#727272]">NODE</TableHead>
                <TableHead className="font-semibold text-left text-xs text-[#727272]">TYPE</TableHead>
                <TableHead className="font-semibold text-left text-xs text-[#727272]">BARANGAY</TableHead>
                <TableHead className="font-semibold text-left text-xs text-[#727272]">DETECTED</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(rows)].map((_, i) => (
                <TableRow key={i} className="border-b border-[#C6C6C8]">
                  <TableCell className="h-[50.5px]"><Skeleton className="h-3.5 w-24" /></TableCell>
                  <TableCell className="h-[50.5px]"><Skeleton className="h-5 w-28 rounded-full" /></TableCell>
                  <TableCell className="h-[50.5px]"><Skeleton className="h-3.5 w-20" /></TableCell>
                  <TableCell className="h-[50.5px]"><Skeleton className="h-3.5 w-32" /></TableCell>
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
  )
}