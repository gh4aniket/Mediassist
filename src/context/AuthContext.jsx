import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { authApi, clearToken, getToken, setToken } from '../services'
import { setUnauthorizedHandler } from '../services/apiClient'

const AuthContext = createContext(null)

const USER_KEY = 'mediassist_user'

/** Cached user, so the first paint after a reload is not a login flash. */
function readCachedUser() {
  try {
    const stored =
      localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

function writeCachedUser(user, remember) {
  try {
    localStorage.removeItem(USER_KEY)
    sessionStorage.removeItem(USER_KEY)
    if (!user) return
    const store = remember ? localStorage : sessionStorage
    store.setItem(USER_KEY, JSON.stringify(user))
  } catch {
    /* ignore storage failures — the session just will not survive a reload */
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readCachedUser)
  /** True until the cached session has been revalidated against the server. */
  const [initialising, setInitialising] = useState(Boolean(getToken()))
  const rememberRef = useRef(Boolean(localStorage.getItem(USER_KEY)))

  const logout = useCallback(() => {
    clearToken()
    writeCachedUser(null)
    setUser(null)
  }, [])

  // A 401 from anywhere in the app means the token is gone or stale.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      writeCachedUser(null)
      setUser(null)
    })
    return () => setUnauthorizedHandler(null)
  }, [])

  // Confirm the cached user still matches the server before trusting it.
  useEffect(() => {
    if (!getToken()) {
      setInitialising(false)
      return
    }
    let cancelled = false
    authApi
      .me()
      .then((fresh) => {
        if (cancelled) return
        setUser(fresh)
        writeCachedUser(fresh, rememberRef.current)
      })
      .catch(() => {
        if (!cancelled) logout()
      })
      .finally(() => {
        if (!cancelled) setInitialising(false)
      })
    return () => {
      cancelled = true
    }
  }, [logout])

  const login = useCallback(async (email, password, remember = false) => {
    const { user: nextUser, token } = await authApi.login(email, password)
    rememberRef.current = remember
    setToken(token, { remember })
    writeCachedUser(nextUser, remember)
    setUser(nextUser)
    return nextUser
  }, [])

  const signup = useCallback(async (payload) => {
    // Registration returns a session too, but the signup screen sends people to
    // the login page — so drop the token rather than silently authenticating.
    const { user: created } = await authApi.register(payload)
    return created
  }, [])

  /**
   * Persists a profile change to the server and mirrors it locally. Pass
   * `{ local: true }` to update the cached copy only (used after endpoints that
   * already returned a fresh user).
   */
  const updateUser = useCallback(
    async (updates, { local = false } = {}) => {
      const next = local
        ? { ...user, ...updates }
        : await authApi.updateMe(updates)
      setUser(next)
      writeCachedUser(next, rememberRef.current)
      return next
    },
    [user],
  )

  return (
    <AuthContext.Provider
      value={{ user, initialising, login, signup, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
