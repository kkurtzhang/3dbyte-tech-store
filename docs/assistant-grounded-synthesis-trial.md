# Grounded synthesis trial (disabled)

This is a stacked draft based on PR #260 at
`497f94322e45e35362cebf75c614b8c979a664b0`. Its PR base is
`fix/assistant-customer-answers-20261029`, not staging. PR #260 remains independent
and unmodified. After #260 merges, refresh this trial against staging and retarget
it, then rerun all gates. Do not merge this stacked branch first. The exact stacked
base is temporarily included in the two existing PR workflow filters so all
standard checks run; no jobs, permissions or security requirements are removed.

`AI_ASSISTANT_GROUNDED_SYNTHESIS_ENABLED` is a **server-only, default-false** runtime
flag. Only the exact value `true` selects the trial. The environment example and
Compose default keep it false. No deployment, setting change, remote prompt
publication, credentials, knowledge publication or live provider call is part of
this draft. With the flag off, the #260 composer and tool selection are unchanged
and there are zero additional model calls.

## Generation and safety boundaries

The existing route first performs current catalogue/knowledge retrieval. The
stream transform holds all prose, while tool/status events continue streaming.
For eligible knowledge turns the trial then:

1. Revalidates approval expiry, document/revision consistency and exact scope
   using the same `currentKnowledge` boundary as the composer. Incomplete,
   unavailable, empty, invalid, conflicting, multi-product or mixed-variant results
   use the useful #260 fallback without extra calls. No approval is renewed.
2. Builds a bounded JSON packet containing original facts, null unknowns, excerpts,
   source bodies and exact provenance. No source qualifier is truncated. The v1
   limit is four documents and 18,000 UTF-8 bytes including packet metadata.
3. Asks the existing configured model for natural short paragraphs, not fixed
   claim templates. Customer text and evidence stay in a user JSON payload and are
   explicitly untrusted. The editable Langfuse tone is used only for drafting;
   versioned code-owned rules follow it. The review uses only code-owned rules.
4. Parses a strict schema; checks known fact IDs, scope-bound product key and a
   canonical product placeholder, rejects links/HTML/inline citations, excessive
   length/questions, and numeric quantities absent from the cited original fact
   values (no conversions). Recognized material/surface scopes get additional
   checks. All other prose, including paragraphs labelled guidance/uncertainty,
   still requires full grounding review. Labels and IDs cannot establish entailment.
5. Makes a separate review call covering every paragraph and original conditions,
   unknowns, identity, safety and usefulness. Unsupported/safety/identity failures,
   malformed reviews, provider errors and timeouts immediately fall back. Only
   repetition or customer-focus findings permit one complete repair and re-review.
6. Revalidates and compares the entire evidence packet immediately before emitting
   accepted text. Sources are derived only from accepted fact IDs and exact
   document/revision/scope identities, deduplicated by URL, and emitted after
   `text-end`. Existing product/action cards retain their verified functional links.
   Caller abort discards the answer. The privacy sanitizer still covers final text.

The first trial deliberately keeps thermal/electrical operational questions,
ratings, and their follow-ups on #260's stricter composer path, including the
500°C boundary case. Generated thermal/electrical quantities are also rejected.
This is a conservative trial boundary, not an exhaustive safety classifier.
Ordinary construction and documented material/surface questions can synthesize.
Missing Dragonfly PETG/installation claims remain missing: no positive PETG
compatibility or printer limit is inferred from construction or a heat rating.
Mixed commerce and supplied-email conversations skip extra synthesis passes.

Hard checks prove only their narrow mechanical properties. Product markers prevent
structured scope substitution, **not complete entity recognition**. Numeric matches
are necessary, **not sufficient support**. The same provider/model reviews its own
draft, so correlated errors, omitted qualifications and false accepts remain risks.
This is **not a semantic verification guarantee** and must not be enabled based on
mock tests alone. Source truth and approval still depend on reviewed content.

## Bounds, latency and trace metadata

