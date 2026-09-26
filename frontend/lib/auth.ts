"use client"

export const ACCOUNT_INACTIVE_MESSAGE = 'Your account is not active. Please contact your administrator.'

let suppressInactiveRedirect = false
export const setSuppressInactiveRedirect = (value: boolean) => {
  suppressInactiveRedirect = value
}
export const shouldSuppressInactiveRedirect = () => suppressInactiveRedirect

export const getUser = () => {
  if (typeof window === "undefined") return null
  const user = localStorage.getItem("user")
  return user ? JSON.parse(user) : null
}

export const setUser = (user: object) => {
  localStorage.setItem("user", JSON.stringify(user))
}

export const clearAuth = () => {
  localStorage.removeItem("user")
  document.cookie = "user=; path=/; max-age=0; samesite=Lax"
}

export const logout = async () => {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout/`, {
      method: 'POST',
      credentials: 'include',
    })
  } catch {
    // network error
  }
  clearAuth()
}

export const isAuthenticated = (): boolean => {
  if (typeof window === "undefined") return false
  return !!localStorage.getItem("user")
}

export const getUserRole = (): string | null => {
  const user = getUser()
  return user ? user.user_role : null
}

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (res.status === 401) {
    try {
      const refreshRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })

      if (!refreshRes.ok) throw new Error('Session expired.')

      // refreshRes already set a fresh access_token cookie — just retry
      return fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })
    } catch (err) {
      await logout()
      window.location.href = '/login'
      throw err
    }
  }

  if (res.status === 403) {
    const clone = res.clone()
    try {
      const body = await clone.json()
      if (body?.detail === ACCOUNT_INACTIVE_MESSAGE && !shouldSuppressInactiveRedirect()) {
        await logout()
        window.location.href = '/login?reason=inactive'
      }
    } catch {
      
    }
  }

  return res
}

export const syncUser = (user: object) => {
  setUser(user)
  document.cookie = `user=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=${7*24*60*60}; samesite=Lax`
}

const ROLE_ROUTES: Record<string, string> = {
  Admin: '/admin/dashboard',
  MENRO: '/menro/map',
  MENRO_Staff: '/menro/map',
}

export const nextStepFor = (user: any): string | null => {
  if (!user.privacy_agreed_at) return '/privacy-consent'
  if (user.must_change_password) return '/change-password'
  return ROLE_ROUTES[user.user_role] ?? null
}