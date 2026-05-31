import type { PrAnalysisContext } from "@/lib/analysis/context-builder";
import type { AiReviewReport } from "@/lib/report/schema";

type GroupContractIndex = {
  expectedGroupIds: Set<string>;
  expectedFilesByGroup: Map<string, Set<string>>;
  allChangedFiles: Set<string>;
};

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

export function normalizeGroupAnalysisContract(
  report: AiReviewReport,
  context: PrAnalysisContext
): AiReviewReport {
  const groups = context.contextBundle?.groups;
  if (!groups?.length) {
    return report;
  }

  const index = buildGroupContractIndex(context);
  const limitations: string[] = [];
  const knownGroupAnalyses = report.groupAnalyses
    .filter((groupAnalysis) => {
      const known = index.expectedGroupIds.has(groupAnalysis.groupId);
      if (!known) {
        limitations.push(`AI 输出了未知分组 ${groupAnalysis.groupId}，已忽略。`);
      }
      return known;
    })
    .map((groupAnalysis) => {
      const expectedFiles =
        index.expectedFilesByGroup.get(groupAnalysis.groupId) ?? new Set();
      const invalidFiles = new Set<string>();
      const changedFiles = groupAnalysis.changedFiles.filter((filename) =>
        keepGroupFileReference(filename, expectedFiles, invalidFiles)
      );
      const keyRisks = groupAnalysis.keyRisks.filter((risk) =>
        keepGroupFileReference(risk.file, expectedFiles, invalidFiles)
      );
      const reviewSuggestions = groupAnalysis.reviewSuggestions.filter(
        (suggestion) =>
          keepGroupFileReference(suggestion.file, expectedFiles, invalidFiles)
      );

      const groupLimitations = [...groupAnalysis.limitations];
      if (invalidFiles.size > 0) {
        groupLimitations.push(
          `AI 引用了不属于该分组的文件，已从该分组结果中移除：${Array.from(
            invalidFiles
          ).join(", ")}`
        );
      }

      return {
        ...groupAnalysis,
        changedFiles,
        keyRisks,
        reviewSuggestions,
        limitations: dedupeStrings(groupLimitations)
      };
    });

  const groupAnalysisById = new Map(
    knownGroupAnalyses.map((groupAnalysis) => [
      groupAnalysis.groupId,
      groupAnalysis
    ])
  );
  const normalizedGroupAnalyses = groups.map((group) => {
    const existing = groupAnalysisById.get(group.id);
    if (existing) return existing;

    limitations.push(`AI 未返回分组 ${group.id}，已补充为空分组。`);
    return {
      groupId: group.id,
      groupName: group.name,
      priority: group.priority,
      summary: "模型未返回该分组分析，已由系统补充为空结果。",
      changedFiles: [],
      keyRisks: [],
      reviewSuggestions: [],
      contextUsed: [],
      limitations: ["模型未返回该分组分析，已由系统补充为空结果。"]
    };
  });

  return {
    ...report,
    reviewFocus: report.reviewFocus.filter((focus) =>
      index.allChangedFiles.has(focus.file)
    ),
    risks: report.risks.filter((risk) => index.allChangedFiles.has(risk.file)),
    suggestions: report.suggestions.filter((suggestion) =>
      index.allChangedFiles.has(suggestion.file)
    ),
    groupAnalyses: normalizedGroupAnalyses,
    contextNotes: {
      ...report.contextNotes,
      limitations: dedupeStrings([
        ...report.contextNotes.limitations,
        ...limitations
      ])
    }
  };
}

function buildGroupContractIndex(context: PrAnalysisContext): GroupContractIndex {
  const groups = context.contextBundle?.groups ?? [];
  return {
    expectedGroupIds: new Set(groups.map((group) => group.id)),
    expectedFilesByGroup: new Map(
      groups.map((group) => [
        group.id,
        new Set(group.files.map((file) => file.filename))
      ])
    ),
    allChangedFiles: new Set(context.files.map((file) => file.filename))
  };
}

function keepGroupFileReference(
  filename: string,
  expectedFiles: Set<string>,
  invalidFiles: Set<string>
): boolean {
  if (expectedFiles.has(filename)) {
    return true;
  }

  invalidFiles.add(filename);
  return false;
}

function dedupeStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}
