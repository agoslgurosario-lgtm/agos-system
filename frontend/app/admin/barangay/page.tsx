"use client"

// icons
import { FaSearch } from "react-icons/fa"
import { MapPinned, CheckCircle, BadgeCheck, Map, UserRound, X, MapPinPlus, MapPin, Navigation, Check, MapPinOff } from "lucide-react";

// shadcn
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, } from "@/components/ui/dialog"

// component
import { DialogModal } from "@/components/DialogModal";
import { BarangaySkeleton } from "@/components/Skeleton/Admin/BarangaySkeleton"
import AgosMapWrapper from "@/components/Map/AgosMapWrapper";
import { SearchFilter } from "@/components/SearchFilter";
import { SpinnerIcon } from "@/components/SpinnerIcon";
import { useFillRows } from "@/components/hooks/useFillRows";

// react
import { useState, useEffect } from "react"

// table pagination
import { usePagination } from "@/components/hooks/usePagination";
import { TablePagination } from "@/components/TablePagination";

// lib
import { DIALOG_COLOR } from "@/lib/constant";
import { api } from "@/lib/api";
import { usePageCache } from "@/components/hooks/usePageCache";


type Barangay = {
  barangay_id: number
  barangay_name: string
  latitude: number
  longitude: number
  is_registered: boolean
}

type DialogState = {
  open: boolean;
  barangay?: Barangay | null;
};

type DialogStateLoading = {
  open: boolean
}

function getFilteredBarangay(barangays: Barangay[], search: string, statusFilter: string) {
  return barangays
    .filter(b => {
      if (statusFilter === 'Registered') return b.is_registered === true
      if (statusFilter === 'Unregistered') return b.is_registered === false
      return true
    })
    .filter(b => b.barangay_name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      // registered first
      if (a.is_registered && !b.is_registered) return -1
      if (!a.is_registered && b.is_registered) return 1
      // then alphabetical within each group
      return a.barangay_name.localeCompare(b.barangay_name)
    })
}

