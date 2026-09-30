"use client"

// icons
import { FaSearch } from "react-icons/fa"
import { FaPlus } from "react-icons/fa6"
import { FaUsers } from "react-icons/fa";
import { BadgeCheck, CircleOff, ShieldCheck, UserRound, SquarePen, UserMinus, UserPlus, User, SlidersHorizontal, X, MoreHorizontal, CheckCircle, ShieldAlert  } from "lucide-react";

// react
import { useState, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"

// component
import { UsersSkeleton } from "@/components/Skeleton/Admin/UsersSkeleton";
import { DialogModal } from "@/components/DialogModal";
import { SearchFilter } from "@/components/SearchFilter";
import { SpinnerIcon } from "@/components/SpinnerIcon";
import { useFillRows } from "@/components/hooks/useFillRows";

// table pagination
import { usePagination } from "@/components/hooks/usePagination";
import { TablePagination } from "@/components/TablePagination";

// lib
import { DIALOG_COLOR } from "@/lib/constant";
import { ROLE_DISPLAY } from "@/lib/utils";
import { api } from "@/lib/api";
import { usePageCache } from "@/components/hooks/usePageCache";
import { clearAuth, setSuppressInactiveRedirect } from "@/lib/auth";

// shadcn
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table"

// type for states
type User = {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  user_role: string;
  status: string;
  barangay_id: number | null;
  barangay_details: { barangay_id: number; barangay_name: string } | null;
}

type DialogState = {
  open: boolean;
  user: User | null;
};

type DialogStateLoading = {
  open: boolean
}

const getAvatarColor = (role: string) => {
  if (role === "MENRO") return "#2C7B3C"
  if (role === "MENRO_Staff") return "#37b851"
  if (role === "Barangay") return "#1565BC"
  return "#122A48"
}

function getFilteredUsers(users: User[], role: string, status: string, search: string) {
  return users
    .filter(u => role === "All" || u.user_role === role)
    .filter(u => status === "All" || u.status === status)
    .filter(u => `${u.first_name} ${u.last_name}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.user_id - a.user_id)
}

// fetch raw data
const fetchUsersRaw = async (): Promise<User[]> => {
  const data = await api.get('/api/users/')
  return (data.results as User[])
}

export default function Users() {
  const router = useRouter()

  // filters
  const [search, setSearch] = useState<string>('')
  const [userRole, setUserRole] = useState<string>('All')
  const [userStatus, setUserStatus] = useState<string>('Active')

  // mobile filters
  const [tempRole, setTempRole] = useState<string>(userRole)
  const [tempStatus, setTempStatus] = useState<string>(userStatus)
  const [filterOpen, setFilterOpen] = useState<boolean>(false)
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)

  const usersCache = usePageCache('users:users', fetchUsersRaw, [] as User[], { autoFetch: false })

  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    usersCache.refetch()
  }, [])

  // table states
  const users = usersCache.data
  const loading = usersCache.loading
  const fetchError = usersCache.error

  // dialog states
  const [reactivateDialog, setReactivateDialog] = useState<DialogState>({
    open: false,
    user: null,
  })
  const [deactivateDialog, setDeactivateDialog] = useState<DialogState>({
    open: false,
    user: null,
  })
  const [blockedDialog, setBlockedDialog] = useState<DialogState>({
    open: false,
    user: null,
  })
  const [loadingDialog, setLoadingDialog] = useState<DialogStateLoading>({
    open: false,
  })
  const [successDialog, setSuccessDialog] = useState<DialogStateLoading>({ open: false })
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; message: string }>({ open: false, message: '' })

  const [actionResult, setActionResult] = useState<{ user: User | null; action: 'Activated' | 'Deactivated' | null }>({
    user: null,
    action: null,
  })

  const [adminReactivatedDialog, setAdminReactivatedDialog] = useState<DialogState>({ open: false, user: null })

  const filteredUsers = getFilteredUsers(users, userRole, userStatus, search)

  const { panelRef, tableWrapRef, rows } = useFillRows({
    rowHeight: 56,
    initialRows: 7,
    deps: [loading],
  })
  const { paginated, currentPage, setCurrentPage, totalItems, itemsPerPage } = usePagination(filteredUsers, rows)

  // summary cards
  const total    = users.length
  const active   = users.filter(u => u.status === 'Active').length
  const inactive = users.filter(u => u.status === 'Inactive').length
  const barangay    = users.filter(u => u.user_role === 'Barangay').length

  // handlers (reactivate and deactivate)
  const handleReactivate = async () => {
    const user = reactivateDialog.user
    if (!user) return
    setReactivateDialog({open: false, user: null})
    setLoadingDialog({ open: true })
    try {
      await api.patch(`/api/users/${user.user_id}/`, { status: 'Active' })

      if (user.user_role === 'Admin') {
        setSuppressInactiveRedirect(true)
        setAdminReactivatedDialog({ open: true, user })
        return
      }

      usersCache.setData(prev =>
        prev.map(u =>
          u.user_id === user.user_id
            ? { ...u, status: "Active" }
            : u
        )
      )
      setActionResult({ user, action: 'Activated' })
      setLoadingDialog({ open: false })
      setSuccessDialog({ open: true })
    } catch (err) {
      console.log(err)
      setActionResult({ user, action: 'Activated' })
      setLoadingDialog({ open: false })
      setErrorDialog({ open: true, message: `Failed to activate ${user.first_name} ${user.last_name}. Please try again.` })
    }
  }

  const handleAdminReactivatedConfirm = async () => {
    setAdminReactivatedDialog({ open: false, user: null })
    setLoadingDialog({ open: true })
    try {
      await api.post('/api/auth/logout/', {})

      setLoadingDialog({ open: false })
    } catch (err) {
      console.log(err)
    } finally {
      clearAuth()
      window.location.href = "/login"
    }
  }

  // guard: block deactivating the only active Admin (there must always be one)
  const handleDeactivateClick = (user: User) => {
    const activeAdminCount = users.filter(u => u.user_role === 'Admin' && u.status === 'Active').length
    if (user.user_role === 'Admin' && user.status === 'Active' && activeAdminCount <= 1) {
      setBlockedDialog({ open: true, user })
      return
    }
    setDeactivateDialog({ open: true, user })
  }

  const handlerDeactivate = async () => {
    const user = deactivateDialog.user
    if (!user) return
    setDeactivateDialog({open: false, user: null})
    setLoadingDialog({ open: true })
    try {
      await api.patch(`/api/users/${user.user_id}/`, { status: 'Inactive' })
      
      usersCache.setData(prev =>
        prev.map(u =>
          u.user_id === user.user_id
            ? { ...u, status: "Inactive" }
            : u
        )
      )

      setActionResult({ user, action: 'Deactivated' })
      setLoadingDialog({ open: false })
      setSuccessDialog({ open: true })
    } catch (err: any) {
      console.log(err)
      setActionResult({ user, action: 'Deactivated' })
      setLoadingDialog({ open: false })
      setErrorDialog({ open: true, message: err?.detail ?? err?.error ?? `Failed to deactivate ${user.first_name} ${user.last_name}. Please try again.` })
    }
  }

  const handleSuccessConfirm = () => {
    setSuccessDialog({ open: false }) 
  }

  if (loading) return <UsersSkeleton />

  return (
    <>
      <div className="hidden md:flex md:flex-col md:h-full">

        {/* title and action container */}
        <div className="flex justify-between w-full mb-2">
          <div className="font-bold text-[#122A48] flex justify-center items-center text-[15px]">
            <p>System Users</p>
          </div>

          {/* add user */}
          <Button
            onClick={() => router.push('/admin/users/form')}
            className="text-xs p-5 py-4 rounded-lg cursor-pointer bg-[#1565BC] hover:bg-[#135499] text-white shadow-[0_6px_4px_-4px_rgba(0,0,0,0.2)]"
          >
            <FaPlus color="white" /> Add User
          </Button>
        </div>

        {/* header total cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full text-[#122A48]">
          {[
            { icon: <FaUsers size={20} color="#1565BC" />, bg: "bg-[#CDE3DE]", count: total, label: "Total Users" },
            { icon: <BadgeCheck size={20} color="#2C7B3C" />, bg: "bg-[#B2FBC1]", count: active, label: "Active" },
            { icon: <CircleOff size={20} color="#FF0101" />, bg: "bg-[#FFE5E5]", count: inactive, label: "Inactive" },
            { icon: <ShieldCheck size={20} color="#582579" />, bg: "bg-[#DACDE3]", count: barangay, label: "Barangay Officer" },
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
        <div ref={panelRef} className="bg-[#FAFCFD] rounded-lg border-2 border-[#C6C6C8] mt-2 pt-2 shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] flex flex-col flex-1 min-h-[532px]">

          {/* title and filters */}
          <div className='flex justify-between items-center px-3 mb-2'>
            <p className="text-[#122A48] font-bold text-sm">User Accounts</p>

            <div className='flex gap-3 items-center'>
              <SearchFilter value={search} onChange={setSearch} placeholder='Search Users...' width="w-50" height="h-8" />

              {/* user role filter */}
              <Select value={userRole} onValueChange={setUserRole}>
                <SelectTrigger className="text-xs cursor-pointerpx-3 py-3 bg-white border-2 border-[#C6C6C8] text-[#122A48] rounded-lg font-medium">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent position="popper" className='min-w-0'>
                  <SelectItem className="text-xs cursor-pointer p-2 text-[#122A48]" value="All">All Users</SelectItem>
                  <SelectItem className="text-xs cursor-pointer p-2 text-[#122A48]" value="MENRO">MENRO Officer</SelectItem>
                  <SelectItem className="text-xs cursor-pointer p-2 text-[#122A48]" value="MENRO_Staff">MENRO Staff</SelectItem>
                  <SelectItem className="text-xs cursor-pointer p-2 text-[#122A48]" value="Barangay">Barangay</SelectItem>
                </SelectContent>
              </Select>

              {/* user status filter */}
              <Select value={userStatus} onValueChange={setUserStatus}>
                <SelectTrigger className="text-xs cursor-pointer px-3 py-3 bg-white border-2 border-[#C6C6C8] text-[#122A48] rounded-lg font-medium">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent position="popper" className='min-w-0'>
                  <SelectItem className="text-xs cursor-pointer p-2 text-[#122A48]" value="All">All Status</SelectItem>
                  <SelectItem className="text-xs cursor-pointer p-2 text-[#122A48]" value="Active">Active</SelectItem>
                  <SelectItem className="text-xs cursor-pointer p-2 text-[#122A48]" value="Inactive">Inactive</SelectItem>
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
                {!fetchError && filteredUsers.length > 0 && paginated.map(user => (
                  <TableRow key={user.user_id} className="border-b border-[#C6C6C8]">
                    <TableCell className="text-[#122A48] text-left h-14 text-xs !min-w-20 ">{user.user_id}</TableCell>

                    <TableCell className="text-[#122A48] h-14 text-xs">
                      <div className="flex gap-3 items-left">
                        <div
                          className="rounded-full w-8 h-8 flex items-center justify-center font-bold text-white text-xs flex-shrink-0"
                          style={{ backgroundColor: getAvatarColor(user.user_role) }}
                        >
                          {user.first_name.charAt(0)}{user.last_name.charAt(0)}
                        </div>
                        <div className="flex flex-col text-left text-xs">
                          <p className="font-semibold">{user.first_name} {user.last_name}</p>
                          <p className="underline">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-[#122A48] h-14 text-xs">
                      <div className="mx-auto text-left">
                        {ROLE_DISPLAY[user.user_role] ?? user.user_role}
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-left h-14 text-xs">
                      <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold ${
                        user.status === 'Active'
                          ? 'bg-[#B2FBC173] text-[#2C7B3C]'
                          : 'bg-[#FFE5E5] text-[#D81010]'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          user.status === 'Active' ? 'bg-[#1D8104]' : 'bg-[#BB2325]'
                        }`}/>
                        {user.status}
                      </span>
                    </TableCell>

                    <TableCell className="text-[#122A48] flex gap-3 justify-left items-center h-14 text-xs">
                      <Button 
                        onClick={() => router.push(`/admin/users/form?id=${user.user_id}`)}
                        className="flex gap-2 text-[#122A48] rounded-lg bg-[#CDE3DE45] hover:bg-[#75928a45] cursor-pointer border border-[#1565BC80] py-3.5 px-3 text-xs"
                      >
                        <SquarePen size={16} />
                        Edit
                      </Button>

                      {user.status === 'Active' ? (
                        <Button 
                          onClick={() => handleDeactivateClick(user)}
                          className="flex gap-2 text-[#D81010] rounded-lg bg-[#FFE5E5] hover:bg-red-200 cursor-pointer border border-[#C6C6C8] py-3.5 px-3 text-xs"
                        >
                          <UserMinus size={16} />
                          Deactivate
                        </Button>
                      ) : (
                        <Button
                          onClick={() => startTransition(() => setReactivateDialog({ open: true, user: user }))}
                          disabled={isPending}
                          className="flex gap-2 text-[#2C7B3C] rounded-lg bg-[#CDE3DE] hover:bg-green-200 cursor-pointer border border-[#C6C6C8] py-3.5 px-3 text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <UserPlus size={16} />
                          Activate
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
            {usersCache.retrying ? (
              <div className="flex flex-col items-center gap-3">
                <SpinnerIcon size={32} color="#D81010" />
                <p className="text-[#D81010] font-semibold text-base">Retrying...</p>
              </div>
            ) : (
              <>
                <div className="text-[#D81010] text-center">
                  <p className="font-semibold">Failed to load users</p>
                  <p className="text-sm">Please try again later</p>
                </div>
                <Button onClick={() => usersCache.refetch()} className="cursor-pointer bg-transparent rounded-lg border border-[#D81010] text-[#D81010] px-3 py-2 hover:bg-gray-100">Retry</Button>
              </>
            )}
          </div>
        )}

          {/* no user state */}
          {!fetchError && filteredUsers.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-sm">
              <div className="rounded-full bg-[#E5E5E6] p-3">
                <UserRound size={30} color="#727272" />
              </div>
              <p className="text-[#122A48] font-bold">No users found</p>
              <p className="text-[#727272] text-xs">
                No user have been added yet. <br/> Click the button below to start adding users.
              </p>
              <Button
                onClick={() => router.push('/admin/users/form')}
                className="cursor-pointer bg-transparent rounded-lg border border-[#727272] text-[#122A48] px-3 py-2 hover:bg-gray-100"
              >
                + Add User
              </Button>
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

      {/* ----------------------------------------------------------------------------------- */}

      {/* for mobile */}
      <div className="md:hidden text-[#122A48]">

        {/* filters */}
        <div className="flex justify-between items-center">
          <p className="font-bold">System users</p>
          <Button
            onClick={() => router.push('/admin/users/form')}
            className="p-5 py-5 rounded-lg cursor-pointer bg-[#1565BC] text-white shadow-[0_6px_4px_-4px_rgba(0,0,0,0.2)]"
          >
            <FaPlus color="white" /> Add User
          </Button>
        </div>

        <div className="flex gap-2 justify-between mt-3">
          <div className="flex items-center bg-[#FAFCFD] border-1 border-[#C6C6C8] rounded-lg px-3 gap-2 h-8">
            <FaSearch size={13} className="text-[#C6C6C8]" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search Users..."
              className="text-xs bg-transparent border-0 rounded-lg placeholder:text-gray text-[#122A48] focus-visible:ring-0 h-7 w-50"
            />
          </div>
          <Button
            onClick={() => {
              setTempRole(userRole)
              setTempStatus(userStatus)
              setFilterOpen(true)
            }}
            className="bg-[#FAFAFA] text-[#122A48] !border border-[#C6C6C8] text-[12px]"
          >
            <SlidersHorizontal /> Filter
          </Button>
        </div>
        
        {/* Cards */}
        <div className="flex flex-col gap-3 w-full text-[#122A48] mt-3">
          <div className="flex gap-2">
            {/* total users */}
            <div className="rounded-lg border border-[#C6C6C8] h-18 w-40 flex items-center p-3 gap-3 relative bg-[#FAFCFD] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)]">
              <div className="bg-[#CDE3DE] rounded-lg p-2">
                <FaUsers size={20} color={"#1565BC"} />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-[#122A48] leading-tight">{total}</span>
                <p className="text-xs text-[#122A48]">Total Users</p>
              </div>
            </div>

            {/* total active */}
            <div className="rounded-lg border border-[#C6C6C8] h-18 w-40 flex items-center p-3 gap-3 relative bg-[#FAFCFD] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)]">
              <div className="bg-[#B2FBC1] rounded-lg p-2">
                <BadgeCheck size={20} color={"#2C7B3C"} />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-[#122A48] leading-tight">{active}</span>
                <p className="text-xs text-[#122A48]">Active</p>
              </div>
            </div>

          </div>

          <div className="flex gap-2">
          {/* total inactive */}
          <div className="rounded-lg border border-[#C6C6C8] h-18 w-85 flex items-center p-3 gap-3 relative bg-[#FAFCFD] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)]">
            {/* icon */}
            <div className="bg-[#FFE5E5] rounded-lg p-2">
              <CircleOff size={20} color={"#FF0101"} />
            </div>

            <div className="flex flex-col">
              <span className="text-lg font-bold text-[#122A48] leading-tight">{inactive}</span>
              <p className="text-xs text-[#122A48]">Inactive</p>
            </div>
          </div>

          {/* total barangay officer */}
          <div className="rounded-lg border border-[#C6C6C8] h-18 w-85 flex items-center p-3 gap-3 relative bg-[#FAFCFD] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)]">
            {/* icon */}
            <div className="bg-[#DACDE3] rounded-lg p-2">
              <ShieldCheck size={20} color={"#582579"} />
            </div>

            <div className="flex flex-col">
              <span className="text-lg font-bold text-[#122A48] leading-tight">{barangay}</span>
              <p className="text-xs text-[#122A48]">Barnagay Officer</p>
            </div>
          </div>

          </div>
        </div>

        {/* users cards */}
        <div className="rounded-lg bg-[#FAFAFA] overflow-y-auto h-90 mt-3 border border-[#C6C6C8] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)]">
          <p className="font-semibold text-sm p-3">User Accounts</p>
          <hr />

          {/* fetch error state */}
          {fetchError ? (
            <div className="flex flex-col justify-center items-center text-center gap-3 py-25">
              {usersCache.retrying ? (
                <div className="flex flex-col items-center gap-3">
                  <SpinnerIcon size={32} color="#D81010" />
                  <p className="text-[#D81010] font-semibold text-xs">Retrying...</p>
                </div>
              ) : (
                <>
                  <p className="text-[#D81010] font-semibold text-xs">Failed to load users.<br /> Please try again later.</p>
                  <Button onClick={() => usersCache.refetch()} className="cursor-pointer bg-transparent rounded-lg border border-[#D81010] text-[#D81010] px-3 py-2 hover:bg-gray-100">Retry</Button>
                </>
              )}
            </div>
  
          /* empty */
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-18">
              <div className="rounded-full bg-[#E5E5E6] p-3">
                <UserRound size={28} color="#727272" />
              </div>
              <p className="text-[#122A48] font-bold text-sm">No users found</p>
              <p className="text-[#727272] text-xs text-center">
                No users have been added yet.
              </p>
              <Button
                onClick={() => router.push('/admin/users/form')}
                className="cursor-pointer bg-transparent rounded-lg border border-[#727272] text-[#122A48] text-xs px-3 py-2 hover:bg-gray-100"
              >
                + Add User
              </Button>
            </div>

          /* user cards */
          ) : (
            <div className="flex flex-col divide-y divide-[#C6C6C8]">
              {filteredUsers.map(user => (
                <div key={user.user_id} className="flex items-center gap-3 px-3 py-3">

                  {/* avatar */}
                  <div
                    className="rounded-full w-10 h-10 flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
                    style={{ backgroundColor: getAvatarColor(user.user_role) }}
                  >
                    {user.first_name.charAt(0)}{user.last_name.charAt(0)}
                  </div>

                  {/* info */}
                  <div className="flex flex-col flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[#122A48] truncate">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-xs text-[#727272] truncate">{user.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {/* role badge */}
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#CDE3DE] text-[#122A48]">
                        {ROLE_DISPLAY[user.user_role] ?? user.user_role}
                      </span>
                      {/* status badge */}
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        user.status === 'Active'
                          ? 'bg-[#B2FBC173] text-[#2C7B3C]'
                          : 'bg-[#FFE5E5] text-[#D81010]'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          user.status === 'Active' ? 'bg-[#1D8104]' : 'bg-[#BB2325]'
                        }`} />
                        {user.status}
                      </span>
                    </div>
                  </div>

                  {/* actions */}
                  <div className="relative flex-shrink-0">
                    <button
                      onClick={() => setOpenMenuId(openMenuId === user.user_id ? null : user.user_id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#C6C6C8] bg-white"
                    >
                      <MoreHorizontal size={16} className="text-[#122A48]" />
                    </button>

                    {/* dropdown */}
                    {openMenuId === user.user_id && (
                      <>
                        {/* backdrop to close */}
                        <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />

                        <div className="absolute right-0 top-9 z-50 bg-white border border-[#C6C6C8] rounded-lg shadow-md w-36 overflow-hidden">
                          <button
                            onClick={() => { router.push(`/admin/users/form?id=${user.user_id}`); setOpenMenuId(null) }}
                            className="flex items-center gap-2 w-full px-3 py-2.5 text-[12px] text-[#122A48] hover:bg-[#eaedf2]"
                          >
                            <SquarePen size={13} /> Edit
                          </button>

                          {user.status === 'Active' ? (
                            <button
                              onClick={() => { handleDeactivateClick(user); setOpenMenuId(null) }}
                              className="flex items-center gap-2 w-full px-3 py-2.5 text-[12px] text-[#D81010] hover:bg-[#FFE5E5]"
                            >
                              <UserMinus size={13} /> Deactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => { setReactivateDialog({ open: true, user }); setOpenMenuId(null) }}
                              className="flex items-center gap-2 w-full px-3 py-2.5 text-[12px] text-[#2C7B3C] hover:bg-[#CDE3DE]"
                            >
                              <UserPlus size={13} /> Activate
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

        {/* for filter dropdown */}
        {filterOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setFilterOpen(false)}
          />
        )}

        {/* sheet */}
        <div className={`
          fixed bottom-0 left-0 right-0 z-50 bg-[#FAFCFD] rounded-t-2xl shadow-xl
          transition-transform duration-300 ease-in-out
          ${filterOpen ? 'translate-y-0' : 'translate-y-full'}
        `}>
          {/* handle */}
          <div className="w-10 h-1 rounded-full bg-[#C6C6C8] mx-auto mt-3" />

          <div className="px-5 pt-4 pb-6">
            <div className="flex justify-between items-center mb-5">
              <p className="font-semibold text-[14px] text-[#122A48]">Filters</p>
              <button onClick={() => setFilterOpen(false)}>
                <X size={18} className="text-[#122A48]" />
              </button>
            </div>

            {/* Role */}
            <p className="text-[11px] font-medium text-[#6B7A90] uppercase tracking-wide mb-2">Role</p>
            <div className="flex gap-2 flex-wrap mb-5">
              {["All", "MENRO", "MENRO_Staff", "Barangay"].map(role => (
                <button
                  key={role}
                  onClick={() => setTempRole(role)}
                  className={`px-4 py-1.5 rounded-full text-[12px] font-medium border transition-colors
                    ${tempRole === role
                      ? 'bg-[#122A48] text-white border-[#122A48]'
                      : 'bg-white text-[#122A48] border-[#C6C6C8]'
                    }`}
                >
                  {role}
                </button>
              ))}
            </div>

            {/* Status */}
            <p className="text-[11px] font-medium text-[#6B7A90] uppercase tracking-wide mb-2">Status</p>
            <div className="flex gap-2 flex-wrap mb-6">
              {["All", "Active", "Inactive"].map(status => (
                <button
                  key={status}
                  onClick={() => setTempStatus(status)}
                  className={`px-4 py-1.5 rounded-full text-[12px] font-medium border transition-colors
                    ${tempStatus === status
                      ? 'bg-[#122A48] text-white border-[#122A48]'
                      : 'bg-white text-[#122A48] border-[#C6C6C8]'
                    }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={() => { setTempRole("All"); setTempStatus("All") }}
                className="flex-1 bg-white text-[#122A48] border border-[#C6C6C8] text-[13px]"
              >
                Clear
              </Button>
              <Button
                  onClick={() => {
                    setUserRole(tempRole)
                    setUserStatus(tempStatus)
                    setFilterOpen(false)
                  }}
                className="flex-1 bg-[#122A48] text-white text-[13px]"
              >
                Apply
              </Button>
            </div>
          </div>
        </div>

      </div>

      {/* Dialog */}

      {/* Reactivate Dialog */}
      <DialogModal
        open={reactivateDialog.open}
        onClose={() => setReactivateDialog({open: false, user: null})}
        onConfirm={handleReactivate}
        color={reactivateDialog.user?.user_role === 'Admin' ? DIALOG_COLOR.lightred : DIALOG_COLOR.lightgreen}
        icon={UserPlus}
        iconColor={reactivateDialog.user?.user_role === 'Admin' ? DIALOG_COLOR.red : DIALOG_COLOR.green}
        title={reactivateDialog.user?.user_role === 'Admin' ? "Reactivate Admin?" : "Reactivate User"}
        description={
          reactivateDialog.user?.user_role === 'Admin' ? (
            <>
              Reactivating <strong>{reactivateDialog.user?.first_name} {reactivateDialog.user?.last_name}</strong> as Admin will <strong>deactivate the current active Admin</strong>. You will be logged out immediately after this action. Are you sure you want to proceed?
            </>
          ) : (
            <>
              Are you sure you want to activate{" "}
              <strong>{reactivateDialog.user?.first_name} {reactivateDialog.user?.last_name}</strong>?
            </>
          )
        }
        cancelLabel='Cancel'
        confirmLabel={reactivateDialog.user?.user_role === 'Admin' ? 'Yes, Proceed' : 'Activate User'}
      />

      {/* Deactivate dialog */}
      <DialogModal
        open={deactivateDialog.open}
        onClose={() => setDeactivateDialog({open: false, user: null})}
        onConfirm={handlerDeactivate}
        color={DIALOG_COLOR.lightred}
        icon={UserMinus}
        iconColor={DIALOG_COLOR.red}
        title="Deactivate User"
        description={
          <>
            Are you sure you want to deactivate{" "}
            <strong>{deactivateDialog.user?.first_name} {deactivateDialog.user?.last_name}</strong>?
          </>
        }
        cancelLabel='Cancel'
        confirmLabel='Deactivate User'
      />

      {/* Blocked: cannot deactivate the only active Admin */}
      <DialogModal
        open={blockedDialog.open}
        onClose={() => setBlockedDialog({ open: false, user: null })}
        onConfirm={() => setBlockedDialog({ open: false, user: null })}
        color={DIALOG_COLOR.lightorange}
        icon={ShieldAlert}
        iconColor={DIALOG_COLOR.orange}
        title="Cannot Deactivate Admin"
        description={
          <>
            <strong>{blockedDialog.user?.first_name} {blockedDialog.user?.last_name}</strong> is the only active Admin account. There must always be at least one active Admin — activate another Admin first before deactivating this one.
          </>
        }
        confirmLabel="Okay"
      />

      {/* Admin Reactivated — Logout Confirmation */}
      <DialogModal
        open={adminReactivatedDialog.open}
        onClose={() => {}}
        onConfirm={handleAdminReactivatedConfirm}
        color={DIALOG_COLOR.lightblue}
        icon={CheckCircle}
        iconColor={DIALOG_COLOR.blue}
        title="Admin Reactivated"
        description={
          <>
            <strong>{adminReactivatedDialog.user?.first_name} {adminReactivatedDialog.user?.last_name}</strong> is now the active Admin. Click <strong>OK</strong> to log out and return to the login page.
          </>
        }
        confirmLabel="OK"
      />

      {/* Loading Dialog */}
      <DialogModal
        open={loadingDialog.open}
        color={DIALOG_COLOR.lightblue}
        icon={SpinnerIcon}
        iconColor={DIALOG_COLOR.blue}
        title={"Saving Changes"}
        description={
          <>
            Updating user account status, please wait...
          </>
        }
      />

      {/* success dialog */}
      <DialogModal
        open={successDialog.open}
        onConfirm={handleSuccessConfirm}
        color={DIALOG_COLOR.lightgreen}
        icon={BadgeCheck}
        iconColor={DIALOG_COLOR.green}
        title="Status Updated!"
        description={
          <>
            <strong>{actionResult.user?.first_name} {actionResult.user?.last_name}</strong> has been {actionResult.action?.toLowerCase()} successfully.
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