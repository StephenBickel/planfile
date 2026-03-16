import { computePlanHash } from "./hash";
import { PlanFile, VerifyPlanReport } from "./types";

export function verifyPlan(plan: PlanFile): VerifyPlanReport {
  const currentPlanHash = computePlanHash(plan);
  const recordedPlanHash = plan.integrity?.planHash ?? null;
  const approvedPlanHash = plan.approval.approvedPlanHash ?? null;

  const integrityMetadataExists = Boolean(recordedPlanHash);
  const recordedHashMatchesCurrent =
    integrityMetadataExists && recordedPlanHash === currentPlanHash;
  const approvalBoundToCurrentHash =
    plan.approval.status === "approved" && approvedPlanHash === currentPlanHash;

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

  const readyToApplyFromIntegrityApproval =
    integrityMetadataExists && recordedHashMatchesCurrent && approvalBoundToCurrentHash;

  return {
    planId: plan.id,
    summary: plan.summary,
    approvalStatus: plan.approval.status,
    status: readyToApplyFromIntegrityApproval ? "ready" : "not-ready",
    hashes: {
      recordedPlanHash,
      currentPlanHash,
      approvedPlanHash
    },
    checks: {
      integrityMetadataExists,
      recordedHashMatchesCurrent,
      approvalBoundToCurrentHash
    },
    readyToApplyFromIntegrityApproval,
    blockers
  };
}
