import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { SearchCommandDialog } from "../search-command-dialog"

const push = jest.fn()
const searchAll = jest.fn()

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}))

jest.mock("next-themes", () => ({
  useTheme: () => ({ theme: "light", setTheme: jest.fn() }),
}))

jest.mock("lucide-react", () => ({
  ShoppingCart: () => <span />,
  User: () => <span />,
  Sun: () => <span />,
  Moon: () => <span />,
  Package: () => <span />,
  Store: () => <span />,
  Folder: () => <span />,
  Search: () => <span />,
  Loader2: () => <span />,
  ArrowRight: () => <span />,
}))

jest.mock("@/features/search/actions/unified-search", () => ({
  searchAll: (...args: unknown[]) => searchAll(...args),
}))

describe("SearchCommandDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders a bundle chip and routes bundle hits to the bundle page", async () => {
    searchAll.mockResolvedValue({
      products: [
        {
          id: "prod_bundle",
          handle: "starter-bundle",
          title: "Starter Bundle",
          price: 75,
          isBundle: true,
        },
      ],
      categories: [],
      brands: [],
    })

    render(<SearchCommandDialog open onOpenChange={jest.fn()} />)

    fireEvent.change(screen.getByPlaceholderText(/search products, categories, brands/i), {
      target: { value: "starter" },
    })

    await waitFor(() => {
      expect(searchAll).toHaveBeenCalledWith("starter")
    })

    expect((await screen.findAllByText("Bundle")).length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole("button", { name: /starter bundle/i }))

    expect(push).toHaveBeenCalledWith("/bundles/starter-bundle")
  })
})
