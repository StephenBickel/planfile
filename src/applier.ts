import { execSync } from "node:child_process";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";
import { ApplyOperationResult, ApplyReport, PlanFile } from "./types";
import { checkPreconditions } from "./preconditions";
import { verifyPlan } from "./verify";

function applyFileOperation(op: Extract<PlanFile["operations"][number], { type: "file" }>): ApplyOperationResult {
  try {
    if (op.action === "create" || op.action === "update") {
      mkdirSync(dirname(op.path), { recursive: true });
      writeFileSync(op.path, op.after ?? "", "utf-8");
      return { operationId: op.id, success: true, message: `${op.action} ${op.path}` };
    }

    if (op.action === "delete") {
      // Safe-ish MVP: verify file exists before delete for clearer reporting.
      readFileSync(op.path, "utf-8");
      rmSync(op.path);
      return { operationId: op.id, success: true, message: `delete ${op.path}` };
    }

    return { operationId: op.id, success: false, message: `Unsupported file action` };
  } catch (error) {
    return {
      operationId: op.id,
      success: false,
      message: `File op failed: ${(error as Error).message}`
    };
  }
}

function applyCommandOperation(
  op: Extract<PlanFile["operations"][number], { type: "command" }>
): ApplyOperationResult {
  try {
    execSync(op.command, {
      cwd: op.cwd,
      stdio: "inherit"
    });
    return { operationId: op.id, success: true, message: `command ok: ${op.command}` };
  } catch (error) {
    if (op.allowFailure) {
      return {
        operationId: op.id,
        success: true,
        message: `command failed but allowed: ${(error as Error).message}`
      };
    }

    return {
      operationId: op.id,
      success: false,
      message: `command failed: ${(error as Error).message}`
    };
  }
}

export function applyPlan(plan: PlanFile): ApplyReport {
  const verification = verifyPlan(plan);
  if (!verification.readyToApplyFromIntegrityApproval) {
    throw new Error(`Plan failed verification: ${verification.blockers.join("; ")}`);
  }

  const preflight = checkPreconditions(plan.preconditions);
  if (!preflight.ok) {
    throw new Error(`Preconditions failed: ${preflight.message}`);
  }

  const results: ApplyOperationResult[] = [];

  for (const op of plan.operations) {
    const result = op.type === "file" ? applyFileOperation(op) : applyCommandOperation(op);
    results.push(result);

    if (!result.success) {
      return {
        planId: plan.id,
        appliedAt: new Date().toISOString(),
        success: false,
        results
      };
    }
  }

  return {
    planId: plan.id,
    appliedAt: new Date().toISOString(),
    success: true,
    results
  };
}
