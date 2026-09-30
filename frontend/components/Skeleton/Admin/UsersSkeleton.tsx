"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select"
import { Input } from "@/components/ui/input"

import { FaSearch } from "react-icons/fa"
import { FaPlus } from "react-icons/fa6"
import { SlidersHorizontal } from "lucide-react"

import { useState } from "react"

import { useFillRows } from "@/components/hooks/useFillRows"

export function UsersSkeleton() {
  const [userRole, setUserRole] = useState<string>('All')
  const [userStatus, setUserStatus] = useState<string>('Active')

  const { panelRef, tableWrapRef, rows } = useFillRows({
    rowHeight: 56,
    initialRows: 7,
  })

  return (
    <>
      <div className="hidden md:flex md:flex-col md:h-full">

        {/* title and action container */}
        <div className="flex justify-between w-full mb-2">
          <div className="font-bold text-[#122A48] flex justify-center items-center text-[15px]">
            <p>System Users</p>
          </div>

          {/* add user */}
          <Button disabled className="text-xs p-5 py-4 rounded-lg bg-[#1565BC] text-white shadow-[0_6px_4px_-4px_rgba(0,0,0,0.2)]">
            <FaPlus color="white" /> Add User
          </Button>
        </div>

        {/* header total cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full">
          {[...Array(4)].map((_, i) => (
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
        <div ref={panelRef} className="bg-[#FAFCFD] rounded-lg border-2 border-[#C6C6C8] mt-2 pt-2 shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] flex flex-col flex-1 min-h-[532px]">

          {/* title and filters */}
          <div className='flex justify-between items-center px-3 mb-2'>
            <Skeleton className="h-4 w-28" />

            <div className='flex gap-3 items-center'>
              {/* search filter */}
              <div className="flex items-center bg-[#FAFCFD] border-2 border-[#C6C6C8] rounded-lg px-3 gap-2 h-8 w-50">
                <FaSearch size={14} className="text-[#C6C6C8]" />
                <Input placeholder="Search Users..." disabled className="text-xs bg-transparent border-0 rounded-lg placeholder:text-gray text-[#122A48] focus-visible:ring-0 h-7 w-full" />
              </div>

              {/* user role filter */}
              <Select value={userRole} onValueChange={setUserRole}>
                <SelectTrigger className="text-xs cursor-pointer px-3 py-3 bg-white border-2 border-[#C6C6C8] text-[#122A48] rounded-lg font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" className='min-w-0'>
                  <SelectItem className="text-xs p-2 text-[#122A48]" value="All">All Users</SelectItem>
                </SelectContent>
              </Select>

              {/* user status filter */}
              <Select value={userStatus} onValueChange={setUserStatus}>
                <SelectTrigger className="text-xs cursor-pointer px-3 py-3 bg-white border-2 border-[#C6C6C8] text-[#122A48] rounded-lg font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" className='min-w-0'>
                  <SelectItem className="text-xs p-2 text-[#122A48]" value="Active">Active</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div ref={tableWrapRef}>
            <Table>
              <TableHeader className="bg-[#e8eef1b4] border-[#727272]">
                <TableRow>
                  <TableHead className="text-[#727272] text-left text-xs font-semibold w-12">ID</TableHead>
                  <TableHead className="text-[#727272] text-left text-xs font-semibold w-2/5">USER</TableHead>
                  <TableHead className="text-[#727272] text-left text-xs font-semibold w-1/5">ROLE</TableHead>
                  <TableHead className="text-[#727272] text-left text-xs font-semibold w-1/6">STATUS</TableHead>
                  <TableHead className="text-[#727272] text-left text-xs font-semibold w-1/5">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(rows)].map((_, i) => (
                  <TableRow key={i} className="border-b border-[#C6C6C8]">
                    <TableCell className="h-14"><Skeleton className="h-3.5 w-6" /></TableCell>
                    <TableCell className="h-14">
                      <div className="flex gap-3 items-center">
                        <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                        <div className="flex flex-col gap-1.5">
                          <Skeleton className="h-3.5 w-28" />
                          <Skeleton className="h-3 w-36" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="h-14"><Skeleton className="h-3.5 w-20" /></TableCell>
                    <TableCell className="h-14"><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                    <TableCell className="h-14">
                      <div className="flex gap-3">
                        <Skeleton className="h-8 w-16 rounded-lg" />
                        <Skeleton className="h-8 w-24 rounded-lg" />
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

      {/* ----------------------------------------------------------------------------------- */}

      {/* for mobile */}
      <div className="md:hidden text-[#122A48]">

        {/* filters */}
        <div className="flex justify-between items-center">
          <p className="font-bold">System users</p>
          <Button disabled className="p-5 py-5 rounded-lg bg-[#1565BC] text-white shadow-[0_6px_4px_-4px_rgba(0,0,0,0.2)]">
            <FaPlus color="white" /> Add User
          </Button>
        </div>

        <div className="flex gap-2 justify-between mt-3">
          <div className="flex items-center bg-[#FAFCFD] border-1 border-[#C6C6C8] rounded-lg px-3 gap-2 h-8 flex-1">
            <FaSearch size={13} className="text-[#C6C6C8]" />
            <Input disabled placeholder="Search Users..." className="text-xs bg-transparent border-0 rounded-lg placeholder:text-gray text-[#122A48] focus-visible:ring-0 h-7 w-full" />
          </div>
          <Button disabled className="bg-[#FAFAFA] text-[#122A48] !border border-[#C6C6C8] text-[12px]">
            <SlidersHorizontal /> Filter
          </Button>
        </div>

        {/* Cards */}
        <div className="flex flex-col gap-3 w-full mt-3">
          <div className="flex gap-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="rounded-lg border border-[#C6C6C8] h-18 w-40 flex items-center p-3 gap-3 bg-[#FAFCFD]">
                <Skeleton className="h-9 w-9 rounded-lg flex-shrink-0" />
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-5 w-8" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="rounded-lg border border-[#C6C6C8] h-18 w-85 flex items-center p-3 gap-3 bg-[#FAFCFD]">
                <Skeleton className="h-9 w-9 rounded-lg flex-shrink-0" />
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-5 w-8" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* users cards */}
        <div className="rounded-lg bg-[#FAFAFA] h-90 mt-3 border border-[#C6C6C8] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)]">
          <Skeleton className="h-4 w-28 m-3" />
          <hr />
          <div className="flex flex-col divide-y divide-[#C6C6C8]">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-3">
                <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                <div className="flex flex-col flex-1 gap-1.5">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-36" />
                  <div className="flex gap-2 mt-0.5">
                    <Skeleton className="h-4 w-14 rounded-full" />
                    <Skeleton className="h-4 w-12 rounded-full" />
                  </div>
                </div>
                <Skeleton className="h-8 w-8 rounded-lg flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  )
}