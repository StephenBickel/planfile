import { Operation, RiskLevel, RiskProfile } from "./types";

function levelFromScore(score: number): RiskLevel {
  if (score >= 8) return "high";
  if (score >= 4) return "medium";
  return "low";
}

export function scoreRisk(operations: Operation[]): RiskProfile {
  let score = 0;
  const reasons: string[] = [];

  for (const op of operations) {
    if (op.type === "file") {
      if (op.action === "delete") {
        score += 3;
        reasons.push(`File delete: ${op.path}`);
      } else if (op.action === "update") {
        score += 1;
      }

      if (op.path.startsWith(".github/") || op.path.includes("/infra/")) {
        score += 2;
        reasons.push(`Sensitive path touched: ${op.path}`);
      }
    }

    if (op.type === "command") {
      score += 2;
      reasons.push(`Command execution: ${op.command}`);

      if (op.command.includes("rm -rf") || op.command.includes("sudo")) {
        score += 4;
        reasons.push(`Potentially destructive command: ${op.command}`);
      }
    }
  }

  return {
    score,
    level: levelFromScore(score),
    reasons
  };
}
