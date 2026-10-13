import {
  mkdtempSync,
  mkdirSync,
  symlinkSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { medusaIntegrationTestRunner } from "@medusajs/test-utils";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import {
  createApiKeysWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
} from "@medusajs/medusa/core-flows";
import BundledProductModuleService from "../../src/modules/bundled-product/service";
import PreorderModuleService from "../../src/modules/preorder/service";
import { BUNDLED_PRODUCT_MODULE } from "../../src/modules/bundled-product";
import { PreorderVariantStatus } from "../../src/modules/preorder/models/preorder-variant";
import { PREORDER_MODULE } from "../../src/modules/preorder";

const enabled = process.env.MEDUSA215_CONTRACT_FIXTURE === "1";
const backend = path.resolve(__dirname, "../..");
if (enabled) {
  const storage = path.resolve(backend, "../../../..");
  if (
    process.env.DB_HOST !== "localhost" ||
    process.env.DB_PORT !== "65442" ||
    process.env.DB_USERNAME !== "postgres" ||
    process.env.DB_PASSWORD !== "contract-fixture-only" ||
    process.env.MEDUSA215_LOOPBACK_GUARD !== "1" ||
    !tmpdir().startsWith(path.join(storage, "tmp") + path.sep)
  )
    throw new Error(
      "Contract fixtures require their dedicated loopback database",
    );
  const fixture = mkdtempSync(path.join(tmpdir(), "medusa215-http-"));
  mkdirSync(path.join(fixture, "src/links"), { recursive: true });
  for (const name of ["api", "modules"])
    symlinkSync(
      path.join(backend, "src", name),
      path.join(fixture, "src", name),
    );
  symlinkSync(
    path.join(backend, "node_modules"),
    path.join(fixture, "node_modules"),
  );
  symlinkSync(
    path.join(backend, "package.json"),
    path.join(fixture, "package.json"),
  );
  for (const link of [
    "bundle-product.ts",
    "bundle-item-product.ts",
    "preorder-variant-product-variant.ts",
  ])
    symlinkSync(
      path.join(backend, "src/links", link),
      path.join(fixture, "src/links", link),
    );
  writeFileSync(
    path.join(fixture, "medusa-config.js"),
    `const { defineConfig } = require("@medusajs/framework/utils")
module.exports = defineConfig({
 projectConfig: { databaseUrl: process.env.DATABASE_URL, workerMode: "server",
  http: { storeCors: "http://127.0.0.1", adminCors: "http://127.0.0.1", authCors: "http://127.0.0.1",
    jwtSecret: "synthetic-contract-fixture", cookieSecret: "synthetic-contract-fixture" } },
 admin: { disable: true }, modules: [
  { resolve: ${JSON.stringify(path.join(backend, "src/modules/bundled-product"))} },
  { resolve: ${JSON.stringify(path.join(backend, "src/modules/preorder"))} },
 ]
})`,
  );
  medusaIntegrationTestRunner({
    cwd: fixture,
    dbName: `contract215_fixture_${process.pid}`,
    testSuite: ({ api, getContainer, dbConnection }) => {
      jest.setTimeout(180000);
      it("migrates disposable data and returns supported product/cart contracts", async () => {
        const container = getContainer();
        const { result: channels } = await createSalesChannelsWorkflow(
          container,
        ).run({
          input: {
            salesChannelsData: [{ name: "Synthetic contract channel" }],
          },
        });
        const { result: keys } = await createApiKeysWorkflow(container).run({
          input: {
            api_keys: [
              {
                title: "Synthetic contract key",
                type: "publishable",
                created_by: "fixture",
              },
            ],
          },
        });
        await linkSalesChannelsToApiKeyWorkflow(container).run({
          input: { id: keys[0].id, add: [channels[0].id] },
        });
        const headers = { "x-publishable-api-key": keys[0].token };
        const { result: regions } = await createRegionsWorkflow(container).run({
          input: {
            regions: [
              {
                name: "Synthetic USD",
                currency_code: "usd",
                countries: ["us"],
              },
            ],
          },
        });
        const { result: products } = await createProductsWorkflow(
          container,
        ).run({
          input: {
            products: [
              {
                title: "Synthetic contract product",
                handle: "synthetic-contract-product",
                status: "published",
                sales_channels: [{ id: channels[0].id }],
                options: [{ title: "Size", values: ["Default"] }],
                variants: [
                  {
                    title: "Default",
                    options: { Size: "Default" },
                    manage_inventory: false,
                    prices: [{ currency_code: "usd", amount: 120 }],
                  },
                ],
              },
            ],
          },
        });
        const productResponse = await api.get(
          `/store/products/${products[0].id}`,
          {
            headers,
            params: {
              region_id: regions[0].id,
              fields:
                "*variants.calculated_price,*variants.prices,*variants.inventory_quantity,*variants.manage_inventory",
            },
          },
        );
        expect(productResponse.status).toBe(200);
        expect(
          productResponse.data.product.variants[0].calculated_price
            .calculated_amount,
        ).toBe(120);
        const cartResponse = await api.post(
          "/store/carts",
          { region_id: regions[0].id, sales_channel_id: channels[0].id },
          { headers },
        );
        const cartId = cartResponse.data.cart.id;
        const added = await api.post(
          `/store/carts/${cartId}/line-items`,
          { variant_id: products[0].variants![0].id, quantity: 2 },
          { headers },
        );
        expect(added.status).toBe(200);
        const link = container.resolve(ContainerRegistrationKeys.LINK);
        const preorderService =
          container.resolve<PreorderModuleService>(PREORDER_MODULE);
        const preorder = await preorderService.createPreorderVariants({
          variant_id: products[0].variants![0].id,
          status: PreorderVariantStatus.ENABLED,
          available_date: new Date("2999-01-01T00:00:00.000Z"),
        });
        await preorderService.createPreorderVariantPrices({
          preorder_variant_id: preorder.id,
          currency_code: "usd",
          amount: 80,
        });
        await link.create({
          [PREORDER_MODULE]: { preorder_variant_id: preorder.id },
          [Modules.PRODUCT]: {
            product_variant_id: products[0].variants![0].id,
          },
        });
        const preorderCart = await api.post(
          "/store/carts",
          { region_id: regions[0].id, sales_channel_id: channels[0].id },
          { headers },
        );
        const preorderCartId = preorderCart.data.cart.id;
        const priced = await api.post(
          `/store/carts/${preorderCartId}/line-items-priced`,
          { variant_id: products[0].variants![0].id, quantity: 2 },
          { headers },
        );
        expect(priced.data.cart.items[0].unit_price).toBe(80);
        expect(priced.data.cart.items[0].metadata.preorder_status).toBe(
          "enabled",
        );
        const cart = await api.get(`/store/carts/${preorderCartId}`, {
          headers,
          params: {
            fields:
              "+items.*,+items.metadata,+items.product,+items.variant,+items.variant.calculated_price,+items.variant.prices,+items.variant.product,+items.variant.product.images,*items.variant.preorder_variant,*items.variant.preorder_variant.prices,+region,*promotions,*shipping_methods,+item_subtotal,+item_total,+item_tax_total,+discount_total,+total,+shipping_subtotal,+shipping_total,+shipping_tax_total,+tax_total,+shipping_address",
          },
        });
        if (process.env.MEDUSA215_RUNTIME_RESULT)
          writeFileSync(
            process.env.MEDUSA215_RUNTIME_RESULT.replace(
              "runtime-responses.json",
              "runtime-cart-diagnostic.json",
            ),
            JSON.stringify(
              { fixtureOnly: true, cart: cart.data.cart },
              null,
              2,
            ),
          );
        expect(cart.status).toBe(200);
        expect(cart.data.cart.items[0].unit_price).toBe(80);
        expect(cart.data.cart.items[0].metadata.preorder_status).toBe(
          "enabled",
        );
        expect(cart.data.cart.items[0].metadata.regular_unit_price).toBe(120);
        expect(cart.data.cart.items[0].variant.preorder_variant.status).toBe(
          "enabled",
        );
        expect(
          cart.data.cart.items[0].variant.preorder_variant.prices[0].amount,
        ).toBe(80);
        const retainedPreorder = await api.get("/store/products", {
          headers,
          params: {
            handle: products[0].handle,
            limit: 1,
            region_id: regions[0].id,
            fields:
              "*variants.calculated_price,*variants.prices,*variants.inventory_quantity,*variants.manage_inventory,*variants.preorder_variant,*variants.preorder_variant.prices,*variants.images,*options,*options.values,*images,*type,*collection,*tags,*bundle,*bundle.items,*bundle.items.product",
          },
        });
        expect(
          retainedPreorder.data.products[0].variants[0].preorder_variant.status,
        ).toBe("enabled");
        expect(
          retainedPreorder.data.products[0].variants[0].preorder_variant
            .prices[0].amount,
        ).toBe(80);
        const bundleService = container.resolve<BundledProductModuleService>(
          BUNDLED_PRODUCT_MODULE,
        );
        const { result: bundleProducts } = await createProductsWorkflow(
          container,
        ).run({
          input: {
            products: [
              {
                title: "Synthetic bundle product",
                handle: "synthetic-bundle-product",
                status: "published",
                sales_channels: [{ id: channels[0].id }],
                options: [{ title: "Size", values: ["Default"] }],
                variants: [
                  {
                    title: "Default",
                    options: { Size: "Default" },
                    manage_inventory: false,
                    prices: [{ currency_code: "usd", amount: 160 }],
                  },
                ],
              },
            ],
          },
        });
        const { result: components } = await createProductsWorkflow(
          container,
        ).run({
          input: {
            products: [
              {
                title: "Synthetic regular component",
                handle: "synthetic-regular-component",
                status: "published",
                sales_channels: [{ id: channels[0].id }],
                options: [{ title: "Size", values: ["Default"] }],
                variants: [
                  {
                    title: "Default",
                    options: { Size: "Default" },
                    manage_inventory: false,
                    prices: [{ currency_code: "usd", amount: 120 }],
                  },
                ],
              },
            ],
          },
        });
        const bundle = await bundleService.createBundles({
          title: "Synthetic bundle",
        });
        const bundleItem = await bundleService.createBundleItems({
          bundle_id: bundle.id,
          quantity: 2,
        });
        await link.create([
          {
            [BUNDLED_PRODUCT_MODULE]: { bundle_id: bundle.id },
            [Modules.PRODUCT]: { product_id: bundleProducts[0].id },
          },
          {
            [BUNDLED_PRODUCT_MODULE]: { bundle_item_id: bundleItem.id },
            [Modules.PRODUCT]: { product_id: components[0].id },
          },
        ]);
        const bundleResponse = await api.get(
          `/store/bundle-products/${bundle.id}`,
          {
            headers,
            params: { region_id: regions[0].id, currency_code: "usd" },
          },
        );
        expect(bundleResponse.data.bundle_product.product.id).toBe(
          bundleProducts[0].id,
        );
        expect(bundleResponse.data.bundle_product.items[0].product.id).toBe(
          components[0].id,
        );
        const containing = await api.get(
          `/store/products/${components[0].id}/bundles`,
          {
            headers,
            params: { region_id: regions[0].id, currency_code: "usd" },
          },
        );
        expect(containing.data.bundles[0].id).toBe(bundle.id);
        const ownLookup = await api.get(
          `/store/products/${bundleProducts[0].id}/bundles`,
          { headers },
        );
        expect(ownLookup.data.bundles).toEqual([]);
        const bundleCart = await api.post(
          "/store/carts",
          { region_id: regions[0].id, sales_channel_id: channels[0].id },
          { headers },
        );
        await api.post(
          `/store/carts/${bundleCart.data.cart.id}/line-item-bundles`,
          {
            bundle_id: bundle.id,
            quantity: 1,
            items: [
              {
                item_id: bundleItem.id,
                variant_id: components[0].variants![0].id,
              },
            ],
          },
          { headers },
        );
        const bundleCartResponse = await api.get(
          `/store/carts/${bundleCart.data.cart.id}`,
          {
            headers,
            params: {
              fields:
                "+items.*,+items.metadata,+items.product,+items.variant,+items.variant.calculated_price,+items.variant.prices,+items.variant.product,+items.variant.product.images,*items.variant.preorder_variant,*items.variant.preorder_variant.prices,+region,*promotions,*shipping_methods,+item_subtotal,+item_total,+item_tax_total,+discount_total,+total,+shipping_subtotal,+shipping_total,+shipping_tax_total,+tax_total,+shipping_address",
            },
          },
        );
        expect(bundleCartResponse.data.cart.items[0].unit_price).toBe(80);
        expect(
          bundleCartResponse.data.cart.items[0].metadata
            .bundle_regular_unit_price,
        ).toBe(120);
        const retainedBundle = await api.get("/store/products", {
          headers,
          params: {
            handle: bundleProducts[0].handle,
            limit: 1,
            region_id: regions[0].id,
            fields:
              "*variants.calculated_price,*variants.prices,*variants.inventory_quantity,*variants.manage_inventory,*variants.preorder_variant,*variants.preorder_variant.prices,*bundle,*bundle.items,*bundle.items.product",
          },
        });
        const linkValue = retainedBundle.data.products[0].bundle;
        const retainedLink = Array.isArray(linkValue)
          ? linkValue[0]
          : linkValue;
        expect(retainedLink.id).toBe(bundle.id);
        expect(retainedLink.items[0].product.id).toBe(components[0].id);
        expect(retainedLink.items[0].product.title).toBe(
          "Synthetic regular component",
        );
        const bundleListing = await api.get("/store/products", {
          headers,
          params: {
            limit: 100,
            region_id: regions[0].id,
            fields:
              "*variants.calculated_price,*variants.prices,*variants.inventory_quantity,*variants.manage_inventory,*tags,*metadata,*bundle",
          },
        });
        expect(
          bundleListing.data.products.some((p: { bundle?: unknown }) =>
            Boolean(p.bundle),
          ),
        ).toBe(true);
        const migrations = await dbConnection.raw(
          "select table_name from information_schema.tables where table_schema='public' and table_name in ('product_option','preorder_variant','bundle')",
        );
        expect(
          migrations.rows.map((row: { table_name: string }) => row.table_name),
        ).toContain("preorder_variant");
        if (process.env.MEDUSA215_RUNTIME_RESULT)
          writeFileSync(
            process.env.MEDUSA215_RUNTIME_RESULT,
            JSON.stringify(
              {
                fixtureOnly: true,
                product: retainedPreorder.data.products[0],
                bundleProduct: retainedBundle.data.products[0],
                bundleListing: bundleListing.data.products,
                cart: cart.data.cart,
                bundle: bundleResponse.data.bundle_product,
                bundleCart: bundleCartResponse.data.cart,
                ownBundleLookup: ownLookup.data.bundles,
                migrationTables: migrations.rows,
              },
              null,
              2,
            ),
          );
      });
    },
  });
  afterAll(() => rmSync(fixture, { recursive: true, force: true }));
} else {
  describe.skip("Medusa 2.15 local contract fixture", () => {
    it("requires explicit isolated fixture environment", () => {});
  });
}
