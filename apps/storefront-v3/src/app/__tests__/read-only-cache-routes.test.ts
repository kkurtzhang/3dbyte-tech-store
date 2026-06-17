import { readFileSync } from "node:fs"
import { join } from "node:path"

const appDir = join(process.cwd(), "src/app")

const readOnlyRuntimeRoutes = [
  "contact/page.tsx",
  "shipping/page.tsx",
  "returns/page.tsx",
  "docs/page.tsx",
  "help/page.tsx",
  "track-order/page.tsx",
  "order/track/page.tsx",
  "privacy-policy/page.tsx",
  "terms-and-conditions/page.tsx",
  "(auth)/forgot-password/page.tsx",
  "(auth)/sign-up/page.tsx",
]

describe("read-only deployment route cache config", () => {
  it.each(readOnlyRuntimeRoutes)(
    "renders %s dynamically instead of using ISR/static prerender cache",
    (routeFile) => {
      const source = readFileSync(join(appDir, routeFile), "utf8")

      expect(source).toContain('export const dynamic = "force-dynamic"')
      expect(source).not.toMatch(/export const revalidate\s*=/)
    }
  )
})
