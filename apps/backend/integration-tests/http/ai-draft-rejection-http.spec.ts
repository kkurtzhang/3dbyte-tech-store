import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { generateJwtToken, Modules } from "@medusajs/framework/utils"
import type {
  IUserModuleService,
} from "@medusajs/framework/types"

import type { AiProductDraftModule } from "../../src/api/admin/ai-product-drafts/utils"
import { packetV3 } from "../../src/lib/ai-product-drafts/__tests__/quality-fixture"
import { draftReviewHash } from "../../src/lib/ai-product-drafts/quality"
import { resetDefaultRateLimitStore } from "../../src/lib/rate-limits/middleware"

const enabled = process.env.DRAFT_HTTP_FIXTURE === "1"
const backend = path.resolve(__dirname, "../..")
const endpoint = "/integrations/hermes/product-drafts"
const fixtureToken = "synthetic-local-http-fixture"
const requestOptions = {
  headers: { "x-3db-hermes-product-draft-token": fixtureToken },
  validateStatus: () => true,
}
const research = (label: string) => ({
  ...structuredClone(packetV3),
  request_id: `http-fixture-${label}`,
  product_input: {
    ...packetV3.product_input,
    product_name: `Synthetic HTTP ${label} Hotend`,
    manufacturer_part_number: `HTTP-${label}`,
  },
})
const refreshed = (packet: ReturnType<typeof research>, date: string) => ({
  ...packet,
  sources: packet.sources.map((source) => ({ ...source, retrieved_at: date })),
})

