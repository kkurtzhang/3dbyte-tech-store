import {
  BadgePercent,
  Bell,
  BookOpen,
  Clock,
  Download,
  Gift,
  Layers,
  Mail,
  MessageCircle,
  Package,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
  User,
  Wrench,
} from "lucide-react"

import type { LucideIcon } from "lucide-react"

const iconMap = {
  "badge-percent": BadgePercent,
  bell: Bell,
  "book-open": BookOpen,
  clock: Clock,
  download: Download,
  gift: Gift,
  layers: Layers,
  mail: Mail,
  "message-circle": MessageCircle,
  package: Package,
  "refresh-cw": RefreshCw,
  search: Search,
  settings: Settings,
  "shield-check": ShieldCheck,
  "shopping-bag": ShoppingBag,
  sparkles: Sparkles,
  truck: Truck,
  user: User,
  wrench: Wrench,
} satisfies Record<string, LucideIcon>

function normalizeIconName(icon?: string | null) {
  return icon?.trim().toLowerCase().replace(/[\s_]+/g, "-") ?? ""
}

export function getCmsIcon(icon: string | null | undefined, fallback: LucideIcon) {
  return iconMap[normalizeIconName(icon) as keyof typeof iconMap] ?? fallback
}
