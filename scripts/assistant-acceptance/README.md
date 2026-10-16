# Local assistant acceptance

This harness exercises the normal `/api/ai-shopping-assistant` route from reviewed PR #252, commit `65231bdef03ce9d1d22e98a6dc6d83e1f3dba12c`. It does not change the route, mock the AI SDK, enable the local-knowledge bypass, merge #252, or contact staging. The harness pins the landed #252 runtime; review its scripts separately and rebaseline only after a replacement dependency is reviewed and merged.

Two modes share the same real Next.js route, AI SDK, Redis rate limiter and synthetic backend:

- **Deterministic:** a loopback OpenAI-compatible SSE simulator selects known tool calls and emits deliberately unsupported prose. The installed SDK executes those tools over HTTP; the patched route must suppress the prose, validate evidence and produce citations. No model credential or external model call is involved.
- **Live:** a small relay sends the seven fixed synthetic questions and tool results to `https://api.deepseek.com/chat/completions`, using the user's explicitly supplied key. It uses `deepseek-flash`, temperature 0.2, a 1,800-token output cap, 45-second provider timeout and a maximum of 35 provider requests per run. The live model chooses its own tools. No live-provider acceptance is claimed until this mode runs successfully.

## Already prepared on this Mac

Checkout: `/Volumes/MINI-M1/Codex/3dbyte-tech-store/worktrees/assistant-acceptance-harness-20261016`.

Workspace: `/Volumes/MINI-M1/Codex/3dbyte-tech-store/local-assistant-acceptance`.

Use Node 22 and the installed workspace dependencies. All source, dependencies, build cache, Redis source/binary, temporary files and reports must resolve onto `/Volumes/MINI-M1`. The launcher refuses runtime `.env` files at the checkout root or storefront, unrelated runtime-source changes, untracked runtime source, and a mismatched Redis installation. It never reads another checkout's configuration.

From the checkout root:

```sh
/opt/homebrew/opt/node@22/bin/node scripts/assistant-acceptance/cli.mjs run
```

This creates fresh loopback services on OS-selected ports, runs all seven cases sequentially, writes `report.json` and `report.html` in `WORKSPACE/runs/<run-id>/`, then stops its own services. A second run gets fresh rate-limit state. Reports distinguish deterministic/live execution and include source/head identity, fixture provenance, case checks, tool names, provider request counts and cleanup results. The HTML is an escaped, clickable transcript of actual route output; it is not a test of the storefront drawer or manufacturer page availability.

Useful commands:

```sh
node scripts/assistant-acceptance/cli.mjs preflight
node scripts/assistant-acceptance/cli.mjs run --case mixed-material-temperature
node scripts/assistant-acceptance/cli.mjs serve
```

`serve` prints the loopback base URL for manual requests with the documented case prompts. Stop with Ctrl-C. Unknown prompts are rejected by the provider simulator/relay. The full conversation is constrained: system text and tool definitions must match the pinned reviewed contract; assistant messages must come from a completion issued by this relay; tool results must exactly match outputs rebuilt from its synthetic fixtures. Arbitrary client history, extra fields and modified continuations are rejected before provider egress. A run or serve process handles SIGINT/SIGTERM and bounded startup/request failures; it kills only its own children. SIGKILL or power loss cannot run cleanup handlers: use the recorded run directory and OS process inspection to identify leftover owned processes, never blanket `pkill`. Next's build lock prevents simultaneous servers in this worktree. The known generated `next-env.d.ts` dev-path rewrite is restored after each run; unexpected edits are preserved and reported.

## First-time setup in another isolated SSD worktree

Install this repository's frozen dependencies using an SSD pnpm store/cache. Do not copy main/staging `.env` files. The provided workspace already reuses the existing SSD dependency installation.

Run the explicit setup once:

```sh
node scripts/assistant-acceptance/setup-redis.mjs
```