The additional path makes two calls normally, four at most (draft, review, repair,
review), without tools or SDK retries. Draft/repair output caps are 700 tokens each;
review caps are 600 each: at most 2,600 added output tokens. Each call has a 10-second
limit inside a 30-second cumulative deadline. All rejected drafts remain buffered;
timeout/failure returns a freshly validated composer answer. These are additional
to the original route's existing tool loop, not a replacement cost budget. Byte
limits are not exact input-token limits or dollar guarantees.

The root assistant observation records `answer_origin=reviewed_llm_synthesis` or
`validated_claim_composer`, existing `answer_policy_version` and remote prompt
source/name/label/version, plus `synthesis_prompt_version`,
`synthesis_validator_version`, flag, outcome, call count, duration and returned
usage totals. The extra SDK generations use stage-specific function IDs and disable
input/output telemetry. The final trace output contains only rendered validated
text; rejected drafts are not stored as final answers. Error details do not enter
customer text. Actual ingestion remains unverified without an approved live run.

## Mocked evaluation contract

Natural customer inputs contain no grading instructions. Fixtures/mocks exercise
Magigoo PETG/glass, TPU follow-up carrying only structured glass context, unknown
PEI, missing application instructions, ordinary Dragonfly construction and the
retained 500°C operating boundary. Additional regressions cover invented identity,
IDs/links/numbers, unsupported compatibility, injection in source bodies, incomplete
review coverage, null/expired/conflicting evidence, expiry during review, one-repair
limits, provider failure/timeout, abort and end-only Sources. Installed SDK/route
mocks verify exact visible trace output and flag-off parity. Mock outputs are test
inputs, **not measurements of real-model response quality**.

## Comparison preflight and reservations (no live run)

`comparison-budget.ts` requires an explicit reviewed public pricing record: exact
model and documented version, provider origin, full context-token capacity,
**peak/cache-miss upper input rate** and peak output rate in USD per million,
official pricing source URL, verification time and expiry. It supplies no default
prices, cache-hit discount or byte-to-token estimate. Unknown/malformed model or
rates, zero rates, future/stale records, expiry beyond 24 hours, invalid SHA/run ID,
or a reservation above USD 2 fail closed. Record syntax/freshness checks do not
independently prove that an operator copied the correct provider prices.

Offline command (reads only the explicitly supplied non-secret JSON file):

```bash
pnpm --filter=@3dbyte-tech-store/storefront-v3 eval:ai:comparison:preflight \
  /absolute/path/reviewed-public-pricing.json <candidate-40-character-sha> <unique-run-id>
```

This command cannot make provider or Langfuse calls. It prints the conservative
quote and exits nonzero if the whole plan cannot be reserved under USD 2.

The plan reserves **24 customer turns**, at most **168 physical provider attempts**,
**247,200 output tokens**, and **168 times the documented context capacity** for
input. Each of 24 turns gets five initial-route attempts at 1,800 output tokens;
each of 12 trial turns additionally gets one 700-token draft, two 600-token reviews
and one 700-token repair. Original-route SDK retries are disabled within comparison
context; any unexpected HTTP retry still consumes an attempt. Stage quotas cannot
be transferred. No failure, non-2xx response, abort, cache hit or missing usage
refunds a reservation. Integer micro-USD arithmetic rounds each call upward.

`comparisonFetch` enforces each actual outbound attempt before transport: exact
provider/model, bounded JSON/text-only requests, non-thinking mode, explicit output
cap, one completion and no paid provider-side tools. The full documented model
context is reserved at the supplied peak/cache-miss rate; output is over-reserved
separately. Reservations are synchronous before awaiting transport, preventing
concurrent calls from oversubscribing one controller. Pricing expiry and exact app
release SHA are checked during execution. The ledger excludes request content and
credentials and preserves actual returned trace IDs for **every turn**, including
non-final follow-ups. The full reservation is persisted before the first invocation;
receipt-write failures stop the batch. It must run once in one process; a process
restart is not permission to reset the allowance or automatically resume the run.

### Why the proposed USD 2 batch is currently refused

