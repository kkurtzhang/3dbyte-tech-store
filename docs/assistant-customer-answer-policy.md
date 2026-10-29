# Customer answers from validated knowledge

Knowledge turns use the production route's `createKnowledgeGroundingTransform`,
not the provider's final prose. It buffers model text, validates current tool
results, composes an answer and emits validated source parts after `text-end`.
The drawer shows the deduplicated Sources footer after completion. Ordinary
clarification can retain model prose. This boundary continues to reject provider
sources, expired approvals, mismatched revisions and unverified historical tool
parts.

## Ownership

- `knowledge-answer-intent.ts`: bounded customer-intent classification and answer
  policy version. Customer history supplies intent/context, never capabilities.
- `knowledge-fact-selection.ts`: selects relevant fact fields and retains safety
  conditions. Compound or full-specification requests preserve the complete
  bounded inventory; conflicting claims are compared before presentation.
- `knowledge-claim-presentation.ts`: explicit reviewed presentation pairs for
  existing claims. Each pair requires the exact source URL, field and entire
  approved value. These are paraphrases of existing claims, not replacement
  evidence or a second approval source. Added qualifications, different sources
  and unmatched wording retain their original text. Original source quotations,
  document/revision identities, scope, approval and expiry are unchanged.
- `knowledge-summary.ts`: combines selected claims, relevant unknowns, scope and
  safe next steps. No model prose or unsupported settings cross this boundary.
- `prompt-management.ts`: fetches the labelled Langfuse system prompt when
  configured, falls back to local style, and appends code-owned safeguards to
  both. Changing remote style alone cannot change the fact composer.

The initial reviewed presentation pairs cover Magigoo Original's material/glass
scope and cooling-release claim, and Dragonfly BMS's copper-alloy construction
claim. The advertised 500°C component claim retains its attribution and the
installed-printer safety distinction. The material/surface presenter narrows only
that exact reviewed material list; it does not parse arbitrary prose into new
capabilities. Unknown materials, coatings, surfaces and variants are not inferred
from a similar name. Missing application instructions never become invented
amounts, layers, temperatures or procedures.

For broader content, prefer direct customer-facing fact values during normal
content review, keeping quotations in `evidence_excerpt` and source text. This PR
publishes no CMS records, renews no approvals and adds no knowledge. Any content
refresh requires its normal source/revision/identity review and separate
publication approval. Unrecognized statements can still sound document-centric;
this bounded presenter is not general semantic synthesis.

## Examples with the existing approved fixture

Customer: "I'm printing PETG on glass. Is Magigoo Original suitable?"

Before: product heading, unrelated unknown colour/kit/revision/price fields,
"Magigoo describes Original…", the complete material list and cooling claim,
then a request for a manual/model number.

After: "Magigoo Original is designed and tested for PETG on glass build plates."
The material-scope source is a separate final source part.

Follow-up: "What about TPU?"

After fresh catalogue and knowledge retrieval: "Magigoo Original is designed
and tested for TPU on glass build plates." The glass context comes from customer
text; the capability comes from current validated evidence.

Customer: "Will Magigoo Original work on textured PEI?"

After: explain that compatibility with textured PEI cannot be confirmed, state
the supported glass scope, and direct the customer to the adhesive and plate
manufacturers' compatibility guidance. Do not treat glass testing as PEI testing.

Customer: "How much Magigoo Original should I apply?"

After: "I can't confirm the application amount or procedure for Magigoo Original
50ml Bed Adhesive. Check its application instructions before applying it."
No source is emitted as evidence of application instructions when no such fact
was returned.

Customer: "Will a Dragonfly BMS fit my printer?" / "Can I print PETG with a
Dragonfly BMS?"

After: state the specific unresolved fit/material requirement and ask for the
printer/hotend setup. Do not substitute copper-alloy finish data or an extreme
component rating for installation or filament compatibility evidence.

Customer: "Can I run my Dragonfly BMS at 500°C?"

The existing component-versus-installed-system response and heater, sensor,
wiring and firmware unknowns remain. This is a boundary test, not normal printing
advice; no typical temperatures or explanation of the manufacturer's motives are
invented.

## Evaluation and observability

Seven everyday release cases supplement the three temperature boundary cases.
Natural customer text contains no rubric or evidence instructions. Required
answer-behaviour patterns and a maximum question count now affect pass/fail,
while existing keyword, forbidden-claim and tool checks remain. These deterministic
grades catch known failures; they do not prove semantic entailment or replace
human review of usefulness. Supported-fact cases deliberately fail if their live
corpus premise is unavailable, rather than relaxing the rubric to accept a refusal.

Trace metadata adds `answer_policy_version` and
`answer_origin=validated_claim_composer|model|response_limit` to distinguish the
final composer from the recorded system prompt version. No extra customer data,
credentials or test-only telemetry integration is introduced. Existing tracing
configuration is still required; mocked metadata assertions are not proof of
live Langfuse ingestion.

Before release, review the draft and its CI, then approve merge/deployment and a
bounded natural-question live run separately. Verify exact deployed SHA, prompt
source/label/version, answer policy/origin, current evidence availability, final
visible text and actual Langfuse ingestion. This draft makes no provider calls
and does not publish a remote prompt, change model, enable a scheduler or deploy.
