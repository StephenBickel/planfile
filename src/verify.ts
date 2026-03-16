import { computePlanHash } from "./hash";
import { PlanFile, VerifyPlanReport } from "./types";
import { verifyApprovalAttestation } from "./attestation";

export function verifyPlan(plan: PlanFile): VerifyPlanReport {
  const currentPlanHash = computePlanHash(plan);
  const recordedPlanHash = plan.integrity?.planHash ?? null;
  const approvedPlanHash = plan.approval.approvedPlanHash ?? null;

  const integrityMetadataExists = Boolean(recordedPlanHash);
  const recordedHashMatchesCurrent =
    integrityMetadataExists && recordedPlanHash === currentPlanHash;
  const approvalBoundToCurrentHash =
    plan.approval.status === "approved" && approvedPlanHash === currentPlanHash;
  const approvalAttestationPresent = Boolean(plan.approval.attestation);

  let approvalAttestationValid: boolean | null = null;
  let approvalAttestationKeyIdMatches: boolean | null = null;
  let approvalAttestationPayloadMatchesApproval: boolean | null = null;

  if (plan.approval.status === "approved" && plan.approval.attestation) {
    const approvedBy = plan.approval.approvedBy;
    const approvedAt = plan.approval.approvedAt;
    const approvedHash = plan.approval.approvedPlanHash;

    if (approvedBy && approvedAt && approvedHash) {
      const attestationResult = verifyApprovalAttestation(
        {
          planId: plan.id,
          approvedBy,
          approvedAt,
          approvedPlanHash: approvedHash
        },
        plan.approval.attestation
      );
      approvalAttestationValid = attestationResult.valid;
      approvalAttestationKeyIdMatches = attestationResult.keyIdMatchesPublicKey;
      approvalAttestationPayloadMatchesApproval = attestationResult.payloadMatchesApproval;
    } else {
      approvalAttestationValid = false;
      approvalAttestationKeyIdMatches = false;
      approvalAttestationPayloadMatchesApproval = false;
    }
  }

  const blockers: string[] = [];
  if (!integrityMetadataExists) {
    blockers.push("Missing integrity.planHash metadata");
  }
  if (!recordedHashMatchesCurrent) {
    blockers.push("Recorded integrity hash does not match current plan hash");
  }
  if (plan.approval.status !== "approved") {
    blockers.push("Plan is not approved");
  } else if (!approvalBoundToCurrentHash) {
    blockers.push("Approval is not bound to the current plan hash");
  }
  if (approvalAttestationPresent && approvalAttestationValid === false) {
    blockers.push("Approval attestation is invalid for current approval metadata");
  }

  const readyToApplyFromIntegrityApproval =
    integrityMetadataExists &&
    recordedHashMatchesCurrent &&
    approvalBoundToCurrentHash &&
    approvalAttestationValid !== false;

  const approvalIdentity =
    plan.approval.status !== "approved" || !approvalAttestationPresent
      ? "unsigned"
      : approvalAttestationValid
        ? "signed"
        : "invalid-attestation";

  return {
    planId: plan.id,
    summary: plan.summary,
    approvalStatus: plan.approval.status,
    approvalIdentity,
    status: readyToApplyFromIntegrityApproval ? "ready" : "not-ready",
    hashes: {
      recordedPlanHash,
      currentPlanHash,
      approvedPlanHash
    },
    checks: {
      integrityMetadataExists,
      recordedHashMatchesCurrent,
      approvalBoundToCurrentHash,
      approvalAttestationPresent,
      approvalAttestationValid,
      approvalAttestationKeyIdMatches,
      approvalAttestationPayloadMatchesApproval
    },
    readyToApplyFromIntegrityApproval,
    blockers
  };
}
