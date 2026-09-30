"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select"
import { Input } from "@/components/ui/input"

import { FaSearch } from "react-icons/fa"
import { useFillRows } from "@/components/hooks/useFillRows"

import { useState } from "react"

export function BarangaySkeleton() {
  const [statusFilter, setStatusFilter] = useState<string>('All')

  const { panelRef, tableWrapRef, rows } = useFillRows({
    rowHeight: 56,
    initialRows: 7,
  })

  return (
    <>
      <div className="hidden md:flex md:flex-col md:h-full">

        {/* title container */}
        <div className="flex justify-between w-full mb-2">
          <div className="text-[#122A48] flex justify-center items-center text-[15px]">
            <p className="font-bold">Barangay</p>
          </div>
        </div>

        {/* total cards */}
        <div className="grid grid-cols-3 gap-3 w-full">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-lg border-2 border-[#C6C6C8] h-17 min-[2560px]:h-20 min-[3840px]:h-24 w-full flex items-center p-3 gap-3 bg-[#FAFCFD]">
              <Skeleton className="h-9 w-9 rounded-lg flex-shrink-0" />
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-5 w-8" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>

        {/* table */}
        <div ref={panelRef} className="bg-[#FAFCFD] rounded-lg border-2 border-[#C6C6C8] mt-2 pt-2 shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] flex flex-col flex-1 min-h-[528px]">
          <div className="flex justify-between items-center mx-3 mb-2">
            <Skeleton className="h-4 w-28" />

            <div className="flex gap-3 items-center">
              <div className="flex items-center bg-[#FAFCFD] border-2 border-[#C6C6C8] rounded-lg px-3 gap-2 h-8 w-50">
                <FaSearch size={14} className="text-[#C6C6C8]" />
                <Input disabled placeholder="Search Barangay..." className="text-xs bg-transparent border-0 rounded-lg placeholder:text-gray text-[#122A48] focus-visible:ring-0 h-7 w-full" />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="cursor-pointer py-3 text-xs border border-[#C6C6C8] bg-[#FAFCFD] rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="All" className="p-2 text-xs">All Barangay</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div ref={tableWrapRef}>
            <Table>
              <TableHeader className="bg-[#e8eef1b4] border-[#727272]">
                <TableRow>
                  <TableHead className="text-[#727272] text-left text-xs font-semibold w-16">ID</TableHead>
                  <TableHead className="text-[#727272] text-left text-xs font-semibold w-1/3">BARANGAY</TableHead>
                  <TableHead className="text-[#727272] text-left text-xs font-semibold w-1/4">LOCATION</TableHead>
                  <TableHead className="text-[#727272] text-left text-xs font-semibold w-1/4">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(rows)].map((_, i) => (
                  <TableRow key={i} className="border-b border-[#C6C6C8]">
                    <TableCell className="h-14"><Skeleton className="h-3.5 w-6" /></TableCell>
                    <TableCell className="h-14"><Skeleton className="h-3.5 w-28" /></TableCell>
                    <TableCell className="h-14"><Skeleton className="h-8 w-28 rounded-lg" /></TableCell>
                    <TableCell className="h-14"><Skeleton className="h-8 w-24 rounded-lg" /></TableCell>
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

      {/* -------------------------------------------------------------------------------------- */}

      {/* for mobile */}
      <div className="md:hidden text-[#122A48]">
        <div className="flex justify-between items-center">
          <p className="font-bold">Barangay</p>
        </div>

        <div className="flex gap-2 justify-between mt-3">
          <div className="flex items-center bg-[#FAFCFD] border-1 border-[#C6C6C8] rounded-lg px-3 h-8 flex-1">
            <FaSearch size={13} className="text-[#C6C6C8]" />
            <Input disabled placeholder="Search Barangay..." className="text-xs bg-transparent border-0 rounded-lg placeholder:text-gray text-[#122A48] focus-visible:ring-0 h-7 w-full" />
          </div>
        </div>

        {/* Cards */}
        <div className="flex gap-2 w-full mt-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-lg border border-[#C6C6C8] h-18 flex-1 flex items-center p-2 gap-2 bg-[#FAFCFD]">
              <Skeleton className="h-8 w-8 rounded-lg flex-shrink-0" />
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-4.5 w-6" />
                <Skeleton className="h-3 w-14" />
              </div>
            </div>
          ))}
        </div>

        {/* Barangay Cards */}
        <div className="rounded-lg h-150 mt-3">
          <Skeleton className="h-4 w-24 mb-3" />

          <div className="flex flex-col">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-3 mb-3">
                <div className="p-2 rounded-lg border border-[#C6C6C8] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] w-full">
                  <div className="flex justify-between w-full border-b border-[#C6C6C8] pb-2 pt-1">
                    <div className="flex gap-2 items-center">
                      <Skeleton className="h-4 w-8 rounded-lg" />
                      <Skeleton className="h-3.5 w-24" />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-3">
                    <Skeleton className="h-11 w-25 rounded-lg" />
                    <Skeleton className="h-11 w-23 rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}