import { AnnouncementBar } from "./announcement-bar"
import { getHomepageAnnouncements } from "@/lib/strapi/content"

export async function AnnouncementBarSlot() {
  const items = await getHomepageAnnouncements().catch(() => [])

  if (items.length === 0) {
    return null
  }

  return <AnnouncementBar items={items} />
}
