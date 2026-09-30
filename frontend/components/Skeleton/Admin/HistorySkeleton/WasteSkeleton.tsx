"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { FaSearch } from "react-icons/fa"
import { FileSearch, FileDown } from "lucide-react"
import { useState } from "react"

import { useFillRows } from "@/components/hooks/useFillRows"

export function WasteSkeleton() {
  const [barangayFilterOpt, setBarangayFilterOpt] = useState<string>("All Barangay")
  const [dominantWaste, setDominantWaste] = useState<string>("All Waste")
  const [sensorNode, setSensorNode] = useState<string>("All Nodes")
  const [selectedMonth, setSelectedMonth] = useState<string>("All Months")

  const { panelRef, tableWrapRef, rows } = useFillRows({
    rowHeight: 52,
    initialRows: 8,
  })

  return (
    <div className="hidden md:flex md:flex-col md:h-full">

      {/* filter */}
      <div className="flex w-full justify-between">
        <div className="flex gap-3">
          <div className="flex items-center bg-[#FAFCFD] border-2 border-[#C6C6C8] rounded-lg px-3 gap-2 h-9 w-55">
            <FaSearch size={14} className="text-[#C6C6C8]" />
            <Input disabled placeholder="Search waste classification..." className="text-xs bg-transparent border-0 rounded-lg placeholder:text-gray text-[#122A48] focus-visible:ring-0 h-7 w-full" />
          </div>

          <Select value={barangayFilterOpt} onValueChange={setBarangayFilterOpt}>
            <SelectTrigger className="text-xs cursor-pointer px-3 py-[16px] bg-white border-2 border-[#C6C6C8] text-[#122A48] rounded-lg font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem className="text-xs p-2" value="All Barangay">All Barangay</SelectItem>
            </SelectContent>
          </Select>

          <Select value={dominantWaste} onValueChange={setDominantWaste}>
            <SelectTrigger className="text-xs cursor-pointer px-3 py-[16px] bg-white border-2 border-[#C6C6C8] text-[#122A48] rounded-lg font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem className="text-xs p-2" value="All Waste">All Waste</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sensorNode} onValueChange={setSensorNode}>
            <SelectTrigger className="text-xs cursor-pointer px-3 py-[16px] bg-white border-2 border-[#C6C6C8] text-[#122A48] rounded-lg font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem className="text-xs p-2" value="All Nodes">All Nodes</SelectItem>
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
      <div className="flex gap-2 mt-2 flex-1 min-h-[524px]">

        {/* Table */}
        <div ref={panelRef} className="bg-[#FAFCFD] border border-[#00000040] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] flex-[3] min-w-0 rounded-lg flex flex-col">
          <div ref={tableWrapRef}>
            <Table>
              <TableHeader className="bg-[#e8eef1b4] border border-[#CFD8DC] h-12">
                <TableRow>
                  <TableHead className="font-semibold text-left text-xs text-[#727272]">CLASSIFICATION ID</TableHead>
                  <TableHead className="font-semibold text-left text-xs text-[#727272]">DOMINANT WASTE TYPE</TableHead>
                  <TableHead className="font-semibold text-left text-xs text-[#727272]">TIMESTAMP</TableHead>
                  <TableHead className="font-semibold text-left text-xs text-[#727272]">NODE</TableHead>
                  <TableHead className="font-semibold text-left text-xs text-[#727272]">LOCATION</TableHead>
                  <TableHead className="font-semibold text-left text-xs text-[#727272]">READING ID</TableHead>
                  <TableHead className="font-semibold text-left text-xs text-[#727272]">CONFIDENCE</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(rows)].map((_, i) => (
                  <TableRow key={i} className="border-b border-[#C6C6C8]">
                    <TableCell className="h-13"><Skeleton className="h-3.5 w-20" /></TableCell>
                    <TableCell className="h-13">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-7 w-7 rounded-full" />
                        <Skeleton className="h-3.5 w-20" />
                      </div>
                    </TableCell>
                    <TableCell className="h-13"><Skeleton className="h-3.5 w-24" /></TableCell>
                    <TableCell className="h-13"><Skeleton className="h-3.5 w-16" /></TableCell>
                    <TableCell className="h-13"><Skeleton className="h-3.5 w-20" /></TableCell>
                    <TableCell className="h-13"><Skeleton className="h-3.5 w-14" /></TableCell>
                    <TableCell className="h-13"><Skeleton className="h-3.5 w-10" /></TableCell>
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
            <FileSearch size={60} className="text-[#1565BC80]" />
            <p className="text-[#122A488F] font-bold -my-1">No Waste Selected</p>
            <p className="text-[#122A4873] text-xs text-center">Select a record from the table <br />to view details.</p>
          </div>
        </div>

      </div>
    </div>
  )
}