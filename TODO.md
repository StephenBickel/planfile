# Roadmap

This project stays intentionally MVP-sized: local CLI, schema-backed plans, hash-bound approvals, and verification before apply.

## Public Launch (MVP)

1. Harden command execution controls (allowlist/denylist and timeout defaults).
2. Expand tests around failed apply paths and command precondition failures.
3. Publish one end-to-end demo from plan creation through rejected/approved apply.
4. Add an optional condensed human formatter for dry-run previews.

## Recently Completed

1. Added `planfile inspect-plan --json` for machine-readable CI and policy checks, while keeping concise default human inspect output.
2. Added inspect CLI coverage for both default and `--json` output modes.
3. Documented a practical GitHub PR gate flow using `verify-plan` and uploaded plan artifacts.
4. Added `apply-plan --dry-run` preview mode that reports planned file/command actions without executing writes, commands, or precondition checks, and includes readiness/verification state even before approval.

## After Launch (Small Backlog)

1. Add rollback guidance for multi-step apply failures.
2. Introduce policy hook interfaces (`beforeApprove`, `beforeApply`).
3. Add extension points for signing/attestation workflows.
