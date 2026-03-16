# Use Cases

## 1) Coding Agent in a Monorepo

Problem: agent proposes broad refactors with unclear impact.

With `planfile`:
- Agent emits file + command operations
- Reviewer inspects risk, touched paths, and the deterministic plan hash
- Approval is bound to that exact hash
- Apply refuses if the plan file changes after approval

## 2) Ops Runbook Automation

Problem: operational scripts run with too much implicit behavior.

With `planfile`:
- Command steps are explicit and ordered
- Preconditions ensure environment sanity
- Approval gate prevents accidental prod execution

## 3) CI Guardrail for Agent PRs

Problem: hard to enforce consistent review of autonomous side effects.

With `planfile`:
- CI validates plan structure and risk
- PR includes machine-readable intent artifact (`inspect-plan --json`)
- Merge rules require plan approval status

See: `docs/github-pr-gate-example.md` for a copy-paste workflow.

## 4) Security/Compliance Audit Trail

Problem: proving intent and authorization post-incident is expensive.

With `planfile`:
- Plan + approval + apply report become durable records
- Reviewers can reconstruct what was intended vs executed

## Why Teams Adopt It

- Faster agent velocity with explicit guardrails
- Better trust between operators, reviewers, and agent builders
- A portable artifact format that can integrate with policy engines later
