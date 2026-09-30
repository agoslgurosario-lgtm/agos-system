"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"

import { FileDown, Trash, Recycle, Leaf, Trash2, Biohazard } from "lucide-react"
import { useState } from "react"

export function AnalyticsSkeleton() {
  const [selectedMonth, setSelectedMonth] = useState<string>("current")

  return (
    <div className="hidden md:flex md:flex-col md:h-full text-[#122A48]">

      <div className="w-full mb-2 flex justify-between">
        <div>
          <p className="font-bold text-base">Overview</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="cursor-pointer px-3 py-3 bg-white border-2 border-[#C6C6C8] text-[#122A48] rounded-lg font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem className="p-2 py-1 text-[#122A48]" value="current">This Month</SelectItem>
            </SelectContent>
          </Select>

          <Button disabled className="bg-[#2fd45b] opacity-60">
            <FileDown size={16} className="mr-1" /> Export PDF
          </Button>
        </div>
      </div>

      {/* total cards */}
      <div className="grid grid-cols-3 lg:grid-cols-5 gap-3 w-full text-[#122A48] mt-1">
        {[
          { icon: <Trash size={20} color="#122A48" />, bg: "bg-[#CDE3DE]" },
          { icon: <Recycle size={20} color="#1565BC" />, bg: "bg-[#1565BC61]" },
          { icon: <Leaf size={20} color="#2C7B3C" />, bg: "bg-[#B2FBC1]" },
          { icon: <Trash2 size={20} color="#122A48CC" />, bg: "bg-[#D9D9D9]" },
          { icon: <Biohazard size={20} color="#D48A00" />, bg: "bg-[#F4E4A6]" },
        ].map((card, i) => (
          <div key={i} className="rounded-lg border-2 border-[#C6C6C8] h-17 min-[2560px]:h-20 min-[3840px]:h-24 w-full flex items-center p-3 gap-3 bg-[#FAFCFD] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)]">
            <div className={`${card.bg} rounded-lg p-2 opacity-60`}>{card.icon}</div>
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-3">
        {/* collected by barangay */}
        <div className="bg-[#FAFCFD] rounded-lg border border-[#C6C6C8] flex-1 min-w-0">
          <div className="w-full p-2">
            <p className="font-bold text-sm">Collection by Barangay</p>
          </div>
          <hr />
          <div className="flex flex-col gap-4 px-3 py-4">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="flex items-center gap-8">
                <Skeleton className="h-3 w-24 shrink-0" />
                <Skeleton className="h-2 flex-1 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* waste composition */}
        <div className="bg-[#FAFCFD] rounded-lg border border-[#C6C6C8] flex-1 min-w-[380px]">
          <div className="w-full p-2">
            <p className="font-bold text-sm">Waste Composition</p>
          </div>
          <hr />
          <div className="flex items-center gap-15 p-4 ml-15">
            <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
              <div className="w-40 h-40 rounded-full border-[18px] border-[#E5E5E6] animate-pulse" />
            </div>
            <div className="flex flex-col gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="w-4 h-4 rounded-full shrink-0" />
                  <Skeleton className="h-3 w-28" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* table classification waste records */}
      <div className="bg-[#FAFCFD] rounded-lg border border-[#C6C6C8] mt-2 flex-1">
        <div className="w-full p-2">
          <p className="font-bold text-sm">Waste Classification Readings</p>
        </div>

        <Table>
          <TableHeader className="bg-[#e8eef1b4] border border-[#CFD8DC] h-12">
            <TableRow>
              <TableHead className="font-semibold text-left text-[#727272] text-xs">CLASSIFICATION ID</TableHead>
              <TableHead className="font-semibold text-left text-[#727272] text-xs">NODE</TableHead>
              <TableHead className="font-semibold text-left text-[#727272] text-xs">DOMINANT WASTE TYPE</TableHead>
              <TableHead className="font-semibold text-left text-[#727272] text-xs">RECYCLABLE</TableHead>
              <TableHead className="font-semibold text-left text-[#727272] text-xs">BIODEGRADABLE</TableHead>
              <TableHead className="font-semibold text-left text-[#727272] text-xs">RESIDUAL</TableHead>
              <TableHead className="font-semibold text-left text-[#727272] text-xs">SPECIAL WASTE</TableHead>
              <TableHead className="font-semibold text-left text-[#727272] text-xs">CONFIDENCE</TableHead>
              <TableHead className="font-semibold text-left text-[#727272] text-xs">ESTIMATED VOLUME</TableHead>
              <TableHead className="font-semibold text-left text-[#727272] text-xs">TIMESTAMP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(6)].map((_, i) => (
              <TableRow key={i}>
                <TableCell className="h-[35px]"><Skeleton className="h-3 w-10" /></TableCell>
                <TableCell><Skeleton className="h-3 w-16" /></TableCell>
                <TableCell><Skeleton className="h-3 w-20" /></TableCell>
                <TableCell><Skeleton className="h-3 w-10" /></TableCell>
                <TableCell><Skeleton className="h-3 w-10" /></TableCell>
                <TableCell><Skeleton className="h-3 w-10" /></TableCell>
                <TableCell><Skeleton className="h-3 w-10" /></TableCell>
                <TableCell><Skeleton className="h-3 w-10" /></TableCell>
                <TableCell><Skeleton className="h-3 w-14" /></TableCell>
                <TableCell><Skeleton className="h-3 w-24" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

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