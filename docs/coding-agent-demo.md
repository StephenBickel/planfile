# Coding Agent Demo: Verify, Approve, Detect Tampering

This demo shows a realistic handoff between an autonomous coding agent and a human reviewer.

## Scenario

1. Agent proposes exact file/command side effects.
2. Human checks details with `inspect-plan`.
3. Human or CI checks `verify-plan` to decide if the plan is currently safe to apply from an integrity/approval perspective.
4. Human approves.
5. Any post-approval tampering is detected by `verify-plan` and blocked by `apply-plan`.

## Commands

```bash
# Agent phase: create a concrete plan artifact
npm run cli -- create-plan --from examples/coding-agent-plan.json --out .plan/agent-demo.json

# Review phase: inspect readable details
npm run cli -- inspect-plan .plan/agent-demo.json

# Optional CI/policy inspect output
npm run cli -- inspect-plan .plan/agent-demo.json --json

# Verify phase before approval (expected: status "not-ready")
npm run cli -- verify-plan .plan/agent-demo.json

# Approval phase
npm run cli -- approve-plan .plan/agent-demo.json --by steve

# Verify phase after approval (expected: status "ready")
npm run cli -- verify-plan .plan/agent-demo.json
```

## Tampering Check

```bash
# Simulate post-approval mutation
node -e 'const fs=require("fs");const p=".plan/agent-demo.json";const j=JSON.parse(fs.readFileSync(p,"utf8"));j.summary="tampered after approval";fs.writeFileSync(p,JSON.stringify(j,null,2)+"\n");'

# Verify now reports not-ready with hash/approval mismatch blockers
npm run cli -- verify-plan .plan/agent-demo.json

# Apply also fails for the same reason
npm run cli -- apply-plan .plan/agent-demo.json --yes
```

## What `verify-plan` Guarantees

- Integrity metadata exists
- Recorded hash matches current normalized plan content
- Approval is bound to the current hash
- A single boolean (`readyToApplyFromIntegrityApproval`) for "safe to apply right now" from integrity/approval checks

MVP note: this is deterministic local hashing and hash-bound approval, not remote signing or identity attestation.
