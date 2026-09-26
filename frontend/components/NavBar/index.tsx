"use client"

// react
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

// lib
import { api } from "@/lib/api"
import { getUserRole, clearAuth, getUser } from "@/lib/auth"
import { useDrawer } from "@/lib/drawer-context"
import { DIALOG_COLOR } from "@/lib/constant"

// component
import { DialogModal } from "../DialogModal"
import { SpinnerIcon } from "../SpinnerIcon"

// icons
import {
  LayoutDashboard, Users, ChartNoAxesCombined,
  Siren, Activity, History, Stamp,
  Map, Package, FileBarChart, CalendarDays,
  MapPin, Wrench, LogOut, RadioTower, ChevronDown,
  SlidersHorizontal, Target, GitBranchPlus,
  TriangleAlert, Settings, Book 
} from "lucide-react"

// logo
import Image from "next/image"
import AgosLogo from '../../public/agos-logo.png'
import RosLogo from '../../public/ROS-logo.jpg'


const getAvatarColor = (role: string) => {
  if (role === "MENRO") return "#2C7B3C"
  if (role === "MENRO_Staff") return "#37b851"
  return "#122A48"
}

const getRoleLabel = (role: string) => {
  if (role === "MENRO") return "MENRO Officer"
  if (role === "MENRO_Staff") return "MENRO Staff"
  if (role === "Admin") return "Administrator"
  return role
}

type User = {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  user_role: string;
  status: string;
}


type NavItem = {
  label: string
  href?: string
  icon: React.ReactNode
  children?: { label: string; href: string; icon: React.ReactNode }[]
}

const navItems: Record<string, NavItem[]> = {
  Admin: [
    { label: "Dashboard",  href: "/admin/dashboard",  icon: <LayoutDashboard size={18} /> },
    { label: "Monitoring", href: "/admin/monitoring",  icon: <ChartNoAxesCombined size={18} /> },
    { label: "Alerts",     href: "/admin/alerts",      icon: <Siren size={18} /> },
    { label: "Canal Hotspots",       href: "/admin/hotspots",        icon: <Target size={18} /> },
    { label: "Node Management",       href: "/admin/node",        icon: <RadioTower size={18} /> },
    { label: "Node Assignment",       href: "/admin/assign",        icon: <GitBranchPlus size={18} /> },
    {
      label: "History",
      icon: <History size={18} />,
      children: [
        { label: "Clog Events",              href: "/admin/history/clog-events",      icon: <TriangleAlert size={14} /> },
        { label: "Waste Classification",     href: "/admin/history/waste",            icon: <Package size={14} /> },
        { label: "Barangay Reports", href: "/admin/history/barangay-reports", icon: <FileBarChart size={14} /> },
      ]
    },
    {
      label: "Utilities",
      icon: <SlidersHorizontal size={18} />,
      children: [
        { label: "User Management",     href: "/admin/users",   icon: <Users size={14} /> },
        { label: "Barangay Management", href: "/admin/barangay",icon: <MapPin size={14} /> },
        { label: "IoT Health",          href: "/admin/health",  icon: <Activity size={14} /> },
        { label: "Maintenance Logs",    href: "/admin/maintenance-logs",  icon: <Wrench size={14} /> },
        { label: "Audit Logs",          href: "/admin/audit",   icon: <Stamp size={14} /> },
        { label: "Settings",    href: "/admin/settings",  icon: <Settings size={14} /> },
        { label: "User Manual",    href: "/admin/manual",  icon: <Book size={14} /> },
      ]
    },
  ],
  MENRO: [
    { label: "Reginal Map",  href: "/menro/map",              icon: <Map size={18} /> },
    { label: "Alerts",           href: "/menro/alerts",           icon: <Siren size={18} /> },
    { label: "Waste Analytics",  href: "/menro/analytics",        icon: <ChartNoAxesCombined size={18} /> },
    { label: "Resource Optimization",        href: "/menro/resources",        icon: <Package size={18} /> },
    { label: "Canal Hotspots",        href: "/menro/hotspots",        icon: <Target size={18} /> },
    { label: "Barangay Reports", href: "/menro/barangay-reports", icon: <FileBarChart size={18} /> },
    { label: "User Manual",    href: "/menro/manual",  icon: <Book size={14} /> },
  ],
  MENRO_Staff: [
    { label: "Reginal Map",       href: "/menro/map",        icon: <Map size={18} /> },
    { label: "Alerts",            href: "/menro/alerts",     icon: <Siren size={18} /> },
    { label: "Waste Analytics",   href: "/menro/analytics",  icon: <ChartNoAxesCombined size={18} /> },
    { label: "Resource Optimization", href: "/menro/resources", icon: <Package size={18} /> },
    { label: "Canal Hotspots",    href: "/menro/hotspots",   icon: <Target size={18} /> },
    { label: "Barangay Reports", href: "/menro/barangay-reports", icon: <FileBarChart size={18} /> },
    { label: "User Manual",    href: "/menro/manual",  icon: <Book size={14} /> },
  ],
}


