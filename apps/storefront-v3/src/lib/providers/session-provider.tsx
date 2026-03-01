"use client"

import * as React from "react"
import { getSessionAction, AuthUser } from "@/app/actions/auth"

interface SessionContextType {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  refreshSession: () => Promise<void>
}

const SessionContext = React.createContext<SessionContextType | undefined>(undefined)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  const refreshSession = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await getSessionAction()
      if (result.success && result.user) {
        setUser(result.user)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error("Session refresh error:", error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    refreshSession()
  }, [refreshSession])

  return (
    <SessionContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        refreshSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const context = React.useContext(SessionContext)
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider")
  }
  return context
}
