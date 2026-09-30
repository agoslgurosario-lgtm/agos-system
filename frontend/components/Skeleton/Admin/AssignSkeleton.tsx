"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"

import { MapPinPlus } from "lucide-react"
import { FaSearch } from "react-icons/fa"
import { useState } from "react"

import { useFillRows } from "@/components/hooks/useFillRows"

export function AssignSkeleton() {
  const [statusFilter, setStatusFilter] = useState<string>("All Status")

  const { panelRef, tableWrapRef, rows } = useFillRows({
    rowHeight: 56,
    initialRows: 5,
  })

  return (
    <div className="hidden md:flex md:flex-col md:h-full">

      {/* Header */}
      <div className="flex justify-between w-full">
        <div className="font-bold text-[#122A48] flex justify-center items-center text-[15px]">
          <p>Node Assignment</p>
        </div>
        <Button disabled className="p-5 py-[16px] rounded-lg bg-[#1565BC] text-white opacity-60 shadow-[0_6px_4px_-4px_rgba(0,0,0,0.2)]">
          <MapPinPlus size={16} /> Assign Node
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 w-full text-[#122A48] mt-2">
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
      <div className="flex gap-4 mt-3 flex-1 min-h-[528px]">
        <div ref={panelRef} className="bg-[#FAFCFD] border border-[#00000040] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] w-full rounded-lg flex flex-col">
          <div className="flex justify-between items-center p-2">
            <Skeleton className="h-4 w-36" />

            <div className="flex gap-3 items-center">
              <div className="flex items-center bg-[#FAFCFD] border-2 border-[#C6C6C8] rounded-lg px-3 gap-2 h-8 w-60">
                <FaSearch size={14} className="text-[#C6C6C8]" />
                <Input disabled placeholder="Search assigned node..." className="text-xs bg-transparent border-0 rounded-lg placeholder:text-gray text-[#122A48] focus-visible:ring-0 h-7 w-full" />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="cursor-pointer text-xs px-3 py-3 bg-white border-2 border-[#C6C6C8] text-[#122A48] rounded-lg font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem className="cursor-pointer p-2 text-xs" value="All Status">All Status</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div ref={tableWrapRef}>
            <Table>
              <TableHeader className="bg-[#e8eef1b4] border border-[#CFD8DC]">
                <TableRow>
                  <TableHead className="font-semibold text-left text-xs text-[#727272]">NODE</TableHead>
                  <TableHead className="font-semibold text-left text-xs text-[#727272]">BARANGAY</TableHead>
                  <TableHead className="font-semibold text-left text-xs text-[#727272]">NODE NAME</TableHead>
                  <TableHead className="font-semibold text-left text-xs text-[#727272]">HOTSPOT</TableHead>
                  <TableHead className="font-semibold text-left text-xs text-[#727272]">LOCATION</TableHead>
                  <TableHead className="font-semibold text-left text-xs text-[#727272]">STATUS</TableHead>
                  <TableHead className="font-semibold text-left text-xs text-[#727272]">INSTALLED</TableHead>
                  <TableHead className="font-semibold text-left text-[#727272] text-xs">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(rows)].map((_, i) => (
                  <TableRow key={i} className="border-b border-[#C6C6C8]">
                    <TableCell className="h-14"><Skeleton className="h-3.5 w-6" /></TableCell>
                    <TableCell className="h-14"><Skeleton className="h-3.5 w-20" /></TableCell>
                    <TableCell className="h-14"><Skeleton className="h-3.5 w-24" /></TableCell>
                    <TableCell className="h-14"><Skeleton className="h-3.5 w-20" /></TableCell>
                    <TableCell className="h-14"><Skeleton className="h-8 w-26 rounded-lg" /></TableCell>
                    <TableCell className="h-14"><Skeleton className="h-6 w-18 rounded-full" /></TableCell>
                    <TableCell className="h-14"><Skeleton className="h-3.5 w-18" /></TableCell>
                    <TableCell className="h-14">
                      <div className="flex gap-2">
                        <Skeleton className="h-9 w-18 rounded-lg" />
                        <Skeleton className="h-9 w-22 rounded-lg" />
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