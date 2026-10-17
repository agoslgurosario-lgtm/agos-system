"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RadioTower, Trash2, TriangleAlert, BadgeCheck, ChevronLeft, ChevronRight } from "lucide-react"

// Mirrors app/menro/resources/page.tsx. Static text (titles, headers, labels, legend)
// is rendered for real; only data-driven values are skeletons. Keep the structure
// and class names in sync with the page so nothing shifts when loading finishes.
export function ResourcesSkeleton() {
  return (
    <div className="hidden md:flex md:flex-col md:h-full">

      {/* total cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full text-[#122A48]">
        {[
          { icon: <RadioTower size={20} color="#2C7B3C" />, bg: "bg-[#CDE3DE]", label: "Total Assigned Sensor Nodes" },
          { icon: <Trash2 size={20} color="#122A48" />, bg: "bg-[#CDE3DE]", label: "Total Waste" },
          { icon: <TriangleAlert size={20} color="#D81010" />, bg: "bg-[#FFE5E5]", label: "Critical Areas" },
          { icon: <BadgeCheck size={20} color="#1565BC" />, bg: "bg-[#1565BC29]", label: "Cleared Areas" },
        ].map(card => (
          <div key={card.label} className="rounded-lg border-2 border-[#C6C6C8] h-17 min-[2560px]:h-20 min-[3840px]:h-24 w-full flex items-center p-3 gap-3 relative bg-[#FAFCFD] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)]">
            <div className={`${card.bg} rounded-lg p-2`}>{card.icon}</div>
            <div className="flex flex-col">
              <Skeleton className="h-5 w-10 my-0.5" />
              <p className="text-xs text-[#122A48]">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* waste hotspot status, priority deployment queue */}
      <div className="flex gap-2 text-[#122A48] mt-2 h-70">

        {/* waste hotspot status */}
        <div className="rounded-lg border border-[#C6C6C8] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] bg-[#FAFCFD] flex-1 min-w-[320px] overflow-hidden">
          <div className="w-full">
            <p className="font-bold p-2 text-sm">WASTE HOTSPOT STATUS</p>
          </div>
          <Table>
            <TableHeader className="bg-[#F5F6F9]">
              <TableRow>
                <TableHead className="text-[#727272] text-left text-xs">NODE</TableHead>
                <TableHead className="text-[#727272] text-left text-xs">NAME</TableHead>
                <TableHead className="text-[#727272] text-left text-xs">LOCATION</TableHead>
                <TableHead className="text-[#727272] text-left text-xs">STATUS</TableHead>
                <TableHead className="text-[#727272] text-left text-xs">LAST UPDATED</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(3)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="text-left"><Skeleton className="h-4 w-6" /></TableCell>
                  <TableCell className="text-left"><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell className="text-left"><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell className="text-left"><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                  <TableCell className="text-left"><Skeleton className="h-4 w-36" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* priority deployment queue */}
        <div className="rounded-lg border border-[#C6C6C8] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] bg-[#FAFCFD] flex flex-col flex-1 min-w-[300px] overflow-hidden">
          <div className="p-2 border-b">
            <p className="font-bold text-sm">PRIORITY DEPLOYMENT QUEUE</p>
            <p className="text-xs text-[#727272]">Based on clog severity.</p>
          </div>

          <div className="flex-1 overflow-hidden p-2 space-y-1">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between border rounded-lg p-3 bg-white">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-6 h-6 rounded-md" />
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-2.5 w-16" />
                    <Skeleton className="h-2.5 w-14" />
                    <Skeleton className="h-2.5 w-28" />
                    <Skeleton className="h-2.5 w-20" />
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-2.5 w-16" />
                </div>
              </div>
            ))}
          </div>

          {/* clog level legend (static, same as the page) */}
          <div className="border-t px-4 py-2 mt-auto">
            <div className="flex flex-wrap justify-center gap-3 text-[10px] text-[#122A48]">
              {[
                { color: "bg-[#E85656]", range: "80% - 100%", label: "Critical" },
                { color: "bg-[#FFCC00]", range: "30% - 79%", label: "Medium" },
                { color: "bg-[#2C7B3C]", range: "0% - 29%", label: "Low" },
              ].map(l => (
                <div key={l.label} className="flex flex-col items-center">
                  <div className="flex gap-2">
                    <div className={`w-3 h-3 rounded-full ${l.color}`} />
                    <span>{l.range}</span>
                  </div>
                  <div>
                    <p>{l.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* all waste hotspots (detailed list) */}
      <div className="mt-2 bg-[#FAFCFD] border border-[#C6C6C8] rounded-lg flex-1 min-h-[284px] flex flex-col">
        <div className="flex gap-2 w-full p-3 items-center">
          <p className="font-bold text-sm">WASTE HOTSPOTS</p> <p className="text-[11px]">&#40;DETAILED LIST&#41;</p>
        </div>
        <Table>
          <TableHeader className="bg-[#CFD8D] border">
            <TableRow>
              <TableHead className="text-left text-xs text-[#727272]">NODE</TableHead>
              <TableHead className="text-left text-xs text-[#727272]">LOCATION</TableHead>
              <TableHead className="text-left text-xs text-[#727272]">CLOG SEVERITY INDEX</TableHead>
              <TableHead className="text-left text-xs text-[#727272]">DOMINANT WASTE TYPE</TableHead>
              <TableHead className="text-left text-xs text-[#727272]">ESTIMATED WASTE</TableHead>
              <TableHead className="text-left text-xs text-[#727272]">OPEN FOR</TableHead>
              <TableHead className="text-left text-xs text-[#727272]">STATUS</TableHead>
              <TableHead className="text-left text-xs text-[#727272]">LAST UPDATED</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(4)].map((_, i) => (
              <TableRow key={i} className="border-b-0">
                <TableCell className="text-left"><Skeleton className="h-4 w-6" /></TableCell>
                <TableCell className="text-left"><Skeleton className="h-4 w-16" /></TableCell>
                {/* severity bar + % */}
                <TableCell className="flex justify-left">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-20 h-3 rounded-full" />
                    <Skeleton className="h-4 w-8" />
                  </div>
                </TableCell>
                <TableCell className="text-left"><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell className="text-left"><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell className="text-left"><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell className="text-left"><Skeleton className="h-4 w-14" /></TableCell>
                <TableCell className="text-left"><Skeleton className="h-4 w-36" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* pagination — same markup as <TablePagination /> */}
        <div className="mt-auto">
          <div className="border-t border-[#C6C6C8] flex justify-between">
            <div className="p-3 text-[#88898D] text-[13px]">
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex gap-3 items-center mr-4 font-medium">
              <Button disabled className="text-[#88898D] text-[12px] bg-[#FAFCFD] border border-[#C6C6C8]">
                <ChevronLeft />
                Previous
              </Button>
              <Button disabled className="text-[#88898D] text-[12px] bg-[#FAFCFD] border border-[#C6C6C8]">
                Next
                <ChevronRight />
              </Button>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}