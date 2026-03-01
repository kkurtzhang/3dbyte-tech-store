import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Track Your Order",
  description: "Check the status of your order using your order ID and email address.",
}

export default function TrackOrderLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
