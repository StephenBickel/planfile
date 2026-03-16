# TODO (First 10 Issues)

1. Add JSON schema file and CLI validation against schema.
2. Implement deterministic plan hash generation over normalized operations.
3. Add `planfile inspect-plan --json` machine-readable output mode.
4. Build safer command executor with allowlist/denylist and timeout controls.
5. Implement dry-run diff preview for file operations before apply.
6. Add apply rollback strategy for failed multi-step plans.
7. Introduce policy hook interface (`beforeApprove`, `beforeApply`).
8. Add plan signing and verification extension points.
9. Create GitHub Action example for plan approval gate in PR workflows.
10. Add initial unit tests for planner/risk/precondition modules.