export default function NavBar() {
  // us
  const [userRole, setUserRole] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [logoutDialog, setLogoutDialog] = useState<boolean>(false)
  const [loggingOut, setLoggingOut] = useState(false)
  
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({})

  const pathname = usePathname()
  const router = useRouter()
  const { drawerOpen, setDrawerOpen } = useDrawer()

  const fullName = currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : ""
  const nameFontSize = fullName.length > 12
    ? Math.max(8, 12 - (fullName.length - 9))
    : 12

  const toggleDropdown = (label: string) => {
    setOpenDropdowns(prev => ({ ...prev, [label]: !prev[label] }))
  }

  const items = userRole ? navItems[userRole as keyof typeof navItems] ?? [] : []

  useEffect(() => {
    const role = getUserRole()
    if (role) {
      setUserRole(role)
    }
  }, [])
  
  useEffect(() => {
    items.forEach(item => {
      if (item.children) {
        const isChildActive = item.children.some(child => pathname === child.href)
        if (isChildActive) {
          setOpenDropdowns(prev => ({ ...prev, [item.label]: true }))
        }
      }
    })
  }, [pathname])

  useEffect(() => {
    const role = getUserRole()
    if (role) {
      setUserRole(role)
    }
    setCurrentUser(getUser())
  }, [])

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await api.post('/api/auth/logout/', {})
    } catch (err) {
      console.log(err)
    } finally {
      clearAuth()
      window.location.href = "/login"
    }
  }

  const bothExpanded = openDropdowns['History'] && openDropdowns['Utilities']

  return (  
    <>
      <aside
        className='relative hidden md:flex flex-col h-screen bg-[#FAFCFD] z-50 border-1 border-[#C6C6C8] w-54'
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-5 pb-3 overflow-hidden h-18">
          <Image
            src={AgosLogo}
            alt="AGOS Logo"
            width={35}
            height={35}
            className="rounded-full flex-shrink-0 bg-[#CDE3DE]"
          />
          <div className="whitespace-nowrap overflow-hidden">
            <p className="text-[#122A48] font-bold text-[13px] leading-tight">AGOS</p>
            <p className="text-[#122A48] text-[9px] leading-tight mt-1">
              Autmated Geospatial Canal <br /> Obstruction Sensing System
            </p>
          </div>
          
        </div>

        {/* Desktop Navigation */}
        <nav className="flex flex-col mt-7 overflow-y-auto flex-1 min-h-0">
          {items.map(({ href, label, icon, children }) => {
            const isActive = pathname === href
            const isChildActive = children?.some(c => pathname === c.href)
            const isOpen = openDropdowns[label] ?? false

            // Has children
            if (children) {
              return (
                <div key={label}>
                  {/* Dropdown trigger */}
                  <button
                    onClick={() => toggleDropdown(label)}
                    className={`
                      flex items-center gap-3 px-[13px] py-2.5 mx-3.5 my-0.5 text-[12px] font-medium
                      w-[calc(100%-28px)] rounded-lg
                      ${isChildActive
                        ? 'bg-[#58D07159] text-[#122A48]'
                        : 'text-[#122A48] hover:bg-[#eaedf2]'
                      }
                    `}
                  >
                    <span className="flex-shrink-0 w-5 flex items-center justify-center">{icon}</span>
                    <span className="flex-1 text-left">{label}</span>
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* Dropdown children */}
                  {isOpen && (
                    <div className="flex flex-col ml-6 mr-3.5 mb-1">
                      {children.map(child => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`
                            flex items-center gap-2.5 px-3 py-2 my-0.5 text-[11px] font-medium
                            transition-all duration-200 rounded-lg
                            ${pathname === child.href
                              ? 'bg-[#58D07159] text-[#122A48]'
                              : 'text-[#727272] hover:bg-[#eaedf2] hover:text-[#122A48]'
                            }
                          `}
                        >
                          <span className="flex-shrink-0">{child.icon}</span>
                          <span>{child.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            }

            // No children
            return (
              <Link
                key={label}
                href={href!}
                className={`
                  flex items-center gap-3 px-[13px] mx-3.5 my-0.5 text-[12px] font-medium
                  transition-all duration-200 rounded-lg overflow-hidden whitespace-nowrap
                  ${bothExpanded ? 'py-5' : 'py-2.5'}
                  ${isActive
                    ? 'bg-[#58D07159] text-[#122A48]'
                    : 'text-[#122A48] hover:bg-[#eaedf2]'
                  }
                `}
              >
                <span className="flex-shrink-0 w-5 flex items-center justify-center">{icon}</span>
                <span className=" whitespace-pre-line">{label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="border-t p-2 flex gap-3">
          <div className="flex justify-center items-center">
            <div
              className="rounded-full w-10 h-10 flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
            >
              <Image
                src={RosLogo}
                alt="ROSARIO Logo"
                width={35}
                height={35}
                className="rounded-full flex-shrink-0 bg-[#CDE3DE]"
              />
            </div>
          </div>
          <div className="flex flex-col justify-center">
            <p className="font-semibold truncate max-w-[110px]" style={{ fontSize: `${nameFontSize}px` }}>
              {fullName}
            </p>
            <p className="text-[10px]">{currentUser ? getRoleLabel(currentUser.user_role) : ""}</p>
          </div>
          <button
            suppressHydrationWarning
            onClick={() => setLogoutDialog(true)}
            className='
              flex items-center cursor-pointer py-3 text-[#122A48] hover:bg-[#eaedf2]
              rounded transition-all duration-200 overflow-hidden whitespace-nowrap px-[13px] gap-3'
          >
            <span className="flex-shrink-0 flex items-center justify-center">
              <LogOut size={20} />
            </span>
            
          </button>
        </div>

      </aside>
      
      
      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`
          fixed top-0 left-0 h-full w-64 bg-[#FAFCFD] z-50 flex flex-col
          border-r border-[#C6C6C8] shadow-xl transition-transform duration-300 ease-in-out md:hidden
          ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-5 pb-3 h-18">
          <Image src={AgosLogo} alt="AGOS Logo" width={40} height={40}
            className="rounded-full flex-shrink-0 bg-[#CDE3DE]" />
          <div>
            <p className="text-[#122A48] font-bold text-[13px] leading-tight">AGOS</p>
            <p className="text-[#122A48] text-[9px] leading-tight mt-1">
              Automated Geo-Based <br /> Obstruction Sensing System
            </p>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex flex-col mt-6 flex-1">
          {items.map(({ href, label, icon, children }) => {
            const isActive = pathname === href
            const isChildActive = children?.some(c => pathname === c.href)
            const isOpen = openDropdowns[label] ?? false

            // Has children
            if (children) {
              return (
                <div key={label}>
                  <button
                    onClick={() => toggleDropdown(label)}
                    className={`
                      flex items-center gap-3 px-4 py-3 mx-3 my-0.5 text-[13px] font-medium
                      w-[calc(100%-24px)] rounded-lg transition-colors
                      ${isChildActive ? 'bg-[#58D07159] text-[#122A48]' : 'text-[#122A48] hover:bg-[#eaedf2]'}
                    `}
                  >
                    <span className="w-5 flex items-center justify-center">{icon}</span>
                    <span className="flex-1 text-left">{label}</span>
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {isOpen && (
                    <div className="flex flex-col ml-6 mr-3 mb-1">
                      {children.map(child => (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setDrawerOpen(false)}
                          className={`
                            flex items-center gap-2.5 px-3 py-2 my-0.5 text-[11px] font-medium
                            rounded-lg transition-colors
                            ${pathname === child.href
                              ? 'bg-[#58D07159] text-[#122A48]'
                              : 'text-[#727272] hover:bg-[#eaedf2] hover:text-[#122A48]'
                            }
                          `}
                        >
                          <span className="flex-shrink-0">{child.icon}</span>
                          <span>{child.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            }

            // No children
            return (
              <Link
                key={label}
                href={href!}
                onClick={() => setDrawerOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 mx-3 my-0.5 text-[13px] font-medium
                  rounded-lg transition-colors
                  ${isActive ? 'bg-[#58D07159] text-[#122A48]' : 'text-[#122A48] hover:bg-[#eaedf2]'}
                `}
              >
                <span className="w-5 flex items-center justify-center">{icon}</span>
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>



        {/* Logout */}
        <div className="border-t p-2 flex">
          <button
            onClick={() => { setDrawerOpen(false); setLogoutDialog(true) }}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-[#122A48] hover:bg-[#eaedf2] text-[13px] font-medium transition-colors"
          >
            <span className="w-5 flex items-center justify-center"><LogOut size={20} /></span>
            <span>Logout</span>
          </button>
        </div>
      </div>
      
      {/* Dialog */}
    <DialogModal
      open={logoutDialog}
      onClose={() => setLogoutDialog(false)}
      onConfirm={handleLogout}
      color={DIALOG_COLOR.lightgray}
      icon={LogOut}
      iconColor={DIALOG_COLOR.gray}
      title="Logout"
      description="Are you sure you want to log out of your account?"
      cancelLabel="Cancel"
      confirmLabel={
        loggingOut ? (
          <span className="flex items-center gap-2">
            <SpinnerIcon size={14} />
            Logging out...
          </span>
        ) : (
          "Logout"
        )
      }
    />
    </>
  )
}