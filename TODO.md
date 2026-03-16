# Roadmap

This project stays intentionally MVP-sized: local CLI, schema-backed plans, hash-bound approvals, and verification before apply.

## Public Launch (MVP)

1. Add `planfile inspect-plan --json` for machine-readable CI and policy checks.
2. Add dry-run previews for file operations before apply.
3. Harden command execution controls (allowlist/denylist and timeout defaults).
4. Expand tests around failed apply paths and command precondition failures.
5. Document a practical GitHub PR gate flow using `verify-plan`.
6. Publish one end-to-end demo from plan creation through rejected/approved apply.

## After Launch (Small Backlog)

1. Add rollback guidance for multi-step apply failures.
2. Introduce policy hook interfaces (`beforeApprove`, `beforeApply`).
3. Add extension points for signing/attestation workflows.
