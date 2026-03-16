# Signed Approvals / Attestations (Phase 1)

Gatefile supports optional Ed25519 approval attestations to add cryptographic proof of approval identity on top of hash-bound approval.

## Model

- Existing behavior remains: approval is still bound to `approval.approvedPlanHash`.
- New optional field: `approval.attestation`.
- Attestation signs approval payload fields (`planId`, `approvedBy`, `approvedAt`, `approvedPlanHash`).
- `verify-plan` marks identity as:
  - `unsigned`: approved without attestation
  - `signed`: attestation present and valid
  - `invalid-attestation`: attestation present but invalid

If an attestation exists and fails verification, plan status is `not-ready` and `apply-plan` refuses execution.

## CLI

```bash
# Generate local Ed25519 keypair
# (private key must stay private and should not be committed)
gatefile generate-attestation-key \
  --out-private .gatefile/approver.pem \
  --out-public .gatefile/approver.pub.pem

# Approve and attach attestation
gatefile approve-plan .plan/plan.json \
  --by steve \
  --signing-key .gatefile/approver.pem
```

You can optionally override the derived key ID:

```bash
gatefile approve-plan .plan/plan.json --by steve --signing-key .gatefile/approver.pem --key-id security-team-prod-1
```

## Scope in Phase 1

- Real local cryptography and signature verification are implemented.
- Key distribution, trust policy, and enterprise key custody (KMS/HSM/PKI) are intentionally deferred.
