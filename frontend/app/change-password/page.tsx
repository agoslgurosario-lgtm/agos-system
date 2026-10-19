"use client"

// react
import { useState } from "react"

// shadcn
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

// logo
import Image from "next/image"
import AgosLogo from '../../public/agos-logo.png'

// icons
import { Eye, EyeOff, KeyRound, BadgeCheck, X } from "lucide-react"

// component
import { DialogModal } from "@/components/DialogModal"
import { SpinnerIcon } from "@/components/SpinnerIcon"

// lib
import { api } from "@/lib/api"
import { clearAuth } from "@/lib/auth"
import { getErrorMessage } from "@/lib/utils"
import { DIALOG_COLOR } from "@/lib/constant"

type DialogState = { open: boolean }

export default function ChangePassword() {
  // password fields
  const [oldPassword, setOldPassword] = useState<string>('')
  const [newPassword, setNewPassword] = useState<string>('')
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>('')

  // visibility toggles
  const [showOldPassword, setShowOldPassword] = useState<boolean>(false)
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false)

  // state
  const [isLoadingChangePassword, setIsLoadingChangePassword] = useState<boolean>(false)
  const [fieldError, setFieldError] = useState<string>('')
  const [changePasswordError, setChangePasswordError] = useState<string>('')
  const [validationError, setValidationError] = useState<boolean>(false)

  // dialog states
  const [loadingDialog, setLoadingDialog] = useState<DialogState>({ open: false })
  const [successDialog, setSuccessDialog] = useState<DialogState>({ open: false })
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; message: string }>({ open: false, message: '' })

  const passwordRequirements = [
    { label: "Must be at least 8 characters", valid: newPassword.length >= 8 },
    { label: "Must contain one special character", valid: /[^a-zA-Z0-9]/.test(newPassword) },
    { label: "Passwords must match", valid: newPassword === confirmNewPassword && confirmNewPassword !== "" },
    { label: "Must be different from your current password", valid: newPassword !== "" && newPassword !== oldPassword },
  ]

  const handlePasswordChange = async () => {
    setFieldError("")
    setChangePasswordError("")
    setValidationError(false)

    if (!oldPassword.trim()) {
      setFieldError("Please enter your current password.")
      return
    }

    const allValid = passwordRequirements.every(r => r.valid)
    if (!allValid) {
      setValidationError(true)
      return
    }

    setIsLoadingChangePassword(true)
    setLoadingDialog({ open: true })
    try {
      await api.post("/api/auth/change-password/", {
        old_password: oldPassword,
        new_password: newPassword,
      })

      await api.post("/api/auth/logout/", {})
      clearAuth()

      setLoadingDialog({ open: false })
      setSuccessDialog({ open: true })
    } catch (err: any) {
      setLoadingDialog({ open: false })
      if (err?.old_password) {
        setFieldError(err.old_password)
      } else {
        setErrorDialog({ open: true, message: getErrorMessage(err) })
      }
    } finally {
      setIsLoadingChangePassword(false)
    }
  }

  const handleSuccessConfirm = () => {
    setSuccessDialog({ open: false })
    window.location.href = "/login"
  }

  return (
    <>
      <div className="hidden md:flex flex-col">
        <div className="w-screen h-screen flex items-center justify-center">

          <Card className="w-full max-w-[80vw] sm:max-w-100 p-4 py-6 sm:p-10 sm:py-12 bg-[#FFFAFA] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.4)]">
            <CardHeader className="items-center justify-center">
              <div className="flex justify-center">
                <Image
                  src={AgosLogo}
                  alt="AGOS Logo"
                  width={90}
                  height={90}
                  className="rounded-full flex-shrink-0 bg-[#CDE3DE]"
                />
              </div>
              <CardTitle className='text-black text-xs sm:text-sm text-center'>AGOS</CardTitle>
              <CardTitle className='text-[#1565BC] font-bold text-sm sm:text-lg text-center'>Change Your Password</CardTitle>
              <p className='text-[#122A48] text-[11px] sm:text-xs text-center -mt-1'>
                For your security, you must set a new password before continuing.
              </p>
            </CardHeader>

            <CardContent className='text-center'>
              <FieldGroup>

                {/* old password */}
                <Field className='gap-0.5'>
                  <FieldLabel className='text-[#122A48] text-xs sm:text-sm' htmlFor='old_password'>Current Password</FieldLabel>
                  <div className="relative">
                    <Input
                      name="old_password"
                      id="old_password"
                      type={showOldPassword ? "text" : "password"}
                      value={oldPassword}
                      autoComplete="off"
                      onChange={e => { setOldPassword(e.target.value); setFieldError(""); setChangePasswordError("") }}
                      className={`border focus:ring-0 bg-[#CDE3DEB0] h-7.5 sm:h-8.5 pl-3 text-xs sm:text-base pr-10 ${fieldError || changePasswordError ? "border-red-500" : "border-none"}`}
                    />
                    <button type="button" onClick={() => setShowOldPassword(!showOldPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#122A48BA] cursor-pointer">
                      {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>

                {/* new password */}
                <Field className='gap-0.5 -mt-2'>
                  <FieldLabel className='text-[#122A48] text-xs sm:text-sm' htmlFor='new_password'>New Password</FieldLabel>
                  <div className="relative">
                    <Input
                      name="new_password"
                      id="new_password"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      autoComplete="off"
                      onChange={e => { setNewPassword(e.target.value); setValidationError(false) }}
                      className={`border focus:ring-0 bg-[#CDE3DEB0] h-7.5 sm:h-8.5 pl-3 text-xs sm:text-base pr-10 ${validationError ? "border-red-500" : "border-none"}`}
                    />
                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#122A48BA] cursor-pointer">
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>

                {/* confirm new password */}
                <Field className='gap-0.5 -mt-2'>
                  <FieldLabel className='text-[#122A48] text-xs sm:text-sm' htmlFor='confirm_new_password'>Confirm New Password</FieldLabel>
                  <div className="relative">
                    <Input
                      name="confirm_new_password"
                      id="confirm_new_password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmNewPassword}
                      autoComplete="off"
                      onChange={e => { setConfirmNewPassword(e.target.value); setValidationError(false) }}
                      className={`border focus:ring-0 bg-[#CDE3DEB0] h-7.5 sm:h-8.5 pl-3 text-xs sm:text-base pr-10 ${validationError ? "border-red-500" : "border-none"}`}
                    />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#122A48BA] cursor-pointer">
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>

                {/* password requirements */}
                <div className='flex flex-col gap-1 -mt-3 text-left'>
                  {passwordRequirements.map(({ label, valid }) => (
                    <div key={label} className={`flex items-center gap-2 text-[11px] sm:text-xs ${valid ? "text-green-500" : validationError ? "text-red-500" : "text-gray-400"}`}>
                      <div className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center flex-shrink-0 ${valid ? "bg-green-500" : validationError ? "bg-red-400" : "bg-gray-300"}`}>
                        <svg className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      {label}
                    </div>
                  ))}
                </div>

                {fieldError && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><span>⊙</span>{fieldError}</p>}
                {changePasswordError && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><span>⊙</span>{changePasswordError}</p>}
              </FieldGroup>
            </CardContent>

            <CardFooter className='justify-center py-0 pb-2 flex-col bg-transparent border-none'>
              <Button
                className='w-full bg-[#122A48] shadow-[0_8px_6px_-4px_rgba(0,0,0,0.3)] py-4 sm:py-4.5 mb-6 cursor-pointer font-semibold text-[13px] sm:text-[16px]'
                onClick={handlePasswordChange}
                disabled={isLoadingChangePassword}
              >
                {isLoadingChangePassword ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Changing password...
                  </div>
                ) : "Change Password"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* loading dialog */}
      <DialogModal
        open={loadingDialog.open}
        color={DIALOG_COLOR.lightblue}
        icon={SpinnerIcon}
        iconColor={DIALOG_COLOR.blue}
        title="Updating Password"
        description="Please wait while we securely update your password."
      />

      {/* success dialog */}
      <DialogModal
        open={successDialog.open}
        onConfirm={handleSuccessConfirm}
        color={DIALOG_COLOR.lightgreen}
        icon={BadgeCheck}
        iconColor={DIALOG_COLOR.green}
        title="Password Changed!"
        description="Your password has been updated successfully. Please log in again with your new password."
        confirmLabel="Go to Login"
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