The [official DeepSeek pricing page](https://api-docs.deepseek.com/quick_start/pricing/),
checked October 30, 2026, lists `deepseek-flash` / DeepSeek-V4.1-Flash-1017 with a
1M-token context, peak cache-miss input USD 0.30/M and output USD 1.20/M. Full-context
reservation for this plan is **USD 50.696640**, so preflight **refuses USD 2**. This
is an intentionally large over-reservation, **not an expected bill**. Off-peak or
cache-hit savings cannot be assumed to make it pass. No paid call was made.

The USD 2 value is a **client reservation limit under explicit pricing assumptions**,
not a provider-enforced/account-wide dollar cap. Pricing changes, alias changes,
provider accounting, taxes or other account traffic cannot be controlled by this
code. The limits do not apply to ordinary customer traffic outside trusted
comparison context. A tighter reviewed tokenizer/framing bound would be needed to
make this full batch feasible under USD 2; otherwise a different plan/reservation
limit needs separate review and approval. Do not lower the declared model context
or use approximate character counts merely to obtain a passing quote.

## Proposed paired live comparison — approval and runtime entry required

`comparison-evaluation.ts` reuses the **nine existing everyday cases** plus the
existing two-turn `dragonfly-temperature-follow-up` case: ten cases / twelve turns
per arm, twenty results / twenty-four turn traces total. Inputs and strict graders
are unchanged. Everyday coverage includes Magigoo PETG/glass, TPU follow-up, release,
PEI and missing application instructions; Dragonfly construction, printing settings,
PETG suitability and printer fit. The safety conversation retains the 500°C edge.
Existing exact-phrase graders can flag legitimate wording variation; report their
results honestly and use blind human usefulness/grounding review as well. Do not
weaken them or resample until passing.

The baseline and trial use the **same candidate binary and approved retrieval path**.
The baseline selects the unchanged #260 composer (with tested output parity), not a
separately running historical #260 binary. Both arms record the candidate SHA plus
composer/prompt/validator versions. Trusted `AsyncLocalStorage` selects the arm per
turn; it does not mutate the global feature flag. There is **no new HTTP endpoint,
header, query or body option** to select an arm. Each request is paced 6.5 seconds
apart, has a 60-second turn deadline and a 2MB buffered response limit. Transport,
release or trace-diagnostic failures stop the batch; quality failures remain visible
results. There is one attempt per case, no sampling or automatic batch restart.

### Existing Langfuse integration and precise remaining execution boundary

Normal Next.js startup uses `instrumentation.ts` → `instrumentation.node.ts` →
`startNodeTracingAsync`. The route already creates Langfuse observations and returns
`x-3db-langfuse-trace-id` for the existing eval header. The new trusted in-process
adapter invokes that **same route in the already instrumented application process**,
keeps context through complete stream consumption, and uses the existing evaluator's
`fetchImpl` seam. It adds run/arm/turn/reservation metadata and separate sessions
`<run-id>-baseline` / `<run-id>-trial`. It creates no Langfuse client, exporter,
connection, credential or test-only telemetry configuration.

The ordinary `run-customer-ai-evals.ts` HTTP command **cannot enter this server-owned
context or meter provider calls from the client**. No live operator entry is exposed
by this draft. Execution therefore still requires a separately approved candidate
deployment and a reviewed trusted invocation inside the existing instrumented
runtime (with `invokeAssistant: POST` and a durable `persistReceipt` callback), after
the pricing/bound issue above is resolved. Deploying the code alone does not launch
the comparison or enable the feature for customer traffic. Do not repurpose the
isolated acceptance relay: it deliberately disables Langfuse and cannot demonstrate
existing application ingestion. No test-only connection should be added.

Mocked route tests verify arm isolation, global flag false, exact SHA, metadata and
visible output; they do **not** prove live ingestion. For a future approved run,
verify each returned trace in the existing authorized Langfuse UI/API at
`observe.3dbytetech.com.au`, project `estore`, checking natural input, final output,
run/arm/turn, exact release and policy versions. Header presence alone is not proof
of ingestion. Eval traces use `storefront.customer-ai-evals` / `customer-eval-runner`;
the shopping-assistant saved filter can hide them. Return actual verified IDs and
canonical links, never guessed links.

No paid comparison, new credentials, remote prompt/knowledge publication, merge,
deployment or flag enablement is authorized or performed in this draft update.
