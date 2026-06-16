"use client"

import { useEffect, useState } from "react"
import { WifiOff } from "lucide-react"

export function OfflineStatusBanner() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    const syncOnlineStatus = () => {
      setIsOffline(!window.navigator.onLine)
    }

    syncOnlineStatus()
    window.addEventListener("online", syncOnlineStatus)
    window.addEventListener("offline", syncOnlineStatus)

    return () => {
      window.removeEventListener("online", syncOnlineStatus)
      window.removeEventListener("offline", syncOnlineStatus)
    }
  }, [])

  if (!isOffline) {
    return null
  }

  return (
    <div
      role="status"
      aria-label="Offline mode"
      className="border-b border-amber-300/70 bg-amber-50 px-4 py-2 text-amber-950 dark:border-amber-700/70 dark:bg-amber-950/50 dark:text-amber-100"
    >
      <div className="container flex items-start gap-2 text-sm">
        <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          <span className="font-medium">You're offline.</span>{" "}
          Cart and checkout updates may not complete until your connection is
          back.
        </p>
      </div>
    </div>
  )
}
