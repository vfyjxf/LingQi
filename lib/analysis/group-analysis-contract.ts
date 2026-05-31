import type { PrAnalysisContext } from "@/lib/analysis/context-builder";
import type { AiReviewReport } from "@/lib/report/schema";

export function validateGroupAnalysisContract(
  report: AiReviewReport,
  context: PrAnalysisContext
): AiReviewReport {
  const groups = context.contextBundle?.groups;
  if (!groups?.length) {
    return report;
  }

  const expectedGroupIds = new Set(groups.map((group) => group.id));
  const expectedFilesByGroup = new Map(
    groups.map((group) => [
      group.id,
      new Set(group.files.map((file) => file.filename))
    ])
  );

  const reportGroupIds = new Set(
    report.groupAnalyses.map((group) => group.groupId)
  );

  const missingGroupIds = groups
    .map((group) => group.id)
    .filter((groupId) => !reportGroupIds.has(groupId));
  if (missingGroupIds.length > 0) {
    throw new Error(
      `AI 分组分析缺少配置中的分组：${missingGroupIds.join(", ")}`
    );
  }

  const unknownGroupIds = report.groupAnalyses
    .map((group) => group.groupId)
    .filter((groupId) => !expectedGroupIds.has(groupId));
  if (unknownGroupIds.length > 0) {
    throw new Error(`AI 分组分析包含未知分组：${unknownGroupIds.join(", ")}`);
  }

  for (const groupAnalysis of report.groupAnalyses) {
    const expectedFiles = expectedFilesByGroup.get(groupAnalysis.groupId);
    if (!expectedFiles) continue;

    const referencedFiles = new Set([
      ...groupAnalysis.changedFiles,
      ...groupAnalysis.keyRisks.map((risk) => risk.file),
      ...groupAnalysis.reviewSuggestions.map((suggestion) => suggestion.file)
    ]);
    const invalidFiles = Array.from(referencedFiles).filter(
      (filename) => !expectedFiles.has(filename)
    );

    if (invalidFiles.length > 0) {
      throw new Error(
        `AI 分组分析 ${groupAnalysis.groupId} 引用了不属于该分组的文件：${invalidFiles.join(", ")}`
      );
    }
  }

  return report;
}
