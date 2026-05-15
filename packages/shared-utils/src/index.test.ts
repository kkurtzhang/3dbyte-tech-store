import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";

import { getSafePaymentMethodDisplay, storage } from "./index";

describe("Shared Utils", () => {
  it("should pass", () => {
    expect(true).toBe(true);
  });

  it("formats verified tracking payment card details safely", () => {
    expect(
      getSafePaymentMethodDisplay({
        payment_status: "authorized",
        tracking_payment_method: {
          type: "card",
          brand: "visa",
          last4: "4242",
        },
      }),
    ).toBe("Visa ending in 4242");
  });

  it("extracts Stripe card details without exposing raw identifiers", () => {
    const display = getSafePaymentMethodDisplay({
      payment_status: "authorized",
      payment_collections: [
        {
          payments: [
            {
              provider_id: "stripe",
              data: {
                payment_intent: "pi_should_not_render",
                payment_method_details: {
                  card: {
                    brand: "mastercard",
                    last4: "4444",
                  },
                },
              },
            },
          ],
        },
      ],
    });

    expect(display).toBe("Mastercard ending in 4444");
    expect(display).not.toContain("pi_should_not_render");
  });

  it("falls back to card payment for Stripe payments without safe card details", () => {
    expect(
      getSafePaymentMethodDisplay({
        payment_status: "authorized",
        payment_collections: [
          {
            payments: [
              {
                provider_id: "pp_stripe_stripe",
                data: {
                  payment_method: "pm_should_not_render",
                },
              },
            ],
          },
        ],
      }),
    ).toBe("Card payment");
  });

  it("falls back to humanized payment status", () => {
    expect(
      getSafePaymentMethodDisplay({
        payment_status: "partially_refunded",
      }),
    ).toBe("Partially Refunded");
  });

  it("does not require DOM globals when imported by Node runtimes", () => {
    const workspace = mkdtempSync(join(tmpdir(), "shared-utils-node-"));
    const sourceImport = relative(workspace, join(__dirname, "index"))
      .split(sep)
      .join("/");
    const importPath = sourceImport.startsWith(".")
      ? sourceImport
      : `./${sourceImport}`;
    const tscBin = require.resolve("typescript/bin/tsc");

    try {
      writeFileSync(
        join(workspace, "index.ts"),
        [
          `import { storage } from "${importPath}";`,
          "",
          "const value = storage.get<{ ok: boolean }>('node-runtime');",
          "value?.ok;",
        ].join("\n")
      );
      writeFileSync(
        join(workspace, "tsconfig.json"),
        JSON.stringify(
          {
            compilerOptions: {
              target: "ES2021",
              module: "Node16",
              moduleResolution: "Node16",
              strict: true,
              lib: ["ES2021"],
              types: ["node"],
              typeRoots: [join(__dirname, "../../../node_modules/@types")],
              noEmit: true,
              skipLibCheck: true,
            },
            include: ["index.ts"],
          },
          null,
          2
        )
      );

      execFileSync(process.execPath, [tscBin, "-p", workspace], {
        stdio: "pipe",
      });
    } finally {
      rmSync(workspace, { force: true, recursive: true });
    }
  });

  it("returns null instead of reading browser storage on the server", () => {
    expect(storage.get("missing-window")).toBeNull();
  });
});
