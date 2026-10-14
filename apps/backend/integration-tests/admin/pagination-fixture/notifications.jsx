import React from "react"
import { BellAlert } from "@medusajs/icons"
import { IconButton } from "@medusajs/ui"

// Preserve Shell.Topbar geometry without requesting live notifications.
export const Notifications = () => <IconButton size="small" variant="transparent" aria-label="Fixture notifications"><BellAlert /></IconButton>
