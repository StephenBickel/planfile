# gatefile

[![CI](https://github.com/StephenBickel/gatefile/actions/workflows/ci.yml/badge.svg)](https://github.com/StephenBickel/gatefile/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/gatefile)](https://www.npmjs.com/package/gatefile)

**Terraform for AI agent side effects.**

Your AI agent wants to edit 14 files and run 3 shell commands. Do you trust it?

`gatefile` puts a review gate between what an agent *wants* to do and what it *actually does*. The agent writes a plan. A human (or CI) approves the exact hash. Only then does anything execute. If the plan changes after approval — even one byte — execution refuses.

```
Agent emits plan → Human reviews → Approve hash → Apply with guardrails → Rollback if needed
```

## Who Is This For?

**Engineering teams shipping autonomous agents to production.** Your agent proposes a database migration, a config rewrite, and a deploy script. Today you either babysit every action or trust full-auto. Gatefile is the middle ground: agent-speed planning with human-gated execution.

**DevOps teams building AI-powered CI/CD.** When an agent is part of your pipeline — auto-fix, auto-refactor, auto-migrate — you need a machine-readable checkpoint between "agent proposed this" and "this actually ran." Gatefile is that checkpoint, with a GitHub Action ready to drop into any workflow.

**Regulated industries.** Finance, healthcare, government — anywhere an auditor asks "who authorized this change?" Gatefile's signed attestations give you cryptographic proof of who approved what, when, bound to the exact plan hash.

**Not for you if:** you're a solo developer comfortable with Claude Code or Codex full-auto on low-stakes code. If the blast radius is small and reversible, you don't need governance — just `git revert`.

## How Is This Different?

| | Claude Code / Codex | Git + PR Review | Gatefile |
|---|---|---|---|
| **Scope** | Interactive session approval | Code diffs only | File edits + shell commands + preconditions |
| **Durability** | Disappears with the session | Commit history | Persistent plan artifact on disk |
| **Tamper detection** | None | Git hash (post-merge) | Hash-locked before execution |
| **Identity proof** | None | GitHub commit signing | Ed25519 signed attestation |
| **Audit trail** | Terminal scrollback | PR comments | Structured receipts + snapshots |
| **CI integration** | Manual | Native | Native (GitHub Action included) |
| **Agent-agnostic** | Tied to one agent | N/A | Any agent, any framework |

Claude Code asks "can I run this?" and you click yes. Gatefile makes the "yes" a durable, tamper-evident, auditable artifact.

## Quick Start

```bash
npm install gatefile
```

### See It Work (30 seconds)

```bash
git clone https://github.com/StephenBickel/gatefile.git
cd gatefile && npm install
npm run demo:e2e
```

The demo runs the full flow: create → inspect → verify → approve → dry-run → denied unsafe path → safe apply → PR gate.

### Basic Flow

```bash
# 1. Agent creates a plan declaring its intended side effects
gatefile create-plan --from examples/coding-agent-plan.json --out .plan/plan.json

# 2. Review what it wants to do
gatefile inspect-plan .plan/plan.json

# 3. Machine-readable for CI
gatefile inspect-plan .plan/plan.json --json

# 4. Check integrity
gatefile verify-plan .plan/plan.json

# 5. Preview without executing
gatefile apply-plan .plan/plan.json --dry-run

# 6. Approve — binds to exact plan hash
gatefile approve-plan .plan/plan.json --by steve

# 7. Execute with guardrails
gatefile apply-plan .plan/plan.json --yes

# 8. Roll back file operations if needed
gatefile rollback-apply <receipt-id> --yes
```

### With Signed Approvals

For environments that need cryptographic proof of who approved:

```bash
# Generate a signing key
gatefile generate-attestation-key --out-private .gatefile/approval-key.pem --out-public .gatefile/approval-key.pub.pem

# Approve with signature
gatefile approve-plan .plan/plan.json --by steve --signing-key .gatefile/approval-key.pem

# Validate config + trust policy
gatefile lint-config
```

## Real-World Use Cases

### 1. Coding Agent in a Monorepo

An agent proposes a refactor touching 30 files across 4 packages. Without Gatefile, you either read every diff interactively or trust full-auto. With Gatefile, the agent emits a plan, your tech lead reviews the operation summary and risk scores, approves the hash, and apply executes only what was approved.

### 2. Production Ops Automation

An ops agent wants to rotate configs, restart a service, and validate health. The plan declares the exact file changes, commands, and preconditions (must be on `main`, must have `ALLOW_OPS_APPLY` set). Apply refuses if preconditions fail, and every action is receipted for rollback.

### 3. CI Gate for Agent PRs

An agent opens PRs autonomously. Your CI pipeline runs `gatefile verify-plan` as a required status check. No approved plan, no merge. The PR includes machine-readable intent so reviewers see exactly what will happen — not just what code changed.

### 4. Compliance Audit Trail

Post-incident, the security team needs to prove what was authorized. Gatefile's plan + signed approval + apply receipt + pre-apply snapshot chain gives them a complete, cryptographically verifiable record from intent to execution.

### Agent Adapter

When an external agent emits proposal-style JSON instead of Gatefile's native format:

```bash
gatefile adapt-agent --from examples/agent-adapter-input.json --out .plan/adapter-draft.json
gatefile create-plan --from .plan/adapter-draft.json --out .plan/plan.json
```

See [docs/agent-adapter.md](docs/agent-adapter.md) for supported input formats.

## Safety Guardrails

`apply-plan` enforces multiple safety layers:

| Layer | What it does |
|-------|-------------|
| **Hash binding** | Approval locks to exact plan content — any tampering blocks execution |
| **Signer trust policy** | Trusted signer allowlist via `gatefile.config.json` |
| **File sandboxing** | Writes restricted to workspace root (configurable via `filePolicy.allowedRoots`) |
| **Command policy** | Allow/deny patterns for shell commands |
| **Timeouts** | Default 10s per command, configurable per-operation or plan-wide |
| **Preconditions** | Guard checks (branch, clean tree, env vars) must pass before apply |
| **Policy hooks** | Optional `beforeApprove`/`beforeApply` hooks |
| **Dependencies** | `dependsOn` requires prior successful apply receipts |
| **Dry-run** | Preview everything without executing — works before or after approval |
| **Snapshots + receipts** | Pre-apply file snapshots and structured apply receipts |
| **Rollback** | `rollback-apply` restores files from snapshot (commands are not auto-reverted) |

## GitHub PR Gate

Drop a gatefile check into any CI pipeline:

```yaml
- uses: StephenBickel/gatefile/.github/actions/gatefile-pr-gate@main
  with:
    plan-path: .plan/plan.json
```

See [docs/github-pr-gate-example.md](docs/github-pr-gate-example.md) for full workflow examples, including [CI-native signed approvals](docs/examples/github-native-signed-approval.yml) and [fork-safe signing](docs/examples/github-native-signed-approval-fork-request.yml).

## Config + Hooks

Use `gatefile.config.json` to enforce policy hooks and signer trust:

```json
{
  "hooks": {
    "beforeApprove": { "command": "node ./scripts/before-approve.js" },
    "beforeApply": { "command": "node ./scripts/before-apply.js" }
  },
  "signers": {
    "trustedKeyIds": ["security-team-prod-1"],
    "trustedPublicKeys": ["-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"]
  }
}
```

Hooks receive structured JSON on stdin and env vars (`GATEFILE_HOOK_EVENT`, `GATEFILE_PLAN_ID`, `GATEFILE_PLAN_HASH`, `GATEFILE_REPO_ROOT`). Non-zero exit blocks the action. Validate anytime with `gatefile lint-config`.

## Core Concepts

| Concept | Description |
|---------|------------|
| **Plan** | Immutable JSON artifact describing proposed side effects |
| **Changeset** | File diffs (`create`, `update`, `delete`) and command intents |
| **Risk Profile** | Heuristic score + rationale per operation |
| **Preconditions** | Guards that must pass before apply |
| **Approval** | Hash-bound human or policy gate |
| **Attestation** | Optional Ed25519 signature proving approval identity |
| **Apply Receipt** | Structured record of what executed, for rollback and audit |

## Docs

- [Architecture](docs/architecture.md)
- [Signed Approvals](docs/signed-approvals.md)
- [Agent Adapter](docs/agent-adapter.md)
- [Changeset Spec](docs/changeset-spec.md)
- [JSON Schema](schema/gatefile.schema.json)
- [Use Cases](docs/use-cases.md)
- [GitHub PR Gate](docs/github-pr-gate-example.md)
- [Product Roadmap](docs/product-roadmap.md)

## Roadmap

- [x] CLI with create/inspect/verify/approve/apply
- [x] Hash-bound approval with tamper detection
- [x] Command + file path safety policies
- [x] Dry-run preview mode
- [x] GitHub PR gate action
- [x] Recovery guidance in apply reports
- [x] Agent adapter (`adapt-agent`)
- [x] Policy hooks (`beforeApprove`, `beforeApply`)
- [x] Rollback / pre-apply snapshots
- [x] Plan dependencies (`dependsOn`)
- [x] Signed attestation + signer trust policy
- [ ] Agent SDK integrations (TypeScript, then Python)
- [ ] Policy packs (baseline, strict, regulated)
- [ ] Multi-plan orchestration DAG

See [Product Roadmap](docs/product-roadmap.md) for the full plan and [TODO.md](TODO.md) for near-term execution.

## Contributing

Contributions welcome — especially around agent adapter integrations, real-world use-case feedback, and safer apply strategies.

1. Open an issue (or pick from TODO.md)
2. Keep changes focused and documented
3. Include examples when behavior changes

## License

MIT
