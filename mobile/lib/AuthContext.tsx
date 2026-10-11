import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { api, setTokens, clearAuth, getAccessToken, getRefreshToken, publicApi } from './api'
import { User } from '../types/user'
import { setForceLogoutListener } from './authEvents'
import { unregisterFromPush } from './pushNotifications'


type AuthContextType = {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<User>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  updateUser: (user: User) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = async () => {
    const data = await api.get('/api/auth/me/')
    setUser(data)
  }

  useEffect(() => {
    const bootstrap = async () => {
      const token = await getAccessToken()
      if (!token) {
        setIsLoading(false)
        return
      }
      try {
        await refreshUser()
      } catch {
        await clearAuth()
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }
    bootstrap()
  }, [])

  useEffect(() => {
    setForceLogoutListener(() => {
      clearAuth()
      setUser(null)
    })
    return () => setForceLogoutListener(null)
  }, [])

  const login = async (email: string, password: string) => {
    const data = await publicApi.post('/api/auth/mobile-login/', { email, password })
    await setTokens(data.access, data.refresh)
    setUser(data.user)
    return data.user as User
  }

  const logout = async () => {
    await unregisterFromPush()   // so the next person on this phone doesn't get your alerts
    try {
      const refresh = await getRefreshToken()
      await api.post('/api/auth/mobile-logout/', { refresh })
    } catch {
      // logout should succeed locally even if the network call fails
    } finally {
      await clearAuth()
      setUser(null)
    }
  }

  const updateUser = (updated: User) => {
    setUser(updated)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside an AuthProvider')
  return ctx
}