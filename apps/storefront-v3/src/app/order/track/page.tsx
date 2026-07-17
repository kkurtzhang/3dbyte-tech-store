import { permanentRedirect } from "next/navigation"

type LegacyTrackOrderPageProps = {
  searchParams: Promise<{ reference?: string | string[] }>
}

export default async function TrackOrderPage({
  searchParams,
}: LegacyTrackOrderPageProps) {
  const { reference } = await searchParams
  const value = (Array.isArray(reference) ? reference[0] : reference)?.trim()

  permanentRedirect(
    value ? `/track-order?reference=${encodeURIComponent(value)}` : "/track-order"
  )
}
