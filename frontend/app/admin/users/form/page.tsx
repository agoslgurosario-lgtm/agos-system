"use client"

// react
import { useSearchParams, useRouter, } from "next/navigation"
import { useState, useEffect, useRef, Suspense } from "react"

// constant
import { DIALOG_COLOR } from "@/lib/constant";

// components
import { DialogModal } from "@/components/DialogModal";
import { SpinnerIcon } from "@/components/SpinnerIcon"

// lib
import { getErrorMessage } from "@/lib/utils";
import { sameText } from "@/lib/formDiff";
import { useUnsavedChangesGuard } from "@/lib/navigation-guard";

// icons
import { UserPlus, SquarePen, MapPin, UserRound, ClipboardCheck, UserCheck, Check, AlertTriangle, CheckCircle, BadgeCheck, X } from "lucide-react";

// shadcn
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// api + auth
import { api } from "@/lib/api"
import { clearAuth, setSuppressInactiveRedirect } from "@/lib/auth";

type DialogState = {
  open: boolean;
};

type Barangay = { 
  barangay_id: number; 
  barangay_name: string 
}

const MENRO_OFFICE = "MENRO Office"

const ROLE_DISPLAY: Record<string, string> = {
  'MENRO': 'MENRO Officer',
  'MENRO_Staff': 'MENRO Staff',
  'Barangay': 'Barangay Personnel',
  'Admin': 'Admin',
}

function FormInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const id = searchParams.get('id')

  const isEdit = !!id

  // us
  const [fname, setFname] = useState<string>('')
  const [lname, setLname] = useState<string>('')
  const [position, setPosition] = useState<string>('')
  const [role, setRole] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [status, setStatus] = useState<string>('')
  const [barangays, setBarangays] = useState<Barangay[]>([])
  const [barangayId, setBarangayId] = useState<number | null>(null)

  // form us
  const [formLoading, setFormLoading] = useState<boolean>(isEdit)
  const [saved, setSaved] = useState<boolean>(false)
  const pendingHref = useRef<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [original, setOriginal] = useState<{
    fname: string; lname: string; email: string
    role: string; position: string; barangayId: number | null
  } | null>(null)

  // dialog us
  const [cancelDialog, setCancelDialog] = useState<DialogState>({
    open: false,
  })
  const [confirmDialog, setConfirmDialog] = useState<DialogState>({
    open: false,
  })
  const [loadingDialog, setLoadingDialog] = useState<DialogState>({
    open: false,
  })
  const [adminWarningDialog, setAdminWarningDialog] = useState<DialogState>({ open: false })
  const [adminCreatedDialog, setAdminCreatedDialog] = useState<DialogState>({ open: false })

  const [successDialog, setSuccessDialog] = useState<DialogState>({ open: false })
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; message: string }>({ open: false, message: '' })
  
  // refs
  const fnameRef = useRef<HTMLDivElement>(null)
  const lnameRef = useRef<HTMLDivElement>(null)
  const roleRef = useRef<HTMLDivElement>(null)
  const barangayRef = useRef<HTMLDivElement>(null)
  const positionRef = useRef<HTMLDivElement>(null)
  const emailRef = useRef<HTMLDivElement>(null)

  // get barangay
  useEffect(() => {
    const loadBarangays = async () => {
      try {
        const data = await api.get('/api/barangays/all/')
        setBarangays(data.results ?? data)
      } catch (err) {
        setErrorDialog({ open: true, message: getErrorMessage(err) })
      }
    }
    loadBarangays()
  }, [])

  useEffect(() => {
    if (!isEdit) return

    const loadUser = async () => {
      try {
        const data = await api.get(`/api/users/${id}/`)
        setFname(data.first_name)
        setLname(data.last_name)
        setRole(data.user_role)
        setEmail(data.email)
        setStatus(data.status)
        setPosition(data.position ?? '')
        setBarangayId(data.barangay_id ?? null)
        setOriginal({
          fname: data.first_name,
          lname: data.last_name,
          email: data.email,
          role: data.user_role,
          position: data.position ?? '',
          barangayId: data.barangay_id ?? null,
        })
      } catch (err) {
        setErrorDialog({ open: true, message: getErrorMessage(err) })
      } finally {
        setFormLoading(false)
      }
    }
    loadUser()
  }, [id])

  const selectedBarangay = barangays.find(b => b.barangay_id === barangayId)
  const officeDisplay = (role === 'MENRO' || role === 'MENRO_Staff')
    ? MENRO_OFFICE
    : selectedBarangay?.barangay_name ?? 'Office/Barangay'
  
  const hasNoOfficer = (r: string) => r === 'Admin' || r === 'MENRO' || r === 'MENRO_Staff'

  const isUnchanged = isEdit && !!original &&
    sameText(fname, original.fname) &&
    sameText(lname, original.lname) &&
    sameText(email, original.email) &&
    role === original.role &&
    (hasNoOfficer(role) ||
      (sameText(position, original.position) && barangayId === original.barangayId))

  const addHasInput =
    !!fname.trim() || !!lname.trim() || !!email.trim() || !!position.trim() ||
    !!role || barangayId !== null

  const isDirty = !saved && (isEdit ? !!original && !isUnchanged : addHasInput)

  useUnsavedChangesGuard(isDirty, (href) => {
    pendingHref.current = href
    setCancelDialog({ open: true })
  })

  // handlers
  const handleCancelDialog = () => {
    pendingHref.current = null
    if (!isDirty) {
      router.push('/admin/users')
      return
    }
    setCancelDialog({ open: true })
  }
  const handleCancelConfirm = () => {
    setCancelDialog({ open: false })
    router.push(pendingHref.current ?? '/admin/users')
  }

  const handleConfirmationDialog = () => {
    const errors: Record<string, string> = {}
    if (!fname.trim()) errors.fname = 'This field is required.'
    if (!lname.trim()) errors.lname = 'This field is required.'
    if (role !== 'MENRO' && role !== 'MENRO_Staff' && role !== 'Admin' && !position.trim()) errors.position = 'This field is required.'
    if (!role) errors.role = 'This field is required.'
    if (role !== 'MENRO' && role !== 'MENRO_Staff' &&  role !== 'Admin' && !barangayId) errors.barangayId = 'This field is required.'
    if (!email.trim()) errors.email = 'This field is required.'

    setFieldErrors(errors)

    if (Object.keys(errors).length > 0) {
      if (errors.fname) {
        fnameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } else if (errors.lname) {
        lnameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } else if (errors.role) {
        roleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } else if (errors.barangayId) {
        barangayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } else if (errors.position) {
        positionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } else if (errors.email) {
        emailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return
    }

    if (isUnchanged) {
      router.push('/admin/users')
      return
    }

    // Show special admin warning dialog instead of normal confirm
    if (!isEdit && role === 'Admin') {
      setSuppressInactiveRedirect(true)
      setAdminWarningDialog({ open: true })
      return
    }

    setConfirmDialog({ open: true })
  }
  
  const handleSubmit = async () => {
    setConfirmDialog({ open: false })
    setLoadingDialog({ open: true })

    try {
      const payload = {
        first_name: fname,
        last_name: lname,
        email,
        user_role: role,
        position: role === 'Admin' || role === 'MENRO' || role === 'MENRO_Staff' ? '' : position,
        barangay_id: role === 'Admin' || role === 'MENRO' || role === 'MENRO_Staff' ? null : barangayId,
      }

      if (isEdit) {
        await api.patch(`/api/users/${id}/`, payload)
      } else {
        await api.post('/api/users/', payload)
      }

      setLoadingDialog({ open: false })
      setSaved(true)

      // If new admin was created, log out current admin
      if (!isEdit && role === 'Admin') {
        setAdminCreatedDialog({ open: true })
        return
      }

      setSuccessDialog({ open: true })

    } catch (err: any) {
      setLoadingDialog({ open: false })

      if (err && typeof err === 'object') {
        const backendErrors: Record<string, string> = {}
        for (const key in err) {
          backendErrors[key] = Array.isArray(err[key]) ? err[key][0] : err[key]
        }
        setFieldErrors(backendErrors)
      }

      setErrorDialog({
        open: true,
        message: isEdit
          ? `Failed to save changes for ${fname} ${lname}. Please try again.`
          : 'Failed to create user. Please try again.'
      })
    }
  }

  const handleAdminWarningConfirm = () => {
    setAdminWarningDialog({ open: false })
    handleSubmit()
  }

  const handleAdminCreatedConfirm = async () => {
    setAdminCreatedDialog({ open: false })
    try {
      await api.post('/api/auth/logout/', {})
    } catch (err) {
      console.log(err)
    } finally {
      clearAuth()
      window.location.href = "/login"
    }
  }

  const handleSuccessConfirm = () => {
    setSuccessDialog({ open: false })
    router.push('/admin/users')
  }

  if (isEdit && formLoading) return (
    <div className="flex flex-col gap-3 justify-center items-center h-full">
      <SpinnerIcon size={32} color="#122A48" />
      <p>Loading...</p>
    </div>
  )

  return (
    <>

      <div className="hidden md:flex md:flex-col md:h-full">
        
        {/* header */}
        <div className="flex justify-between w-full">
          {/* left side */}
          <div className="flex gap-3">
            <div className={`rounded-lg py-3 px-3 text-white ${isEdit ? 'bg-[#FF9705]' : 'bg-[#1565BC]'}`}>
              {isEdit ? <SquarePen size={20} /> : <UserPlus size={20} />}
            </div>

            <div className="flex flex-col text-[#122A48] justify-center">
              <p className="font-bold text-sm">{isEdit ? 'Edit User Account' : 'Add User Account'}</p>
              <p className="text-xs">
                {isEdit ? `Modifying account for ${fname} ${lname} | ${ROLE_DISPLAY[role] ?? role}` : '...'}
              </p>
            </div>
          </div>

          {/* right side */}
            <Button
              onClick={handleCancelDialog}
              className="rounded-lg bg-[#FAFCFD] hover:bg-[#bdcfd7] px-3 py-3 text-xs text-[#122A48] border border-[#C6C6C8] cursor-pointer"
            >
              Back
            </Button>
        </div>

        {/* bottom part */}
        <div className="flex gap-2 mt-3">
          {/* profile container */}
          <div className="flex flex-col justify-center bg-[#FAFCFD] border border-[#C6C6C8] rounded-lg p-1 w-110 h-90 shadow-[0_6px_4px_-4px_rgba(0,0,0,0.2)]">
            <div className={`bg-[#2C7B3C] rounded-full w-18 h-18 mx-auto flex items-center justify-center text-white font-bold ${isEdit ? 'text-[33px]' : 'text-[30px] '}`}>
              {isEdit ? `${fname?.charAt(0) ?? ''}${lname?.charAt(0) ?? ''}` : '?'}
            </div>

            <p className="text-center text-[#122A48] mt-2 font-bold text-sm">{isEdit ? `${fname} ${lname}` : 'Full Name'}</p>
            <p className="text-center text-[#122A48] text-xs">
              {isEdit ? ROLE_DISPLAY[role] ?? role : '---'}
            </p>

            {/* status */}
            <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium justify-center mx-auto mt-1.5 ${
              (isEdit ? status : 'Active') === 'Active'
                ? 'bg-[#B2FBC173] text-[#2C7B3C]'
                : 'bg-[#FFE5E5] text-[#D81010]'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                (isEdit ? status : 'Active') === 'Active' ? 'bg-[#1D8104]' : 'bg-[#BB2325]'
              }`}/>
              {isEdit ? status : 'Active'}
            </span>

            <div className="flex flex-col gap-1 mt-7 px-4">
              <div className="flex justify-between text-xs">
                <span className="text-[#122A48] font-medium">Role</span>
                <span className="font-semibold text-[#122A48]">
                  {isEdit ? ROLE_DISPLAY[role] ?? role : '---'}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#122A48] font-medium">Email</span>
                <span className="font-semibold text-[#122A48]">{isEdit ? email : '---'}</span>
              </div>
            </div>

            <hr className="mx-4 my-7" />

            <div className={`rounded-full flex gap-2 bg-[#1565BC29] text-[#1565BC] py-1.5 justify-center items-center ${isEdit ? 'mx-17' : 'mx-17'} `}>
              <MapPin size={15}/>
              <p className="text-center text-xs">{officeDisplay}</p>
            </div>
          </div>

          {/* form container */}
          <form className="flex flex-col gap-4 w-full">
            
            {/* personal information */}
            <div className="text-[#122A48] bg-[#FAFCFD] border border-[#C6C6C8] rounded-lg shadow-[0_6px_4px_-4px_rgba(0,0,0,0.2)]">
              {/* header */}
              <div className="flex gap-3 p-3 w-238">
                <div className="rounded-lg p-3 text-[#1565BC] bg-[#CDE3DE]">
                  <UserRound size={20}/>
                </div>
                <div className="flex flex-col justify-center">
                  <p className="font-bold text-sm">Personal Information</p>
                  <p className="text-xs text-[#727272]">Basic identity details of the user</p>
                </div>
              </div>

              <hr />

              {/* inputs for PI */}
              <div className="p-2">
                <div className="flex gap-5 w-full">
                  {/* fname */}
                  <div ref={fnameRef}>
                    <Field className="flex gap-1.5 flex-col w-[400px]">
                      <FieldLabel className="text-[#122A48] text-xs">FIRST NAME <span className="text-[#FF0000]">*</span></FieldLabel>
                        <Input
                          name="fname"
                          value={fname}
                          onChange={(e) => {
                            setFname(e.target.value)
                          }}
                          placeholder="e.g. Patricia"
                          className={`text-[#122A48] rounded-lg text-xs bg-white !font-normal h-8 bg-[#1565BC05] ${
                            fieldErrors.fname ? 'border-[#FF0000]' : 'border-[#727272]'
                          }`}
                        />
                        <FieldError className="text-[11px]">{fieldErrors.fname}</FieldError>
                    </Field>
                  </div>
                  
                  {/* lname */}
                  <div ref={lnameRef} >
                    <Field className="flex gap-1.5 flex-col w-[400px]">
                      <FieldLabel className="text-[#122A48] text-xs">LAST NAME <span className="text-[#FF0000]">*</span></FieldLabel>
                        <Input
                          name="lname"
                          value={lname}
                          onChange={(e) => {
                            setLname(e.target.value)
                          }}
                          placeholder="e.g. Quinto"
                          className={`text-[#122A48] rounded-lg text-xs bg-white !font-normal h-8 bg-[#1565BC05] ${
                            fieldErrors.lname ? 'border-[#FF0000]' : 'border-[#727272]'
                          }`}
                        />
                        <FieldError className="text-[11px]">{fieldErrors.lname}</FieldError>
                    </Field>
                  </div>
                </div>

              </div>

            </div>

            {/* role and assignment */}
            <div className="text-[#122A48] bg-[#FAFCFD] border border-[#C6C6C8] rounded-lg shadow-[0_6px_4px_-4px_rgba(0,0,0,0.2)]">
              {/* header */}
              <div className="flex gap-3 p-3 w-238">
                <div className="rounded-lg p-3 text-[#1565BC] bg-[#CDE3DE]">
                  <ClipboardCheck size={20}/>
                </div>
                <div className="flex flex-col justify-center">
                  <p className="font-bold text-sm">Role & Assignment</p>
                  <p className="text-xs text-[#727272]">Access level and barangay coverage</p>
                </div>
              </div>

              <hr />

              {/* inputs for R&A */}
              <div className="p-3">
                <div className="flex gap-5 w-full">
                  {/* role */}
                  <div ref={roleRef}>
                    <Field className="flex gap-1.5 flex-col w-[400px]">
                      <FieldLabel className="text-[#122A48] text-xs">ROLE <span className="text-[#FF0000]">*</span></FieldLabel>
                        <Select
                          value={role}
                          onValueChange={(value) => {
                            setRole(value)
                            if (value === 'MENRO' || value === 'MENRO_Staff' || value === 'Admin') {
                              setBarangayId(null)
                              setPosition('')
                            }
                            if (fieldErrors.role) setFieldErrors(prev => ({ ...prev, role: '' }))
                          }}
                        >
                          <SelectTrigger className={`text-xs cursor-pointer !font-normal bg-[#1565BC05] h-8 rounded-lg ${fieldErrors.role ? 'border-[#FF0000]' : 'border-[#727272]'}`}>
                            <SelectValue placeholder="Select Role..." />
                          </SelectTrigger>
                          <SelectContent position="popper" side="bottom">
                            <SelectItem className="text-[#122A48] p-2 text-xs cursor-pointer" value="Admin">Admin</SelectItem>
                            <SelectItem className="text-[#122A48] p-2 text-xs cursor-pointer" value="MENRO">MENRO Officer</SelectItem>
                            <SelectItem className="text-[#122A48] p-2 text-xs cursor-pointer" value="MENRO_Staff">MENRO Staff</SelectItem>
                            <SelectItem className="text-[#122A48] p-2 text-xs cursor-pointer" value="Barangay">Barangay Personnel</SelectItem>
                          </SelectContent>
                        </Select>
                        <FieldError className="text-[11px]">{fieldErrors.role}</FieldError>
                    </Field>
                  </div>
                  
                  {/* barangay */}
                  {role !== 'MENRO' && role !== 'MENRO_Staff' && role !== 'Admin' && (
                    <div ref={barangayRef}>
                      <Field className="flex gap-1.5 flex-col w-[400px]">
                        <FieldLabel className="text-[#122A48] text-xs">BARANGAY <span className="text-[#FF0000]">*</span></FieldLabel>
                        <Select
                          value={barangayId ? String(barangayId) : ''}
                          onValueChange={(value) => {
                            setBarangayId(Number(value))
                            if (fieldErrors.barangayId) setFieldErrors(prev => ({ ...prev, barangayId: '' }))
                          }}
                        >
                          <SelectTrigger className={`!font-normal bg-[#1565BC05] h-8 cursor-pointer text-xs rounded-lg ${fieldErrors.barangayId ? 'border-[#FF0000]' : 'border-[#727272]'}`}>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent position="popper" side="bottom" avoidCollisions={false}>
                            {barangays.map(b => (
                              <SelectItem className="text-xs cursor-pointer p-2" key={b.barangay_id} value={String(b.barangay_id)}>
                                {b.barangay_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FieldError className="text-[11px]">{fieldErrors.barangayId}</FieldError>
                      </Field>
                    </div>
                  )}
                </div>

                {/* position/designation */}
                {role !== 'MENRO' && role !== 'MENRO_Staff' && role !== 'Admin' && (
                  <div className="mt-3">
                    <div ref={positionRef}>
                      <Field className="flex gap-1.5 flex-col w-100">
                        <FieldLabel className="text-[#122A48] text-xs">POSITION <span className="text-[#FF0000]">*</span></FieldLabel>
                        <Select
                          value={position}
                          onValueChange={(value) => {
                            setPosition(value)
                            if (fieldErrors.position) setFieldErrors(prev => ({ ...prev, position: '' }))
                          }}
                        >
                          <SelectTrigger className={`!font-normal bg-[#1565BC05] h-8 cursor-pointer text-xs rounded-lg ${fieldErrors.position ? 'border-[#FF0000]' : 'border-[#727272]'}`}>
                            <SelectValue placeholder="Select position..." />
                          </SelectTrigger>
                          <SelectContent position="popper" className='w-100 min-w-0'>
                            <SelectItem className="text-xs cursor-pointer p-2 text-[#122A48]" value="Barangay Health Inspector">Barangay Health Inspector</SelectItem>
                            <SelectItem className="text-xs cursor-pointer p-2 text-[#122A48]" value="Barangay Secretary">Barangay Secretary</SelectItem>
                            <SelectItem className="text-xs cursor-pointer p-2 text-[#122A48]" value="Barangay Health Care Worker">Barangay Health Care Worker</SelectItem>
                          </SelectContent>
                        </Select>
                        <FieldError className="text-[11px]">{fieldErrors.position}</FieldError>
                      </Field>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* acct credentials */}
            <div className="text-[#122A48] bg-[#FAFCFD] border border-[#C6C6C8] rounded-lg shadow-[0_6px_4px_-4px_rgba(0,0,0,0.2)]">
              {/* header */}
              <div className="flex gap-3 p-3 w-238">
                <div className="rounded-lg p-3 text-[#1565BC] bg-[#CDE3DE]">
                  <UserCheck size={20}/>
                </div>
                <div className="flex flex-col justify-center">
                  <p className="font-bold text-sm">Account Credentials</p>
                  <p className="text-xs text-[#727272]">Login email information</p>
                </div>
              </div>

              <hr />

              {/* inputs for PI */}
              <div className="p-3">
                <div className="flex gap-5 w-full">
                  {/* email */}
                 <div ref={emailRef}>
                   <Field className="flex gap-1.5 flex-col w-[400px]">
                      <FieldLabel className="text-[#122A48] text-xs">EMAIL <span className="text-[#FF0000]">*</span></FieldLabel>
                        <Input
                          name="email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value)
                          }}
                          placeholder="e.g. patpobeast@rosario.gov.ph"
                          className={`text-[#122A48] rounded-lg bg-white !font-normal h-8 text-xs bg-[#1565BC05] ${
                            fieldErrors.email ? 'border-[#FF0000]' : 'border-[#727272]'
                          }`}
                        />
                        <FieldError className="text-[11px]">{fieldErrors.email}</FieldError>
                    </Field>
                 </div>
                </div>
              </div>

            </div>

            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                onClick={handleCancelDialog}
                className="cursor-pointer border border-[#C6C6C8] text-[#727272] rounded-lg bg-[#FAFCFD] hover:text-[#525050] hover:bg-[#adbac1] px-4 py-3 text-xs">
                  Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmationDialog}
                className="cursor-pointer rounded-lg bg-[#1565BC] hover:bg-[#13569e] px-5 pl-4 py-3 text-xs"> <Check/> {isEdit ? 'Save Changes' : 'Create User Account'}
              </Button>
            </div>

          </form>

        </div>

      </div>

      {/* --------------------------------------------------------------- */}

      {/* for mobile */}
      <div className="md:hidden">

        {/* profile container */}
        <div className="flex items-center gap-3 bg-[#FAFCFD] border border-[#C6C6C8] rounded-lg p-3 shadow-[0_6px_4px_-4px_rgba(0,0,0,0.2)]">
          
          {/* avatar */}
          <div className={`bg-[#2C7B3C] rounded-full w-14 h-14 flex-shrink-0 flex items-center justify-center text-white font-bold ${isEdit ? 'text-[22px]' : 'text-[27px]'}`}>
            {isEdit ? `${fname.charAt(0)}${lname.charAt(0)}` : '?'}
          </div>

          {/* info */}
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            
            {/* row 1 - full name */}
            <p className="text-[#122A48] font-semibold text-sm truncate">
              {isEdit ? `${fname} ${lname}` : 'Full Name'}
            </p>

            {/* row 2 - role and email */}
            <div className="flex gap-3">
              <p className="text-xs text-[#122A48] truncate">
                <span className="font-medium">Role:</span> {isEdit ? ROLE_DISPLAY[role] ?? role : '---'}
              </p>
              <p className="text-xs text-[#122A48] truncate"><span className="font-medium">Email:</span> {isEdit ? email : '---'}</p>
            </div>

            {/* row 3 - status and office/barangay */}
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${
                (isEdit ? status : 'Active') === 'Active'
                  ? 'bg-[#B2FBC173] text-[#2C7B3C]'
                  : 'bg-[#FFE5E5] text-[#D81010]'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  (isEdit ? status : 'Active') === 'Active' ? 'bg-[#1D8104]' : 'bg-[#BB2325]'
                }`}/>
                {isEdit ? status : 'Active'}
              </span>

              <div className="flex items-center gap-1 rounded-full bg-[#1565BC29] text-[#1565BC] px-2.5 py-0.5 text-[10px] min-w-0">
                <MapPin size={11} className="flex-shrink-0" />
                <p className="truncate">{selectedBarangay?.barangay_name ?? 'Office/Barangay'}</p>
              </div>
            </div>

          </div>
        </div>

        {/* form */}
        <form action="">

          {/* personal information */}
          <div className="mt-3 text-[#122A48] bg-[#FAFCFD] border border-[#C6C6C8] rounded-lg shadow-[0_6px_4px_-4px_rgba(0,0,0,0.2)]">
            {/* header */}
            <div className="flex gap-3 p-3">
              <div className="rounded-lg p-2 text-[#1565BC] bg-[#CDE3DE]">
                <UserRound size={21}/>
              </div>
              <div className="flex flex-col justify-center">
                <p className="font-bold text-sm">Personal Information</p>
                <p className="text-[11px] text-[#727272] ">Basic identity details of the user</p>
              </div>
            </div>

            <hr />

            {/* inputs for PI */}
            <div className="p-3">
              <div className="flex gap-5 w-full">
                {/* fname */}
                <Field className="flex gap-1.5 flex-col w-[400px]">
                  <FieldLabel className="text-[#122A48] text-xs">FIRST NAME <span className="text-[#FF0000]">*</span></FieldLabel>
                    <Input
                      name="fname"
                      value={fname}
                      onChange={(e) => {
                        setFname(e.target.value)
                      }}
                      placeholder="e.g. Patricia"
                      className={`text-[#122A48] rounded-lg text-xs bg-white !font-normal h-9 bg-[#1565BC05] ${
                        fieldErrors.fname ? 'border-[#FF0000]' : 'border-[#727272]'
                      }`}
                    />
                    <FieldError className="text-xs">{fieldErrors.fname}</FieldError>
                </Field>
                
                {/* lname */}
                <Field className="flex gap-1.5 flex-col w-[400px]">
                  <FieldLabel className="text-[#122A48] text-xs">LAST NAME <span className="text-[#FF0000]">*</span></FieldLabel>
                    <Input
                      name="lname"
                      value={lname}
                      onChange={(e) => {
                        setLname(e.target.value)
                      }}
                      placeholder="e.g. Quinto"
                      className={`text-[#122A48] rounded-lg text-xs bg-white !font-normal h-9 bg-[#1565BC05] ${
                        fieldErrors.lname ? 'border-[#FF0000]' : 'border-[#727272]'
                      }`}
                    />
                    <FieldError className="text-xs">{fieldErrors.lname}</FieldError>
                </Field>
              </div>

              {/* position/designation */}
              {role !== 'MENRO_Staff' && role !== 'MENRO' && role !== 'Admin' &&  (
                <div className="mt-3">
                  <div ref={positionRef}>
                    <Field className="flex gap-1.5 flex-col w-100">
                      <FieldLabel className="text-[#122A48] text-sm">POSITION <span className="text-[#FF0000]">*</span></FieldLabel>
                      <Select
                        value={position}
                        onValueChange={(value) => {
                          setPosition(value)
                          if (fieldErrors.position) setFieldErrors(prev => ({ ...prev, position: '' }))
                        }}
                      >
                        <SelectTrigger className={`!font-normal bg-[#1565BC05] py-[20px] rounded-lg ${fieldErrors.position ? 'border-[#FF0000]' : 'border-[#727272]'}`}>
                          <SelectValue placeholder="Select position..." />
                        </SelectTrigger>
                        <SelectContent position="popper" className='w-100 min-w-0'>
                          <SelectItem className="p-2 text-[#122A48]" value="Barangay Health Inspector">Barangay Health Inspector</SelectItem>
                          <SelectItem className="p-2 text-[#122A48]" value="Barangay Secretary">Barangay Secretary</SelectItem>
                          <SelectItem className="p-2 text-[#122A48]" value="Barangay Health Care Worker">Barangay Health Care Worker</SelectItem>
                        </SelectContent>
                      </Select>
                      <FieldError className="text-xs">{fieldErrors.position}</FieldError>
                    </Field>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* role and assignment */}
          <div className="text-[#122A48] bg-[#FAFCFD] border border-[#C6C6C8] rounded-lg mt-3 shadow-[0_6px_4px_-4px_rgba(0,0,0,0.2)]">
            {/* header */}
            <div className="flex gap-3 p-3 w-238">
              <div className="rounded-lg p-2 text-[#1565BC] bg-[#CDE3DE]">
                <ClipboardCheck size={21}/>
              </div>
              <div className="flex flex-col justify-center">
                <p className="font-bold text-sm">Role & Assignment</p>
                <p className="text-[11px] text-[#727272]">Access level and barangay coverage</p>
              </div>
            </div>

            <hr />

            {/* inputs for R&A */}
            <div className="p-3">
              <div className="flex flex-col gap-5 w-full">
                {/* role */}
                <Field className="flex gap-1.5 flex-col">
                  <FieldLabel className="text-[#122A48] text-xs">ROLE <span className="text-[#FF0000]">*</span></FieldLabel>
                    <Select
                    value={role}
                    onValueChange={(value) => {
                      setRole(value)
                      if (value === 'MENRO' || value === 'MENRO_Staff' || value === 'Admin') {
                        setBarangayId(null)
                        setPosition('')
                      }
                      if (fieldErrors.role) setFieldErrors(prev => ({ ...prev, role: '' }))
                    }}
                  >
                    <SelectTrigger className={`text-xs !font-normal bg-[#1565BC05] py-[17px] rounded-lg ${fieldErrors.role ? 'border-[#FF0000]' : 'border-[#727272]'}`}>
                      <SelectValue placeholder="Select Role..." />
                    </SelectTrigger>
                    <SelectContent position="popper" side="bottom">
                      <SelectItem className="text-[#122A48] p-2 text-xs" value="Admin">Admin</SelectItem>
                      <SelectItem className="text-[#122A48] p-2 text-xs" value="MENRO">MENRO Officer</SelectItem>
                      <SelectItem className="text-[#122A48] p-2 text-xs" value="MENRO_Staff">MENRO Staff</SelectItem>
                      <SelectItem className="text-[#122A48] p-2 text-xs" value="Barangay">Barangay Personnel</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldError className="text-xs">{fieldErrors.role}</FieldError>
                </Field>
                
                {/* office/barangay */}
                {role !== 'MENRO' && role !== 'Admin' && (
                  <div ref={barangayRef}>
                    <Field className="flex gap-1.5 flex-col w-[400px]">
                      <FieldLabel className="text-[#122A48] text-sm">BARANGAY <span className="text-[#FF0000]">*</span></FieldLabel>
                      <Select
                        value={barangayId ? String(barangayId) : ''}
                        onValueChange={(value) => {
                          setBarangayId(Number(value))
                          if (fieldErrors.barangayId) setFieldErrors(prev => ({ ...prev, barangayId: '' }))
                        }}
                      >
                        <SelectTrigger className={`!font-normal bg-[#1565BC05] py-[20px] rounded-lg ${fieldErrors.barangayId ? 'border-[#FF0000]' : 'border-[#727272]'}`}>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent position="popper">
                          {barangays.map(b => (
                            <SelectItem key={b.barangay_id} value={String(b.barangay_id)}>
                              {b.barangay_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldError className="text-xs">{fieldErrors.barangayId}</FieldError>
                    </Field>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* acct credentials */}
          <div className="text-[#122A48] bg-[#FAFCFD] border border-[#C6C6C8] rounded-lg mt-3 shadow-[0_6px_4px_-4px_rgba(0,0,0,0.2)]">
            {/* header */}
            <div className="flex gap-3 p-3 w-238">
              <div className="rounded-lg p-2 text-[#1565BC] bg-[#CDE3DE]">
                <UserCheck size={21}/>
              </div>
              <div className="flex flex-col justify-center">
                <p className="font-bold text-xs">Account Credentials</p>
                <p className="text-[11px] text-[#727272]">Login email information</p>
              </div>
            </div>

            <hr />

            {/* inputs for PI */}
            <div className="p-3">
              <div className="flex flex-col gap-3 w-full">             
                {/* email */}
                <Field className="flex gap-1.5 flex-col">
                  <FieldLabel className="text-[#122A48] text-xs">EMAIL <span className="text-[#FF0000]">*</span></FieldLabel>
                    <Input
                      name="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                      }}
                      placeholder="e.g. patpobeast@rosario.gov.ph"
                      className={`text-[#122A48] rounded-lg text-xs bg-white !font-normal h-9 bg-[#1565BC05] ${
                        fieldErrors.email ? 'border-[#FF0000]' : 'border-[#727272]'
                      }`}
                    />
                    <FieldError className="text-xs">{fieldErrors.email}</FieldError>
                </Field>
              </div>
            </div>

          </div>

          {/* button */}
          <div className="flex gap-3 justify-end mt-3">
            <Button
              type="button"
              onClick={handleCancelDialog}
              className="cursor-pointer border border-[#C6C6C8] text-[#727272] rounded-lg bg-[#FAFCFD] hover:text-[#525050] hover:bg-[#adbac1] px-7 py-4.5">
                Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmationDialog}
              className="cursor-pointer rounded-lg bg-[#1565BC] hover:bg-[#13569e] px-5 pl-4 py-4.5"> <Check/> {isEdit ? 'Save Changes' : 'Create User Account'}
            </Button>
          </div>
        </form>


        



      </div>

      {/* Dialog */}

      {/* Cancel dialog */}
      <DialogModal
        open={cancelDialog.open}
        onClose={() => { pendingHref.current = null; setCancelDialog({ open: false }) }}
        onConfirm={handleCancelConfirm}
        color={isEdit ? DIALOG_COLOR.lightyellow : DIALOG_COLOR.lightred}
        icon={isEdit ? SquarePen : UserPlus}
        iconColor={isEdit ? DIALOG_COLOR.yellow : DIALOG_COLOR.red}
        title={isEdit? "Cancel Changes" : "Cancel Adding User"}
        description={isEdit ? "You have unsaved changes that will be lost if you cancel." : "Are you sure you want to cancel? This user account has not been created yet."}
        cancelLabel="Keep Editing"
        confirmLabel='Yes, Cancel'
      />

      {/* Confirmation Dialog */}
      <DialogModal
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({open: false})}
        onConfirm={handleSubmit}
        color={DIALOG_COLOR.lightgreen}
        icon={isEdit ? SquarePen : UserPlus}
        iconColor={DIALOG_COLOR.green}
        title={isEdit? "Confirm Changes" : "Confirm Adding User"}
        description={isEdit ?
          <>
            Are you sure you want to change <strong>{fname} {lname}</strong> information?
          </>
          :
          <>
            Are you sure you want to add this new user?
          </>
        }
        cancelLabel="Keep Editing"
        confirmLabel={isEdit ? 'Confirm Changes' : 'Add User'}
      />

      {/* Loading Dialog */}
      <DialogModal
        open={loadingDialog.open}
        color={DIALOG_COLOR.lightblue}
        icon={SpinnerIcon}
        iconColor={DIALOG_COLOR.blue}
        title={isEdit? "Saving Changes" : "Saving User Account"}
        description={isEdit ? 
          <>
            Processing account detail changes for <strong>{fname} {lname}</strong>. Please wait.
          </>
          : 
          <>
            Proccessing account details. Please wait.
          </>
        }
      />

      {/* Admin Warning Dialog */}
      <DialogModal
        open={adminWarningDialog.open}
        onClose={() => setAdminWarningDialog({ open: false })}
        onConfirm={handleAdminWarningConfirm}
        color={DIALOG_COLOR.lightred}
        icon={AlertTriangle}
        iconColor={DIALOG_COLOR.red}
        title="Replace Current Admin?"
        description={
          <>
            Creating a new Admin account will <strong>deactivate the current active Admin</strong>. 
            You will be logged out immediately after this action. Are you sure you want to proceed?
          </>
        }
        cancelLabel="Cancel"
        confirmLabel="Yes, Proceed"
      />

      {/* Admin Created — Logout Confirmation */}
        <DialogModal
          open={adminCreatedDialog.open}
          onClose={() => {}}
          onConfirm={handleAdminCreatedConfirm}
          color={DIALOG_COLOR.lightblue}
          icon={CheckCircle}
          iconColor={DIALOG_COLOR.blue}
          title="New Admin Created"
          description={
            <>
              The new Admin account has been created successfully. Click <strong>OK</strong> to log out and return to the login page.
            </>
          }
          confirmLabel="OK"
        />

        {/* success dialog */}
        <DialogModal
          open={successDialog.open}
          onConfirm={handleSuccessConfirm}
          color={DIALOG_COLOR.lightgreen}
          icon={BadgeCheck}
          iconColor={DIALOG_COLOR.green}
          title={isEdit ? "Changes Saved!" : "User Created!"}
          description={
            isEdit ? (
              <>
                <strong>{fname} {lname}</strong>'s account has been updated successfully.
              </>
            ) : (
              "The new user account has been created successfully."
            )
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

export default function Form() {
  return (
    <Suspense fallback={null}>
      <FormInner />
    </Suspense>
  )
}