// open maps redirect to google map
const openInGoogleMaps = (latitude: number, longitude: number) => {
  window.open(
    `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
    "_blank"
  );
};

// fetch raw data
const fetchBarangaysRaw = async (): Promise<Barangay[]> => {
  const all = await api.get('/api/barangays/all/')
  return (all.results ?? all).filter((b: Barangay) => b.barangay_name !== 'Admin')
}


export default function Barangay() {
  // us
  const barangaysCache = usePageCache('barangay:barangays', fetchBarangaysRaw, [] as Barangay[], { autoFetch: false })

  useEffect(() => {
    barangaysCache.refetch()
  }, [])

  const barangays = barangaysCache.data
  const loading = barangaysCache.loading
  const fetchError = barangaysCache.error

  // filter states
  const [search, setSearch] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<'All' | 'Registered' | 'Unregistered'>('All')

  const [registerDialog, setRegisterDialog] = useState<DialogState>({
    open: false,
    barangay: null,
  })

  const [unregisterDialog, setUnregisterDialog] = useState<DialogState>({
    open: false,
    barangay: null,
  })

  // view map dialog state
  const [viewMapDialog, setViewMapDialog] = useState<DialogState>({
    open: false,
    barangay: null,
  })

  // dialog states
  const [blockedDialog, setBlockedDialog] = useState<{ open: boolean; message: string; issues: string[] }>({
    open: false,
    message: '',
    issues: [],
  })

  const [loadingDialog, setLoadingDialog] = useState<DialogStateLoading>({
    open: false,
  })
  const [successDialog, setSuccessDialog] = useState<DialogState>({ open: false, barangay: null, })
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; message: string }>({ open: false, message: '' })
  const [actionResult, setActionResult] = useState<{ barangay: Barangay | null; action: 'Registered' | 'Unregistered' | null }>({
    barangay: null,
    action: null,
  })

  const filteredBarangay = getFilteredBarangay(barangays, search, statusFilter)

  const { panelRef, tableWrapRef, rows } = useFillRows({
    rowHeight: 56,
    initialRows: 7,
    deps: [loading],
  })
  const { paginated, currentPage, setCurrentPage, totalItems, itemsPerPage } = usePagination(filteredBarangay, rows)

  // summary cards
  const total = barangays.length
  const registered = barangays.filter(b => b.is_registered).length
  const unregistered = barangays.filter(b => !b.is_registered).length

  // handlers
  const handleRegisterClick = (b: Barangay) => {
    setRegisterDialog({ open: true, barangay: b })
  }

  const handleUnregisterClick = async (b: Barangay) => {
    try {
      const result = await api.get(`/api/barangays/${b.barangay_id}/check/`)
      if (!result.can_unregister) {
        setBlockedDialog({ open: true, message: result.detail, issues: result.issues ?? [] })
      } else {
        setUnregisterDialog({ open: true, barangay: b })
      }
    } catch {
      setErrorDialog({ open: true, message: 'Failed to check barangay status. Please try again.' })
    }
  }

  const handleUnregister = async () => {
    const b = unregisterDialog.barangay
    if (!b) return
    setUnregisterDialog({ open: false, barangay: null })
    setLoadingDialog({ open: true })
    try {
      await api.patch(`/api/barangays/${b.barangay_id}/unregister/`, {})
      barangaysCache.setData(prev => prev.map(x =>
        x.barangay_id === b.barangay_id ? { ...x, is_registered: false } : x
      ))
      setActionResult({ barangay: b, action: 'Unregistered' })
      setLoadingDialog({ open: false })
      setSuccessDialog({ open: true })
    } catch (err: any) {
      setLoadingDialog({ open: false })
      setErrorDialog({ open: true, message: err?.detail ?? `Failed to unregister ${b.barangay_name}. Please try again.` })
    }
  }

  const handleRegister = async () => {
    const b = registerDialog.barangay
    if (!b) return
    setRegisterDialog({ open: false, barangay: null })
    setLoadingDialog({ open: true })
    try {
      await api.patch(`/api/barangays/${b.barangay_id}/register/`, {})
      barangaysCache.setData(prev => prev.map(x =>
        x.barangay_id === b.barangay_id ? { ...x, is_registered: true } : x
      ))
      setActionResult({ barangay: b, action: 'Registered' })
      setLoadingDialog({ open: false })
      setSuccessDialog({ open: true })
    } catch (err: any) {
      setLoadingDialog({ open: false })
      setErrorDialog({ open: true, message: err?.detail ?? `Failed to register ${b.barangay_name}. Please try again.` })
    }
  }

  const handleSuccessConfirm = () => {
    setSuccessDialog({ open: false }) 
  }

  if (loading) return <BarangaySkeleton />

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
        <div className="grid grid-cols-3 gap-3 w-full text-[#122A48]">
          {[
            { icon: <MapPinned size={20} color="#1565BC" />, bg: "bg-[#CDE3DE]", count: total, label: "Total Barangay" },
            { icon: <CheckCircle size={20} color="#2C7B3C" />, bg: "bg-[#B2FBC1]", count: registered, label: "All Registered" },
            { icon: <MapPinOff size={20} color="#FF0101" />, bg: "bg-[#FFE5E5]", count: unregistered, label: "All Unregistered" },
          ].map(card => (
            <div key={card.label} className="rounded-lg border-2 border-[#C6C6C8] h-17 min-[2560px]:h-20 min-[3840px]:h-24 w-full flex items-center p-3 gap-3 relative bg-[#FAFCFD] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)]">
              <div className={`${card.bg} rounded-lg p-2`}>{card.icon}</div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-[#122A48] leading-tight">{card.count}</span>
                <p className="text-xs text-[#122A48]">{card.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* table */}
        <div ref={panelRef} className="bg-[#FAFCFD] rounded-lg border-2 border-[#C6C6C8] mt-2 pt-2 shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] flex flex-col flex-1 min-h-[528px]">
          <div className="flex justify-between items-center mx-3 mb-2">
            <p className="text-[#122A48] font-bold text-sm">Barangay List</p>

            <div className="flex gap-3 items-center">
              <SearchFilter value={search} onChange={setSearch} placeholder='Search Barangay...' width="w-50" height="h-8" />

              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="cursor-pointer py-3 text-xs border border-[#C6C6C8] bg-[#FAFCFD] rounded-lg">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="All" className="cursor-pointer p-2 text-xs">All Barangay</SelectItem>
                  <SelectItem value="Registered" className="cursor-pointer p-2 text-xs">Registered</SelectItem>
                  <SelectItem value="Unregistered" className="cursor-pointer p-2 text-xs">Unregistered</SelectItem>
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
                {!fetchError && filteredBarangay.length > 0 && paginated.map(barangay => (
                  <TableRow key={barangay.barangay_id} className="border-b border-[#C6C6C8]">
                    <TableCell className="text-[#122A48] text-left h-14 text-xs">{barangay.barangay_id}</TableCell>

                    <TableCell className="text-[#122A48] text-left h-14 text-xs">{barangay.barangay_name}</TableCell>

                    <TableCell className="text-[#122A48] flex gap-3 justify-left items-center h-14 text-xs">
                      <Button
                        onClick={() => setViewMapDialog({ open: true, barangay })}
                        className="rounded-lg text-[#2C7B3C] border border-[#C6C6C8] bg-[#B2FBC173] cursor-pointer hover:bg-[#78ee9073] py-3.5 text-xs px-3"
                      >
                        <Map size={16} /> View on map
                      </Button>
                    </TableCell>

                    <TableCell>
                      {barangay.is_registered ? (
                        <Button
                          suppressHydrationWarning
                          onClick={() => handleUnregisterClick(barangay)}
                          className="flex gap-2 text-[#122A48] rounded-lg bg-[#DACDE3] hover:bg-purple-200 cursor-pointer border border-[#C6C6C8] py-3.5 text-xs px-3"
                        >
                          <MapPinOff size={16} /> Unregister
                        </Button>
                      ) : (
                        <Button
                          suppressHydrationWarning
                          onClick={() => handleRegisterClick(barangay)}
                          className="flex gap-2 text-[#2C7B3C] rounded-lg bg-[#B2FBC173] hover:bg-[#78ee9073] cursor-pointer border border-[#C6C6C8] py-3.5 text-xs px-3"
                        >
                          <MapPinPlus size={16} /> Register
                        </Button>
                      )}
                    </TableCell>

                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* fetch error state */}
          {fetchError && (
            <div className="flex-1 flex flex-col justify-center items-center gap-3">
              {barangaysCache.retrying ? (
                <div className="flex flex-col items-center gap-3">
                  <SpinnerIcon size={32} color="#D81010" />
                  <p className="text-[#D81010] font-semibold text-base">Retrying...</p>
                </div>
              ) : (
                <>
                  <div className="text-[#D81010] text-center">
                    <p className="font-semibold">Failed to load barangay</p>
                    <p className="text-sm">Please try again later</p>
                  </div>
                  <Button onClick={() => barangaysCache.refetch()} className="cursor-pointer bg-transparent rounded-lg border border-[#D81010] text-[#D81010] px-3 py-2 hover:bg-gray-100">Retry</Button>
                </>
              )}
            </div>
          )}



          {/* no barangay state */}
          {!fetchError && filteredBarangay.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-sm">
              <div className="rounded-full bg-[#E5E5E6] p-3">
                <UserRound size={30} color="#727272" />
              </div>
              <p className="text-[#122A48] font-bold">No barangay found</p>
              <p className="text-[#727272] text-xs">
                No barangay have been found.
              </p>
            </div>
          )}

          <div className="mt-auto">
            <TablePagination
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>

      </div>

      {/* -------------------------------------------------------------------------------------- */}

      {/* for mobile */}
      <div className="md:hidden text-[#122A48]">
        {/* filter */}
        <div className="flex justify-between items-center">
          <p className="font-bold">Barangay</p>
        </div>

        <div className="flex gap-2 justify-between mt-3">
          <div className="flex items-center bg-[#FAFCFD] border-1 border-[#C6C6C8] rounded-lg px-3 h-8">
            <FaSearch size={13} className="text-[#C6C6C8]" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search Barangay..."
              className="text-xs bg-transparent border-0 rounded-lg placeholder:text-gray text-[#122A48] focus-visible:ring-0 h-7 w-73.5"
            />
          </div>
        </div>

        {/* Cards */}
        <div className="flex gap-2 w-full text-[#122A48] mt-3">
          <div className="rounded-lg border border-[#C6C6C8] h-18 flex-1 flex items-center p-2 gap-2 bg-[#FAFCFD] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)]">
            <div className="bg-[#CDE3DE] rounded-lg p-1.5"><MapPinned size={16} color="#1565BC" /></div>
            <div className="flex flex-col">
              <span className="text-lg font-bold leading-tight">{total}</span>
              <p className="text-[11px]">Total</p>
            </div>
          </div>
          <div className="rounded-lg border border-[#C6C6C8] h-18 flex-1 flex items-center p-2 gap-2 bg-[#FAFCFD] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)]">
            <div className="bg-[#B2FBC1] rounded-lg p-1.5"><BadgeCheck size={16} color="#2C7B3C" /></div>
            <div className="flex flex-col">
              <span className="text-lg font-bold leading-tight">{registered}</span>
              <p className="text-[11px]">Registered</p>
            </div>
          </div>
          <div className="rounded-lg border border-[#C6C6C8] h-18 flex-1 flex items-center p-2 gap-2 bg-[#FAFCFD] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)]">
            <div className="bg-[#FFE5E5] rounded-lg p-1.5"><MapPinOff size={16} color="#FF0101" /></div>
            <div className="flex flex-col">
              <span className="text-lg font-bold leading-tight">{unregistered}</span>
              <p className="text-[11px]">Unregistered</p>
            </div>
          </div>
        </div>

        {/* Barangay Cards */}
        <div className="rounded-lg h-150 mt-3">
          <p className="font-semibold text-sm mb-3">Barangay List</p>

          {/* fetch error state */}
          {fetchError ? (
            <div className="flex flex-col justify-center items-center text-center gap-3 py-25">
              {barangaysCache.retrying ? (
                <div className="flex flex-col items-center gap-3">
                  <SpinnerIcon size={32} color="#D81010" />
                  <p className="text-[#D81010] font-semibold text-xs">Retrying...</p>
                </div>
              ) : (
                <>
                  <p className="text-[#D81010] font-semibold text-xs">Failed to load barangay. <br /> Please try again later.</p>
                  <Button onClick={() => barangaysCache.refetch()} className="cursor-pointer bg-transparent rounded-lg border border-[#D81010] text-[#D81010] px-3 py-2 hover:bg-gray-100">Retry</Button>
                </>
              )}
            </div>

            // empty
          ) : filteredBarangay.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-18">
              <div className="rounded-full bg-[#E5E5E6] p-3">
                <MapPinned size={28} color="#727272" />
              </div>
              <p className="text-[#122A48] font-bold text-sm">No barangay found</p>
              <p className="text-[#727272] text-xs text-center">
                No barangay have been Register yet.
              </p>
            </div>

            // not empty
          ) : (
            <div className="flex flex-col">
              {filteredBarangay.map(barangay => (
                <div key={barangay.barangay_id} className="flex gap-3 mb-3">
                  <div className="p-2 rounded-lg border border-[#C6C6C8] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] w-full">
                    <div className="flex justify-between w-full border-b border-[#C6C6C8] pb-2 pt-1">
                      <div className="flex gap-2">
                        <div className="p-1 px-1.5 bg-[#1565BC29] rounded-lg">
                          <p className="text-[10px]">#{barangay.barangay_id}</p>
                        </div>
                        <p className="font-medium text-[13px]">{barangay.barangay_name}</p>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-3">
                      <Button
                        onClick={() => setViewMapDialog({ open: true, barangay })}
                        className="rounded-lg text-[#2C7B3C] border border-[#73b780] bg-[#B2FBC173] cursor-pointer hover:bg-[#78ee9073] h-11 w-25 text-xs"
                      >
                        <Map size={16} /> View on <br /> map
                      </Button>

                      {barangay.is_registered ? (
                        <Button
                          onClick={() => handleUnregisterClick(barangay)}
                          className="flex gap-2 text-[#582579] rounded-lg bg-[#DACDE3] hover:bg-purple-200 cursor-pointer border border-[#b294c6] h-11 w-23 text-xs"
                        >
                          <MapPinOff size={16} /> Unregister
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleRegisterClick(barangay)}
                          className="flex gap-2 text-[#2C7B3C] rounded-lg bg-[#B2FBC173] hover:bg-[#78ee9073] cursor-pointer border border-[#73b780] h-11 w-23 text-xs"
                        >
                          <MapPinPlus size={16} /> Register
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

            </div>
          )}

        </div>

      </div>

      {/* Dialog */}

      {/* View on Map Dialog */}
      <Dialog open={viewMapDialog.open}>
        <DialogContent className="[&>button]:hidden p-4 md:p-6 text-[#122A48] rounded-lg border border-[#C6C6C8] min-w-80 md:min-w-150">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <div className="flex gap-2 items-center">
                <p className="font-bold text-base md:text-lg">Brgy. {viewMapDialog.barangay?.barangay_name}</p>
              </div>
              <button className="cursor-pointer" onClick={() => setViewMapDialog({ open: false, barangay: null })}>
                <X size={18} />
              </button>
            </div>
          </DialogHeader>
          <div className="h-100 md:h-[380px] rounded-b-lg w-70 md:w-140 overflow-hidden">
            <AgosMapWrapper
              latitude={viewMapDialog.barangay?.latitude}
              longitude={viewMapDialog.barangay?.longitude}
              label={viewMapDialog.barangay?.barangay_name}
              zoom={16}
              showLegend={false}
            />
          </div>
          <div className="border-t border-[#C6C6C8] flex justify-between py-3 -mb-4">
            <div className="flex flex-col md:flex-row gap-3 items-center">
              <p className="text-xs md:text-sm">{viewMapDialog.barangay?.latitude}</p>
              <p className="text-xs md:text-sm">{viewMapDialog.barangay?.longitude}</p>
            </div>
            <Button
              disabled={
                viewMapDialog.barangay?.latitude == null ||
                viewMapDialog.barangay?.longitude == null
              }
              onClick={() => {
                const barangay = viewMapDialog.barangay;
                if (!barangay) return;

                openInGoogleMaps(
                  barangay.latitude,
                  barangay.longitude
                );
              }}
              className="cursor-pointer rounded-lg border border-[#C6C6C8] bg-[#FAFCFD] hover:bg-[#d6e4eb] px-3 py-2 md:px-4 md:py-3 text-[#727272]"
            >
              <Map />
              Open in Maps
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <DialogModal
        open={registerDialog.open}
        onClose={() => setRegisterDialog({ open: false, barangay: null })}
        onConfirm={handleRegister}
        color={DIALOG_COLOR.lightgreen}
        icon={MapPinOff}
        iconColor={DIALOG_COLOR.green}
        title="Register Barangay"
        description={
          <span className="text-justify">
            Are you sure you want to register{" "}
            <strong>{registerDialog.barangay?.barangay_name}</strong>? This will allow for them to have sensor nodes in their jurisdiction.
          </span>
        }
        cancelLabel="Cancel"
        confirmLabel="Register"
      />

      <DialogModal
        open={unregisterDialog.open}
        onClose={() => setUnregisterDialog({ open: false, barangay: null })}
        onConfirm={handleUnregister}
        color={DIALOG_COLOR.lightred}
        icon={MapPinOff}
        iconColor={DIALOG_COLOR.red}
        title="Unregister Barangay"
        description={
          <span className="text-justify">
            Are you sure you want to unregister{" "}
            <strong>{unregisterDialog.barangay?.barangay_name}</strong>? Make sure all sensor nodes and barangay users are unassigned first.
          </span>
        }
        cancelLabel="Cancel"
        confirmLabel="Unregister"
      />

      <DialogModal
        open={blockedDialog.open}
        onClose={() => setBlockedDialog({ open: false, message: '', issues: [] })}
        onConfirm={() => setBlockedDialog({ open: false, message: '', issues: [] })}
        color={DIALOG_COLOR.lightorange}
        icon={MapPinOff}
        iconColor={DIALOG_COLOR.orange}
        title="Cannot Unregister Barangay"
        description={
          <span className="text-justify block">
            {blockedDialog.message}
            {blockedDialog.issues.length > 0 && (
              <span className="mt-2 list-disc list-inside">
                {blockedDialog.issues.map((issue, i) => (
                  <li key={i}><strong>{issue}</strong></li>
                ))}
              </span>
            )}
          </span>
        }
        cancelLabel="Close"
        confirmLabel="Okay"
      />

      {/* Loading Dialog */}
      <DialogModal
        open={loadingDialog.open}
        color={DIALOG_COLOR.lightblue}
        icon={SpinnerIcon}
        iconColor={DIALOG_COLOR.blue}
        title="Saving Changes"
        description="Updating barangay status, please wait..."
      />
      
      {/* success Dialog */}
      <DialogModal
        open={successDialog.open}
        onConfirm={handleSuccessConfirm}
        color={DIALOG_COLOR.lightgreen}
        icon={BadgeCheck}
        iconColor={DIALOG_COLOR.green}
        title="Barangay Status Updated!"
        description={
          <>
            <strong>{actionResult.barangay?.barangay_name}</strong> has been {actionResult.action?.toLowerCase()} successfully.
          </>
        }
        confirmLabel="Done"
      />

      {/* error dialog */}
      <DialogModal
        open={errorDialog.open}
        onConfirm={() => setErrorDialog({ open: false, message: '' })}
        color={DIALOG_COLOR.lightred}
        icon={X}
        iconColor={DIALOG_COLOR.red}
        title="Something Went Wrong"
        description={errorDialog.message}
        confirmLabel="Okay"
      />

    </>
  )
}