# Roadmap

This project stays intentionally MVP-sized: local CLI, schema-backed plans, hash-bound approvals, and verification before apply.

## Public Launch (MVP)

1. Add dry-run previews for file operations before apply.
2. Harden command execution controls (allowlist/denylist and timeout defaults).
3. Expand tests around failed apply paths and command precondition failures.
4. Publish one end-to-end demo from plan creation through rejected/approved apply.

## Recently Completed

1. Added `planfile inspect-plan --json` for machine-readable CI and policy checks, while keeping concise default human inspect output.
2. Added inspect CLI coverage for both default and `--json` output modes.
3. Documented a practical GitHub PR gate flow using `verify-plan` and uploaded plan artifacts.

## After Launch (Small Backlog)

1. Add rollback guidance for multi-step apply failures.
2. Introduce policy hook interfaces (`beforeApprove`, `beforeApply`).
3. Add extension points for signing/attestation workflows.
