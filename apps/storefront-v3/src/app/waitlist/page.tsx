import { Metadata } from "next"
import { WaitlistClient } from "./waitlist-client"

export const metadata: Metadata = {
  title: "My Waitlist | 3D Byte Store",
  description: "Manage your product notifications and back-in-stock alerts",
}

export default function WaitlistPage() {
  return <WaitlistClient />
}
