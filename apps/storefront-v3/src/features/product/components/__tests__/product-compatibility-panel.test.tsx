import { render, screen } from "@testing-library/react"

import { ProductCompatibilityPanel } from "../product-compatibility-panel"

describe("ProductCompatibilityPanel", () => {
  it("renders verified metadata as practical compatibility guidance", () => {
    render(
      <ProductCompatibilityPanel
        metadata={{
          ai_core: {
            best_for: ["Functional printer upgrades"],
            compatibility_notes: ["Confirm the heater voltage before ordering"],
          },
          three_d_printing: {
            compatible_printers: ["Voron 2.4", "Voron Trident"],
            requires_hardened_nozzle: true,
          },
          rc_model_building: {
            compatible_project_types: ["1:10 crawler"],
            voltage: "24V",
            connector_type: "JST-XH",
          },
        }}
      />
    )

    expect(
      screen.getByRole("heading", { name: "Compatibility & use" })
    ).toBeInTheDocument()
    expect(screen.getByText("Voron 2.4, Voron Trident")).toBeInTheDocument()
    expect(screen.getByText("24V · JST-XH")).toBeInTheDocument()
    expect(screen.getByText("Hardened nozzle required")).toBeInTheDocument()
    expect(
      screen.getByText("Confirm the heater voltage before ordering")
    ).toBeInTheDocument()
  })

  it("stays hidden when the product has no usable compatibility metadata", () => {
    const { container } = render(
      <ProductCompatibilityPanel metadata={{ three_d_printing: "unknown" }} />
    )

    expect(container).toBeEmptyDOMElement()
  })
})
