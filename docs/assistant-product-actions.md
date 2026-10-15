# Assistant product search and actions

This change builds on draft PR245's first-step product-page lookup policy. It does not replace the separate ticket-consent and conversation-history work.

## Search outcomes

`POST /ai/product-guidance` keeps the existing internal service authentication. A named search uses its Meilisearch IDs as a mandatory Medusa graph constraint and checks membership again after the graph read. Zero IDs, withdrawn results or filtered catalogue records return `status: empty` and no products. Invalid search payloads, unavailable dependencies or malformed results return a controlled unavailable response. There is no unfiltered fallback for a named query.

An explicitly empty request with `mode: browse` is the only unfiltered published-catalogue path. The assistant selects that mode from a narrow, complete user command such as “Browse catalogue” or “Show me the products”; the model cannot select browse as a fallback. Other natural-language browsing phrases are not claimed to be universally recognized. A named query in browse mode is rejected.

Product URLs use the current native Medusa handle. A missing native handle never falls back to a stale search-index handle. Catalogue metadata is marked discovery evidence; it does not establish specifications or compatibility.

## Fresh action channel

The server-side product executor validates each fresh backend result: bounded result count, product identity, native handle, title, mode and query, and exact URL at the configured storefront origin and `/products/<handle>` path. Invalid URLs and missing current page identities produce no action. Search is bounded by a five-second deadline and the request abort signal. Explicit lookup opt-outs prevent backend execution even if the model calls the tool.

A request-local Map records actual product executions by SDK tool-call ID. The UI-stream transform adds a transient `data-product-search` event only for these recorded calls. It preserves the ordinary SDK tool stream. Client history and model-authored URL text cannot populate this Map. Events contain a server-generated assistant message ID and safe relative links, not credentials, prices, inventory claims, images or compatibility facts. Display text receives the existing complete-email masking.

The drawer consumes the SDK's live `onData` events into separate in-memory state. It never derives product cards from historical tool/data parts. A later failed lookup replaces that answer's earlier card state. Cards use the existing product-card UI and work with missing model prose or a model answer that omits URLs. A query not lexically represented in the title/handle is labeled a possible alternative; this conservative label is not semantic relevance certification. All cards explicitly leave compatibility unverified.

## Parallel integration boundary

Product changes in the shared assistant route are limited to search execution, product policy and the UI-stream wrapper. History canonicalization and support-ticket consent belong to the parallel security PR. Its confirmation component can be inserted after `AssistantSourceLinks`, extending the drawer's tool-only-message guard to `!content && !productEvent && !supportProposal`. Preserve the security branch's `withSupportSession(response, req, supportSession)` around the product stream response so its HttpOnly consent cookie and no-store headers remain intact. Keep its canonical `history.ts` imports and guardrails version, and preserve both features' tests when integrating. This PR alone does not authenticate historical facts or authorize support writes.

## Verification and release limits

Tests cover the actual backend handler with synthetic service adapters; safe/malformed/missing outcomes; request cancellation and deadlines; opt-out; stale index handles; malicious URLs and forged tool history; installed SDK multi-step streaming with URL-free prose; and real Next.js drawer navigation using synthetic SSE. Browser tests block external browser requests and local runs use unreachable loopback dependencies. They establish runtime rendering and navigation, not live catalogue relevance or provider reliability.

The existing CI browser-smoke job includes the new drawer cases. Its workflow currently triggers only for `main`/`staging` targets. A PR stacked on PR245's branch must be retargeted after that dependency is merged before those CI gates can run; local validation does not waive them. Keep both assistant PRs draft pending independent review. No merge, deployment, credentials, access or live data changes are included.
