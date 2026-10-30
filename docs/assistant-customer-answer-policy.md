# Customer answers from validated knowledge

Knowledge turns use `createKnowledgeGroundingTransform` after provider generation.
It validates current tool evidence, composes the visible answer and emits validated
source parts after `text-end`. The drawer renders a deduplicated Sources footer
only after completion. Ordinary clarification can retain model prose. Expired
approvals, mismatched revisions, source/scope inconsistencies and historical client
claims remain excluded. No model prose bypasses this grounding boundary. A default-disabled, separately
reviewed trial can generate and review prose inside the boundary; see
[the trial design and comparison plan](assistant-grounded-synthesis-trial.md).

## Composition and ownership

- `knowledge-answer-intent.ts`: bounded intent selection and policy version.
  Customer history supplies the subject/material/surface question, never evidence
  of a product capability. Material use, printing settings, release behaviour,
  application and fit have distinct decision paths.
- `knowledge-fact-selection.ts`: selects relevant fields and retains safety
  conditions. Full inventories and compound requests preserve their complete
  bounded facts. Original values determine conflicts before presentation.
- `knowledge-claim-presentation.ts`: complete-claim parsing for a small set of
  claim forms: designed/tested material plus surface scope, construction, cooling
  release and stated component heat resistance. Product names, source URLs,
  material lists and numeric ratings are not supplied by the renderer. Names
  must match the current document identity. Unrecognized clauses, negations,
  conditions, links and code keep the original complete statement. The former
  three exact-product/source aliases have been removed.
- `knowledge-customer-guidance.ts`: useful decision steps when a capability or
  procedure is missing. These ask for the required evidence/setup, not approval
  of a product. They assert no missing temperature, compatibility or procedure.
- `knowledge-summary.ts`: combines claims, relevant uncertainty, safe next steps
  and exact scope. A null claim is not converted into a product capability.
- `prompt-management.ts`: fetches the labelled Langfuse style prompt when
  configured and appends code-owned safety/style rules to both remote and fallback
  prompts. Remote style alone cannot change the composer.

This is a bounded typed composer, **not general model synthesis or an entailment
verifier**. It improves predictable customer tasks while retaining a hard factual
boundary. Complete grammar matches prevent arbitrary prefix stripping; they do
not prove that a source is true. Approval, exact identity, current revision and
source validity still belong to existing validation and human content review.
Unknown forms remain conservative and can still sound like source prose.

For general open-ended synthesis, there are two substantive alternatives:

1. Review normalized atomic claims and customer statements as part of content
   preparation, preserving quotations/provenance, then compose a model-selected
   answer plan from those claims. This scales supported intents without allowing
   arbitrary new product assertions. It requires reviewed content contracts;
   style examples alone cannot supply missing knowledge.
2. Allow model prose from a validated evidence pack only after claim-level checks
   of entailment, scope, contradictions, numeric settings and meaningful omitted
   qualifications. Claim IDs or matching keywords alone do not verify a paraphrase.
   This needs a separate verification design and representative live evaluation;
   simply restoring free-form model output would weaken the current safeguards.

Neither alternative is silently enabled here. No new RAG infrastructure, provider
calls, model change, content publication or remote prompt publication is included.

## Representative local regression outputs

Customer: "Can I run my Dragonfly BMS at 500°C?"

Rejected previous answer: "Phaetus advertises a 500°C component rating" followed
by "Installed max temperature remains unknown" and a setup question.

Revised answer:

> The 500°C figure is the hotend's stated heat-resistance rating. It does not
> establish a safe operating temperature for your printer; the heater, sensor,
> wiring and firmware limits still need checking.
>
> Which printer model are you using, and has its hotend setup been modified?

This preserves the distinction between temperature resistance and a verified
installed operating limit, without inventing typical temperatures, interpreting
manufacturer motives or describing all hobby printers as unable to reach 500°C.

Customer: "Can I print PETG with a Dragonfly BMS?"

Revised answer:

> Check the PETG filament's printing requirements against your printer's hotend
> setup before choosing settings.
>
> Which printer model are you using, and is its hotend setup still stock or modified?

This is a useful next check, **not an affirmative PETG compatibility claim**. No
source is emitted as proof of a PETG claim when no such claim was returned. The
copper construction and extreme temperature figure are not substituted for it.
An ordinary PETG temperature question asks for filament brand/grade and printer
setup rather than repeating the hotend's headline rating.

Customer: "Which materials does Magigoo Original support on glass build plates?"

Revised answer:

> Magigoo Original is designed and tested for PLA, ABS, PETG, HIPS and TPU on
> glass build plates.

A PETG-on-glass question selects PETG from that supported scope. "What about TPU?"
re-fetches current evidence and uses the customer's glass context. An explicit PEI
or coated surface replaces that context and requires a separate compatibility
check; absence from a material list is not proof of incompatibility. Missing
application instructions trigger an application-instruction check, never invented
quantities or procedures. Supported cooling-release behaviour is answered directly
when asked, without an unrelated specification dump.

## Specific content gap and proposed separate update

The current approved Dragonfly fixture establishes construction, a stated
component temperature rating and unknown installed limits. It does not supply a
PETG suitability claim, a PETG printing range or a verified printer installation.
The source manual may contain a material list; its existence does not authorize
new live facts or a safe temperature recommendation in this change.

A separate content update should verify the exact BMS manual/model/revision and
stable source, capture its original material-list quote and conditions, and review
a scoped material-compatibility fact. Printing settings and installed limits need
their own explicit evidence; do not infer them from a material list or resistance
rating. Retain source hash, retrieval date, quotations and revision identity, then
seek the normal review/publication approval. This PR does not publish that update
or renew an approval.

## Evaluation and observability

Nine everyday release cases supplement three temperature boundary cases. Natural
customer inputs contain no rubric. Exact before/after assertions cover the quoted
500°C and Magigoo answers; other synthetic products exercise the same claim forms
without product/source aliases. Unknown/expired/conflicting evidence, source order,
variant scope and qualifications remain tested. Graders require relevant decision
steps and explicit unverified hardware checks, not the old refusal vocabulary.
Deterministic patterns still cannot replace human usefulness/entailment review.

`answer_policy_version` identifies this policy; the root assistant observation's
`answer_origin=validated_claim_composer|model|response_limit` identifies the visible
answer path separately from the recorded prompt version. Mocked assertions do not
prove live Langfuse ingestion. Before release, separately approve merge/deployment
and bounded live evaluation, then verify exact SHA, policy/origin, current evidence,
visible answers, final Sources and actual trace ingestion. No live run is claimed.