The setup downloads official Redis **8.4.7**, verifies SHA256 `ed83df9fcb724176fc901147aaa63830166e35c1cff39835c4fc9a5860ed1310`, and builds it with macOS Command Line Tools under `WORKSPACE/tools/`. Source: [official Redis archive](https://download.redis.io/releases/redis-8.4.7.tar.gz); checksum authority: [redis/redis-hashes](https://github.com/redis/redis-hashes). No privileged install, package-manager service, system setting, Docker container or persistent daemon is needed. Existing completed builds are left unchanged, and preflight verifies the binary against its installation receipt. `--workspace /Volumes/MINI-M1/<directory>` is supported by setup and launcher; pass the same path to both.

## Seven cases

| Case                                | Required behavior                                                                                                           |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `magigoo-materials`                 | All five material names and Magigoo citation.                                                                               |
| `bms-body-material`                 | Copper-alloy statement and Phaetus citation.                                                                                |
| `unsupported-installed-temperature` | Installed maximum temperature remains unknown; no safe-500°C claim.                                                         |
| `mismatched-product-evidence`       | Reject wrong-product evidence, or clearly separate valid product scopes; never use Magigoo as proof of BMS construction.    |
| `mixed-material-temperature`        | Preserve both known material and unknown installed-temperature information.                                                 |
| `mixed-material-unknowns`           | Preserve material plus electrical, installed-temperature and nozzle unknowns.                                               |
| `mixed-synthetic-order-shipping`    | Preserve knowledge plus fresh synthetic order/tracking and a 12.34 AUD shipping estimate; do not expose the supplied email. |

The exact prompts and expected checks are in `cases.mjs`. This is a separate seven-case runner; those IDs are not entries in the broader customer-eval manifest. A passing check confirms bounded expected output, not unrestricted semantic correctness. Review live transcripts and source scope before declaring acceptance.

## Isolation and data boundaries

- Next, fixtures and native Redis listen only on `127.0.0.1`. Redis has no persistence, one database, a 16 MiB memory cap, and an ACL allowing only the rate limiter's key prefix and commands. Replication, migration, configuration, module loading and file commands are denied.
- The Next child receives a newly constructed environment: no inherited credentials, proxies, custom Node options, CMS/search URLs or telemetry credentials. Its process-local TCP/listener guard rejects external connections and unrelated loopback ports. The guard is a test containment mechanism for trusted repository code, not a sandbox for hostile executable code.
- The fixture service has no commerce client, database connection or network forwarding. Only five POST paths exist: knowledge search, product guidance, order lookup, tracking and shipping estimate. Unknown endpoints, ticket preparation/confirmation, unexpected identifiers, foreign origins, altered Host headers, wrong fixture markers and non-JSON requests are rejected. Tickets and emails have no implementation.
- Order/shipping data is wholly synthetic. The only accepted order is `SYNTHETIC-ACCEPTANCE-001`, email `fixture@example.invalid`, and item `variant_fixture` to Sydney 2000 AU. No real customer backend is reachable.
- Knowledge is a labelled synthetic replay of the existing public evidence snapshot. Per-run validity timestamps test the contract and do **not** claim a fresh manufacturer review, approval or staging import. An intentional wrong-product fixture exercises rejection. Source links preserve their original public manufacturer targets; the harness does not fetch them.
- Provider requests are reconstructed from an explicit field allowlist with fixed model, token limit, temperature, thinking and stream settings. `provider-contract.json` pins the system/tool definitions captured from reviewed #252; it is never learned from incoming requests. The support-ticket tool is omitted from outbound definitions. Follow-up tool calls support the reviewed schema defaults and complete omission of provider prose by the grounding transform; caller replacements are rejected. Continuations are consumed once, with at most five model steps and 35 provider requests per server.
- Bounded upstream SSE is fully decoded before any bytes reach Next. Text and tool fragments are assembled across events, JSON escapes are decoded, and the configured key plus common escaped/encoded representations are checked. Secret-bearing, malformed, incomplete or unsupported responses fail closed with a generic error. Only known protocol fields are re-encoded downstream. This is a strict protocol boundary, not a claim of detecting every arbitrary obfuscation. Actual provider compatibility still requires the separately authorized live acceptance.
- The fixture marker is public and grants no real service access. The provider key stays in the live relay, never in Next, a browser, command arguments, normal fixtures or reports. The relay permits only the fixed official HTTPS endpoint, rejects redirects, bounds responses, and withholds decoded secret-bearing responses before downstream delivery. Provider error details are withheld. No raw environment dump is recorded; Next startup diagnostics redact configured values.
- The launcher is finite, does not deploy, and creates no persistent access. If live configuration is missing/invalid, it exits before starting services.

## Smallest secure step for live acceptance

The user must supply an authorized DeepSeek key privately; no new backend credential is needed. Create a private directory outside Git on the SSD, copy **this directory's empty example only**, set permissions, and fill the key in a local editor:

```sh
mkdir -p /Volumes/MINI-M1/Codex/3dbyte-tech-store/local-assistant-acceptance/private
chmod 700 /Volumes/MINI-M1/Codex/3dbyte-tech-store/local-assistant-acceptance/private
cp -n scripts/assistant-acceptance/.env.example /Volumes/MINI-M1/Codex/3dbyte-tech-store/local-assistant-acceptance/private/provider.env
chmod 600 /Volumes/MINI-M1/Codex/3dbyte-tech-store/local-assistant-acceptance/private/provider.env
```

Do not overwrite an existing private file; use the existing file if already prepared. The file may contain only comments and `DEEPSEEK_API_KEY=<user-supplied value>`. Symlinks, group/world-readable files, files inside the checkout and extra variables are rejected. The parser never executes shell syntax or automatically reads a main/staging profile.

After the user explicitly chooses to spend provider tokens:

```sh
node scripts/assistant-acceptance/cli.mjs run --mode live --key-file /Volumes/MINI-M1/Codex/3dbyte-tech-store/local-assistant-acceptance/private/provider.env
```

No live calls were made during initial setup; fake relay transport tests are separately labelled unit tests.

## Verification

```sh
node --test scripts/assistant-acceptance/harness.test.mjs scripts/assistant-acceptance/guard.test.mjs scripts/assistant-acceptance/relay-boundaries.test.mjs
node --test scripts/assistant-acceptance/lifecycle.integration.test.mjs
```

The relay regressions cover unapproved history/system/tool/option fields, altered continuations, split or escaped SSE key canaries, malformed streams, and body/response/request limits using fake keys and an in-memory upstream. The integration suite also runs four actual SDK steps per case through an injected mock provider, covering all five synthetic tools and schema defaults. Mock requests are explicitly recorded as `mockProviderRequests` with `injected-test-transport` provenance and zero real-provider requests; they do not establish live acceptance.

The integration suite exercises two complete seven-case runs through the real route/SDK, missing live configuration, injected startup failure, interruption and real CLI SIGTERM cleanup, closed ports, Redis ACLs, and unchanged source/configuration boundaries. Other storefront regression, type and lint checks remain the repository's normal commands. Dependency advisories belong to the pinned baseline and must be reported; this harness adds no npm dependencies or lockfile edits.