if (enabled) {
  if (!["localhost", "127.0.0.1"].includes(process.env.DB_HOST || ""))
    throw new Error("HTTP draft checks require an isolated loopback database")

  // Use the production API tree, not copied handlers or a mocked request scope.
  // The fixture config includes native core services and the production lock
  // provider, while excluding unrelated external integrations and background jobs.
  const fixture = mkdtempSync(path.join(tmpdir(), "draft-http-fixture-"))
  mkdirSync(path.join(fixture, "src"))
  symlinkSync(path.join(backend, "src/api"), path.join(fixture, "src/api"))
  symlinkSync(
    path.join(backend, "node_modules"),
    path.join(fixture, "node_modules")
  )
  symlinkSync(
    path.join(backend, "package.json"),
    path.join(fixture, "package.json")
  )
  writeFileSync(
    path.join(fixture, "medusa-config.js"),
    `const { defineConfig } = require("@medusajs/framework/utils")
module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    workerMode: "server",
    http: { storeCors: "http://localhost", adminCors: "http://localhost",
      authCors: "http://localhost", jwtSecret: "synthetic-fixture-only",
      cookieSecret: "synthetic-fixture-only" }
  },
  admin: { disable: true },
  modules: [
    { resolve: "@medusajs/medusa/locking", options: { providers: [
      { resolve: "@medusajs/medusa/locking-postgres", id: "locking-postgres", is_default: true }
    ] } },
    { resolve: ${JSON.stringify(path.join(backend, "src/modules/ai-product-draft"))} },
    { resolve: "@medusajs/medusa/notification", options: { providers: [
      { resolve: "@medusajs/medusa/notification-local", id: "admin-feed",
        options: { name: "Admin feed notifications", channels: ["feed"] } }
    ] } }
  ]
})
`
  )
  afterAll(() => rmSync(fixture, { recursive: true, force: true }))

  medusaIntegrationTestRunner({
    cwd: fixture,
    dbName: `draft_http_fixture_${process.pid}`,
    disableAutoTeardown: true,
    env: { HERMES_PRODUCT_DRAFT_TOKEN: fixtureToken },
    testSuite: ({ api, getContainer, dbConnection }) => {
      const drafts = () =>
        getContainer().resolve<AiProductDraftModule>("aiProductDraft")
      const rows = (packet: ReturnType<typeof research>) =>
        drafts().listAiProductDrafts({
          source_agent: "hermes",
          request_id: packet.request_id,
        })
      const post = (packet: unknown) =>
        api.post(endpoint, packet, requestOptions)

      describe("running guarded rejection and restoration with PostgreSQL", () => {
        // Separate cases have independent caller windows; each case retains the
        // production 30/minute limiter, including its concurrent requests.
        beforeEach(() => resetDefaultRateLimitStore())
        it("rolls back guarded research replacement if its completion event fails", async () => {
          const packet = research("replacement-failure")
          expect((await post(packet)).status).toBe(201)
          const before = (await rows(packet))[0]
          const user = await getContainer()
            .resolve<IUserModuleService>(Modules.USER)
            .createUsers({ email: "synthetic-reviewer@example.invalid" })
          const token = generateJwtToken(
            {
              actor_id: user.id,
              actor_type: "user",
              auth_identity_id: "synthetic-local-auth",
            },
            { secret: "synthetic-fixture-only", expiresIn: "1h" }
          )
          const options = {
            headers: { authorization: `Bearer ${token}` },
            validateStatus: () => true,
          }
          const route = `/admin/ai-product-drafts/${before.id}/reprocess`
          const change = {
            ...packet,
            warnings: ["Synthetic revised source note"],
          }
          const body = { packet: change, review_hash: draftReviewHash(before) }
          await dbConnection.raw(`
            create function draft_fixture_fail_replace_event() returns trigger
            language plpgsql as $$ begin
              if new.type = 'research_replaced' then
                raise exception 'synthetic replacement completion failure';
              end if;
              return new;
            end $$;
            create trigger draft_fixture_fail_replace_event
              before insert on ai_product_draft_event for each row
              execute function draft_fixture_fail_replace_event();
          `)
          try {
            const responses = await Promise.all([
              api.post(route, body, options),
              api.post(route, body, options),
            ])
            expect(responses.map((response) => response.status)).toEqual([
              500, 500,
            ])
            const [after] = await rows(packet)
            expect(after.raw_packet).toEqual(before.raw_packet)
            expect(after.normalized_draft).toEqual(before.normalized_draft)
            const events = await drafts().listAiProductDraftEvents({
              draft_id: before.id,
            })
            expect(
              events.some(
                (event) => event.type === "research_replacement_backup"
              )
            ).toBe(false)
          } finally {
            await dbConnection.raw(`
              drop trigger draft_fixture_fail_replace_event on ai_product_draft_event;
              drop function draft_fixture_fail_replace_event();
            `)
          }
          const retry = await api.post(route, body, options)
          expect(retry.status).toBe(200)
          expect(retry.data.draft.raw_packet).toEqual(change)
        })

        it("rolls back reversible rejection if its audit event fails and retains history on retry", async () => {
          const packet = research("rejection-failure");
          expect((await post(packet)).status).toBe(201);
          const before = (await rows(packet))[0];
          const user = await getContainer()
            .resolve<IUserModuleService>(Modules.USER)
            .createUsers({
              email: "synthetic-rejection-reviewer@example.invalid",
            });
          const token = generateJwtToken(
            {
              actor_id: user.id,
              actor_type: "user",
              auth_identity_id: "synthetic-local-auth",
            },
            { secret: "synthetic-fixture-only", expiresIn: "1h" },
          );
          const options = {
            headers: { authorization: `Bearer ${token}` },
            validateStatus: () => true,
          };
          const route = `/admin/ai-product-drafts/${before.id}/reject`;
          const body = {
            reason: "Redundant synthetic research; retain history.",
            review_hash: draftReviewHash(before),
          };
          const stale = await api.post(route, { ...body, review_hash: "stale" }, options);
          expect(stale.status).toBe(409);
          expect(stale.data.message).toContain("Refresh the draft before rejecting it.");
          await dbConnection.raw(`
            create function draft_fixture_fail_rejection_event() returns trigger
            language plpgsql as $$ begin
              if new.type = 'rejected' then raise exception 'synthetic rejection audit failure'; end if;
              return new;
            end $$;
            create trigger draft_fixture_fail_rejection_event before insert on ai_product_draft_event
              for each row execute function draft_fixture_fail_rejection_event();
          `);
          try {
            const responses = await Promise.all([
              api.post(route, body, options),
              api.post(route, body, options),
            ]);
            expect(responses.map((r) => r.status)).toEqual([500, 500]);
            const [after] = await rows(packet);
            expect(after.status).toBe("needs_review");
            expect(after.raw_packet).toEqual(before.raw_packet);
            expect(after.rejected_at).toBeNull();
            const events = await drafts().listAiProductDraftEvents({
              draft_id: before.id,
            });
            expect(events.some((event) => event.type === "rejected")).toBe(
              false,
            );
          } finally {
            await dbConnection.raw(`
              drop trigger draft_fixture_fail_rejection_event on ai_product_draft_event;
              drop function draft_fixture_fail_rejection_event();
            `);
          }
          const retry = await api.post(route, body, options);
          expect(retry.status).toBe(200);
          expect(retry.data.draft.status).toBe("rejected");
          expect((await api.post(route, body, options)).status).toBe(409);
          const history = await api.get(
            `/admin/ai-product-drafts/${before.id}`,
            options,
          );
          expect(history.status).toBe(200);
          expect(
            history.data.events.filter(
              (event: { type: string }) => event.type === "rejected",
            ),
          ).toHaveLength(1);
          expect(
            history.data.events.some(
              (event: { type: string }) => event.type === "needs_review",
            ),
          ).toBe(true);
          const queue = await api.get("/admin/ai-product-drafts", {
            ...options,
            params: {
              status: "needs_review",
              q: packet.product_input.product_name,
            },
          });
          expect(
            queue.data.drafts.some(
              (draft: { id: string }) => draft.id === before.id,
            ),
          ).toBe(false);
          const rejected = await api.get("/admin/ai-product-drafts", {
            ...options,
            params: {
              status: "rejected",
              q: packet.product_input.product_name,
            },
          });
          expect(
            rejected.data.drafts.map((draft: { id: string }) => draft.id),
          ).toContain(before.id);
          const replacement = await api.post(
            `/admin/ai-product-drafts/${before.id}/reprocess`,
            { packet, review_hash: draftReviewHash(retry.data.draft) },
            options,
          );
          expect(replacement.status).toBe(200);
          expect(replacement.data.draft.status).toBe("needs_review");
          const restored = await api.get(
            `/admin/ai-product-drafts/${before.id}`,
            options,
          );
          expect(
            restored.data.events.some(
              (event: { type: string }) => event.type === "rejected",
            ),
          ).toBe(true);
          expect(
            restored.data.events.some(
              (event: { type: string }) =>
                event.type === "research_replacement_backup",
            ),
          ).toBe(true);
        });

      })
    },
  })
} else {
  describe.skip("isolated running draft HTTP fixture", () => {
    it("requires DRAFT_HTTP_FIXTURE=1 and a disposable loopback PostgreSQL database", () => {})
  })
}
