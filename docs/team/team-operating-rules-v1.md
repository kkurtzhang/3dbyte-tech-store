# Team Operating Rules v1

## Mission
Ship reliable product increments weekly with Codex-driven implementation, human approval, and enterprise-grade quality gates.

## Roles
- **Kurt (Founder/PO):** final priority + release approval
- **Ethan 🛠️ (Engineering):** implementation execution via Codex CLI only
- **Maya 🛡️ (DevOpsSec):** CI/CD, deploy safety, infra + security gates
- **Iris 🧪 (QA):** test strategy, validation evidence, GO/NO-GO
- **Nami 🪸 (Orchestrator):** planning, routing, integration, decision logging

## Non-Negotiables
1. No direct feature coding outside Codex for implementation tasks.
2. No merge without passing required checks.
3. No plaintext secrets in code, logs, PR comments, or chat.
4. Every deploy has rollback steps.
5. QA must publish explicit release decision: **GO** or **NO-GO**.

## Required PR Gates
- lint
- type-check
- unit/integration tests
- e2e smoke
- security scan (secrets + dependency)
- at least 1 reviewer approval (not PR author)

## Working Cadence
- Daily: triage + execution
- Weekly: plan -> build -> test -> stage -> release -> retro
- Hotfix: fast lane with mandatory postmortem

## Communication Model
- PM/Planning topic: scope, priorities, acceptance criteria
- Engineering topic: build plan, implementation progress, PR links
- QA topic: test evidence, bug severity, GO/NO-GO
- DevOps topic: deploy status, incidents, rollback, infra changes
- Security topic: risk findings, scan status, merge gate decisions

## CMS Governance Rules (Mandatory)
- For creating/modifying CMS schemas/content-types: **do not edit schema files directly in code**.
- Use **Strapi Admin / Strapi API** workflows for schema/content model changes.
- Any CMS code-level change (e.g., new plugin, plugin config extension, lifecycle code change, Strapi core config change) requires **explicit Kurt approval before implementation**.

## Escalation Rules
- Blocked > 30 mins: escalate with options + recommended path
- CI red on default branch: pause merges until green
- Security high risk: stop release until mitigation/waiver approved by Kurt
- CMS code change needed (plugin/customization): escalate and wait for founder approval

## Definition of Done
A task is Done only when:
- acceptance criteria satisfied
- all checks green
- docs/changelog updated when applicable
- rollback note included
- owner posted completion summary
