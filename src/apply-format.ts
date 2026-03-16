import { ApplyReport, DryRunReport, RecoveryOperationGuidance } from "./types";

function formatStep(step: RecoveryOperationGuidance): string {
  const target = step.path ? ` (${step.path})` : "";
  return `  - [${step.status}] ${step.operationId}${target}: ${step.guidance}`;
}

export function formatDryRunSummary(report: DryRunReport): string {
  const lines = [
    `Plan: ${report.planId}`,
    `Mode: dry-run preview`,
    `Verification: ${report.verification.status} (approval=${report.verification.approvalStatus})`,
    `Ready To Apply: ${report.verification.readyToApplyFromIntegrityApproval ? "yes" : "no"}`
  ];

  if (report.verification.blockers.length > 0) {
    lines.push(`Blockers: ${report.verification.blockers.join("; ")}`);
  }

  lines.push(`Operations Previewed: ${report.results.length}`);
  if (report.recovery.affectedPaths.length > 0) {
    lines.push(`Affected Paths: ${report.recovery.affectedPaths.join(", ")}`);
  }
  lines.push("Rollback Guidance:");
  for (const step of report.recovery.steps) {
    lines.push(formatStep(step));
  }
  lines.push(`Notes: ${report.recovery.notes.join(" ")}`);
  lines.push("Tip: Omit --human to get machine-readable JSON output.");

  return lines.join("\n");
}

export function formatApplySummary(report: ApplyReport): string {
  const failedCount = report.results.filter((result) => !result.success).length;
  const lines = [
    `Plan: ${report.planId}`,
    `Mode: apply`,
    `Result: ${report.success ? "success" : "failed"}`,
    `Operations Attempted: ${report.recovery.attemptedOperationIds.length}/${report.recovery.attemptedOperationIds.length + report.recovery.pendingOperationIds.length}`,
    `Failures: ${failedCount}`
  ];

  if (report.recovery.failedOperationId) {
    lines.push(`Failed Operation: ${report.recovery.failedOperationId}`);
  }

  if (report.recovery.affectedPaths.length > 0) {
    lines.push(`Affected Paths: ${report.recovery.affectedPaths.join(", ")}`);
  }

  lines.push("Rollback Guidance:");
  for (const step of report.recovery.steps) {
    lines.push(formatStep(step));
  }
  lines.push(`Notes: ${report.recovery.notes.join(" ")}`);
  lines.push("Tip: Omit --human to get machine-readable JSON output.");

  return lines.join("\n");
}
