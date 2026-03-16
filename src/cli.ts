#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { applyPlan } from "./applier";
import { approvePlan, createPlanFromDraft, PlanDraft } from "./planner";
import { PlanFile } from "./types";
import { computePlanHash } from "./hash";
import { verifyPlan } from "./verify";

function readJson<T>(path: string): T {
  const full = resolve(path);
  return JSON.parse(readFileSync(full, "utf-8")) as T;
}

function writeJson(path: string, value: unknown): void {
  const full = resolve(path);
  writeFileSync(full, JSON.stringify(value, null, 2) + "\n", "utf-8");
}

function arg(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function usage(): void {
  console.log(`planfile commands:
  create-plan --from <draft.json> --out <plan.json>
  inspect-plan <plan.json>
  verify-plan <plan.json>
  approve-plan <plan.json> --by <name>
  apply-plan <plan.json> [--yes]`);
}

function inspect(plan: PlanFile): void {
  const currentHash = computePlanHash(plan);
  const recordedPlanHash = plan.integrity?.planHash;
  const integrityMatches = recordedPlanHash === currentHash;
  const approvalBound =
    plan.approval.status === "approved" &&
    plan.approval.approvedPlanHash === currentHash;

  console.log(
    JSON.stringify(
      {
        id: plan.id,
        summary: plan.summary,
        source: plan.source,
        operationCount: plan.operations.length,
        risk: plan.risk,
        integrity: {
          ...plan.integrity,
          planHash: recordedPlanHash ?? null,
          currentPlanHash: currentHash,
          integrityMatches
        },
        approval: {
          ...plan.approval,
          boundToCurrentPlan: approvalBound
        }
      },
      null,
      2
    )
  );
}

async function main(): Promise<void> {
  const cmd = process.argv[2];
  if (!cmd) {
    usage();
    process.exit(1);
  }

  if (cmd === "create-plan") {
    const from = arg("--from");
    const out = arg("--out");
    if (!from || !out) throw new Error("create-plan requires --from and --out");

    const draft = readJson<PlanDraft>(from);
    const plan = createPlanFromDraft(draft);
    writeJson(out, plan);
    console.log(`Plan created: ${out}`);
    return;
  }

  if (cmd === "inspect-plan") {
    const planPath = process.argv[3];
    if (!planPath) throw new Error("inspect-plan requires a plan path");
    const plan = readJson<PlanFile>(planPath);
    inspect(plan);
    return;
  }

  if (cmd === "approve-plan") {
    const planPath = process.argv[3];
    const by = arg("--by") ?? "unknown";
    if (!planPath) throw new Error("approve-plan requires a plan path");

    const plan = readJson<PlanFile>(planPath);
    const next = approvePlan(plan, by);
    writeJson(planPath, next);
    console.log(`Plan approved by ${by}: ${planPath}`);
    return;
  }

  if (cmd === "verify-plan") {
    const planPath = process.argv[3];
    if (!planPath) throw new Error("verify-plan requires a plan path");
    const plan = readJson<PlanFile>(planPath);
    console.log(JSON.stringify(verifyPlan(plan), null, 2));
    return;
  }

  if (cmd === "apply-plan") {
    const planPath = process.argv[3];
    const yes = process.argv.includes("--yes");
    if (!planPath) throw new Error("apply-plan requires a plan path");
    if (!yes) throw new Error("Refusing to apply without --yes");

    const plan = readJson<PlanFile>(planPath);
    const report = applyPlan(plan);
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  usage();
  process.exit(1);
}

main().catch((error) => {
  console.error(`Error: ${(error as Error).message}`);
  process.exit(1);
});
