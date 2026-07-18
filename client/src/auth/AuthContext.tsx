import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, getToken, setToken } from '../api/client'
import type { LoginRequest, RegisterRequest, User } from '../api/types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (data: LoginRequest) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setTokenState] = useState<string | null>(getToken())

  const value = useMemo<AuthState>(
    () => ({
      user,
      isAuthenticated: Boolean(token),
      login: async (data) => {
        const res = await api.login(data)
        setToken(res.token)
        setTokenState(res.token)
        setUser(res.user)
      },
      register: async (data) => {
        const res = await api.register(data)
        setToken(res.token)
        setTokenState(res.token)
        setUser(res.user)
      },
      logout: () => {
        setToken(null)
        setTokenState(null)
        setUser(null)
      },
    }),
    [user, token]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
