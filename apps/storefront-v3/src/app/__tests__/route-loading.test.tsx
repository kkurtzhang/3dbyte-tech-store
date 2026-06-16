import { existsSync } from "node:fs"
import path from "node:path"
import { render, screen } from "@testing-library/react"

const loadingRoutes = [
  {
    label: "product",
    path: path.resolve(__dirname, "../products/[handle]/loading.tsx"),
    accessibleName: /loading product/i,
  },
  {
    label: "cart",
    path: path.resolve(__dirname, "../cart/loading.tsx"),
    accessibleName: /loading cart/i,
  },
  {
    label: "checkout",
    path: path.resolve(__dirname, "../(checkout)/checkout/loading.tsx"),
    accessibleName: /loading checkout/i,
  },
]

describe("route loading states", () => {
  it.each(loadingRoutes)(
    "provides a meaningful $label loading surface",
    ({ path: loadingPath, accessibleName }) => {
      const exists = existsSync(loadingPath)

      expect(exists).toBe(true)
      if (!exists) {
        return
      }

      const Loading = require(loadingPath).default
      render(<Loading />)

      expect(
        screen.getByRole("status", { name: accessibleName }),
      ).toBeInTheDocument()
    },
  )
})
