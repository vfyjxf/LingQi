import type { PrAnalysisContext } from "@/lib/analysis/context-builder";
import type {
  AiReviewReport,
  Confidence,
  Severity
} from "@/lib/report/schema";
import type { ReviewDraft, ReviewDraftComment } from "./schema";

type DraftItem = {
  path: string;
  line?: number;
  severity: Severity;
  confidence: Confidence;
  source: ReviewDraftComment["source"];
  body: string;
};

const publishableSeverities = new Set<Severity>([
  "blocker",
  "major",
  "minor"
]);

export function buildReviewDraft(
  report: AiReviewReport,
  context: PrAnalysisContext
): ReviewDraft {
  const changedFiles = new Set(context.files.map((file) => file.filename));
  const commentableLinesByFile = new Map(
    context.files.map((file) => [
      file.filename,
      new Set(file.commentableLines ?? [])
    ])
  );
  const comments = buildDraftItems(report)
    .filter((item) => publishableSeverities.has(item.severity))
    .map((item) => toDraftComment(item, changedFiles, commentableLinesByFile));

  return {
    comments,
    publishableCount: comments.filter((comment) => comment.canPublish).length,
    blockedCount: comments.filter((comment) => !comment.canPublish).length
  };
}

function buildDraftItems(report: AiReviewReport): DraftItem[] {
  return [
    ...report.risks.map((risk): DraftItem => ({
      path: risk.file,
      line: risk.line,
      severity: risk.severity,
      confidence: risk.confidence,
      source: "risk",
      body: [
        `**风险：${risk.title}**`,
        "",
        `证据：${risk.evidence}`,
        "",
        `影响：${risk.impact}`
      ].join("\n")
    })),
    ...report.suggestions.map((suggestion): DraftItem => ({
      path: suggestion.file,
      line: suggestion.line,
      severity: suggestion.severity,
      confidence: suggestion.confidence,
      source: "suggestion",
      body: [
        `**建议：${suggestion.problem}**`,
        "",
        `建议做法：${suggestion.recommendation}`,
        "",
        `原因：${suggestion.rationale}`
      ].join("\n")
    }))
  ];
}

function toDraftComment(
  item: DraftItem,
  changedFiles: Set<string>,
  commentableLinesByFile: Map<string, Set<number>>
): ReviewDraftComment {
  const blockedReason = getBlockedReason(
    item,
    changedFiles,
    commentableLinesByFile
  );

  return {
    path: item.path,
    line: item.line,
    side: "RIGHT",
    body: item.body,
    severity: item.severity as ReviewDraftComment["severity"],
    confidence: item.confidence,
    source: item.source,
    canPublish: !blockedReason,
    ...(blockedReason ? { blockedReason } : {})
  };
}

function getBlockedReason(
  item: DraftItem,
  changedFiles: Set<string>,
  commentableLinesByFile: Map<string, Set<number>>
): string | undefined {
  if (!changedFiles.has(item.path)) {
    return "文件不在本次 PR diff 中";
  }

  if (!item.line) {
    return "缺少可定位行号";
  }

  if (item.confidence === "low") {
    return "置信度不足";
  }

  const commentableLines = commentableLinesByFile.get(item.path);
  if (!commentableLines?.has(item.line)) {
    return "行号不在本次 PR 可评论行中";
  }

  return undefined;
}
