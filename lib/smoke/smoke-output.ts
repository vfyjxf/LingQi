import type { AiReviewReport } from "@/lib/report/schema";
import type { ReviewDraft } from "@/lib/review-draft/schema";

export type SmokeOutputInput = {
  mode: "mock" | "real-pr";
  model: string;
  prUrl: string;
  author: string;
  changedFiles: number;
  additions: number;
  deletions: number;
  report: AiReviewReport;
  reviewDraft: ReviewDraft;
};

export function formatSmokeOutput(input: SmokeOutputInput): string {
  const topRisks = input.report.risks.slice(0, 3);
  const groupCount = input.report.groupAnalyses.length;
  const limitations = [
    ...input.report.contextNotes.limitations,
    ...input.report.groupAnalyses.flatMap((group) => group.limitations)
  ].filter(Boolean);

  return [
    "AI smoke 调用成功",
    `模式: ${input.mode === "real-pr" ? "真实 PR" : "Mock PR"}`,
    `模型: ${input.model}`,
    `PR: ${input.prUrl}`,
    `作者: @${input.author}`,
    `变更: ${input.changedFiles} 个文件, +${input.additions} / -${input.deletions}`,
    `标题: ${input.report.summary.title}`,
    `风险数: ${input.report.risks.length}`,
    `建议数: ${input.report.suggestions.length}`,
    `Review 草稿: 可发布 ${input.reviewDraft.publishableCount}, 已拦截 ${input.reviewDraft.blockedCount}`,
    `分组分析: ${groupCount} 个分组`,
    formatTopRisks(topRisks),
    formatLimitations(limitations)
  ]
    .filter(Boolean)
    .join("\n");
}

function formatTopRisks(risks: AiReviewReport["risks"]): string {
  if (risks.length === 0) {
    return "Top 风险: 无";
  }

  return [
    "Top 风险:",
    ...risks.map(
      (risk, index) =>
        `${index + 1}. [${risk.severity}/${risk.confidence}] ${risk.file}${risk.line ? `:${risk.line}` : ""} - ${risk.title}`
    )
  ].join("\n");
}

function formatLimitations(limitations: string[]): string {
  if (limitations.length === 0) {
    return "上下文限制: 无";
  }

  return [
    "上下文限制:",
    ...Array.from(new Set(limitations)).map(
      (limitation, index) => `${index + 1}. ${limitation}`
    )
  ].join("\n");
}
