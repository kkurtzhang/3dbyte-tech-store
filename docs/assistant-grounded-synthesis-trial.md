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

## Proposed paired live comparison — approval required

Do not run or enable the flag yet. After review and a separately approved secure
execution setup, compare pinned #260 with this exact trial head using the same
current approved packet and model/prompt version. Never compare stale fixture facts
to different live content. Suggested first batch: **12 customer turns per arm,
24 total**, once each, no sampling retries:

- Magigoo PETG/glass plus TPU follow-up (two turns), material list and cooling release.
- Magigoo PEI, coated glass and missing application instructions.
- Dragonfly construction, ordinary PETG suitability and printer-fit question.
- Dragonfly 500°C operation and a follow-up (two turns); both should use the strict fallback.

Use synthetic identities only. Proposed hard spend ceiling **US$2 total**, 24 turns,
max existing five route steps plus four added trial calls per turn, at most 168
provider calls across both arms, with a 60-second per-turn wall-clock limit and no
full reruns. **The current comparison harness does not enforce that dollar cap**:
before requesting execution, add/review a runner that reserves worst-case spend
using verified current provider prices, bounds original-route output as well as
trial output, meters all calls and stops before the next reservation exceeds $2.
Confirm the existing tracing setup records both arms; do not create a test-only
Langfuse connection. No fallback run may be relabelled successful synthesis.

Blindly review intent-first usefulness, naturalness, relevance, complete grounding,
qualifiers, unknowns and a single useful clarification; retain all strict existing
safety/evidence rubrics. Report output, arm/origin, exact SHA/prompt/validator
versions, evidence hashes, latency, token/cost usage and actual ingested trace IDs.
Any unsupported fact/identity/operating-limit acceptance blocks rollout. A small
batch can guide the next revision; it cannot establish statistical safety or justify
a model upgrade. Merge, staging deployment, live calls and flag enablement each
remain outside this draft's approval.
