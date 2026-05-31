import type { AiProvider } from "@/lib/ai/provider";
import { analyzePrContext } from "@/lib/analysis/analyzer";
import type { PrAnalysisContext } from "@/lib/analysis/context-builder";
import type {
  AiModelConfig,
  LingQiConfig,
  ReviewerConfig,
  ReviewerRole,
  ReviewerTrigger
} from "@/lib/config/schema";
import type { AiReviewReport } from "@/lib/report/schema";

type EnvLike = Record<string, string | undefined>;

export type ReviewerAnalysis = {
  reviewerId: string;
  reviewerName: string;
  role: ReviewerRole;
  model: string;
  trigger: ReviewerTrigger;
  summary: string;
  riskCount: number;
  suggestionCount: number;
  limitations: string[];
};

export type RunReviewersOptions = {
  config: LingQiConfig;
  context: PrAnalysisContext;
  reviewerIds?: string[];
  env?: EnvLike;
  createAiProviderFromConfig: (options: {
    ai: AiModelConfig;
    env: EnvLike;
  }) => AiProvider;
  analyzePrContext?: (
    context: PrAnalysisContext,
    provider: AiProvider
  ) => Promise<AiReviewReport>;
};

export type RunReviewersResult = {
  report: AiReviewReport;
  reviewerAnalyses: ReviewerAnalysis[];
};

type RunnableReviewer = ReviewerConfig & {
  ai: AiModelConfig;
};

const HIGH_RISK_SEVERITIES = new Set(["blocker", "major"]);

export async function runReviewers({
  config,
  context,
  reviewerIds,
  env = process.env,
  createAiProviderFromConfig,
  analyzePrContext: analyze = analyzePrContext
}: RunReviewersOptions): Promise<RunReviewersResult> {
  const reviewers = resolveRunnableReviewers(config, reviewerIds);
  const isManualSelection = Boolean(reviewerIds?.length);
  const reviewerAnalyses: ReviewerAnalysis[] = [];
  let mergedReport: AiReviewReport | undefined;

  for (const reviewer of reviewers) {
    if (!shouldRunReviewer(reviewer, mergedReport, isManualSelection)) {
      continue;
    }

    const provider = createAiProviderFromConfig({
      ai: reviewer.ai,
      env
    });
    const report = await analyze(
      withReviewerInstructions(context, reviewer),
      provider
    );
    mergedReport = mergedReport
      ? mergeReports(mergedReport, report)
      : report;
    reviewerAnalyses.push(buildReviewerAnalysis(reviewer, report));
  }

  if (!mergedReport) {
    throw new Error("没有可执行的 AI reviewer，请检查 reviewers 配置");
  }

  return {
    report: withModelStrategy(mergedReport, reviewerAnalyses),
    reviewerAnalyses
  };
}

function resolveRunnableReviewers(
  config: LingQiConfig,
  reviewerIds?: string[]
): RunnableReviewer[] {
  const allReviewers = config.reviewers.map((reviewer) => ({
    ...reviewer,
    ai: {
      provider: reviewer.provider,
      model: reviewer.model,
      apiKeyEnv: reviewer.apiKeyEnv,
      temperature: config.ai.temperature,
      maxOutputTokens: config.ai.maxOutputTokens,
      timeoutMs: config.ai.timeoutMs,
      strictSchema: config.ai.strictSchema
    }
  }));

  if (reviewerIds?.length) {
    const selectedIds = new Set(reviewerIds);
    const unknownIds = reviewerIds.filter(
      (id) => !allReviewers.some((reviewer) => reviewer.id === id)
    );
    if (unknownIds.length > 0) {
      throw new Error(`未知 AI reviewer：${unknownIds.join(", ")}`);
    }

    const disabledIds = allReviewers
      .filter((reviewer) => selectedIds.has(reviewer.id) && !reviewer.enabled)
      .map((reviewer) => reviewer.id);
    if (disabledIds.length > 0) {
      throw new Error(`AI reviewer 未启用：${disabledIds.join(", ")}`);
    }

    return allReviewers.filter((reviewer) => selectedIds.has(reviewer.id));
  }

  const configuredReviewers = allReviewers
    .filter((reviewer) => reviewer.enabled)
    .filter((reviewer) => reviewer.trigger !== "manual");

  if (configuredReviewers.length > 0) {
    return configuredReviewers;
  }

  if (config.reviewers.length > 0) {
    return [];
  }

  return [
    {
      id: "default-ai",
      name: "默认 AI reviewer",
      role: "fast",
      enabled: true,
      provider: config.ai.provider,
      model: config.ai.model,
      apiKeyEnv: config.ai.apiKeyEnv,
      trigger: "always",
      focus: ["summary", "risk", "suggestion"],
      ai: config.ai
    }
  ];
}

function shouldRunReviewer(
  reviewer: RunnableReviewer,
  currentReport: AiReviewReport | undefined,
  isManualSelection: boolean
) {
  if (isManualSelection) {
    return true;
  }

  if (reviewer.trigger === "manual") {
    return false;
  }

  if (reviewer.trigger === "always") {
    return true;
  }

  return currentReport ? hasHighRiskSignal(currentReport) : false;
}

function hasHighRiskSignal(report: AiReviewReport) {
  return (
    report.risks.some(
      (risk) =>
        HIGH_RISK_SEVERITIES.has(risk.severity) ||
        risk.confidence === "low"
    ) ||
    report.suggestions.some(
      (suggestion) =>
        HIGH_RISK_SEVERITIES.has(suggestion.severity) ||
        suggestion.confidence === "low"
    )
  );
}

function withReviewerInstructions(
  context: PrAnalysisContext,
  reviewer: RunnableReviewer
): PrAnalysisContext {
  const reviewerPrompt = [
    `当前 reviewer：${reviewer.name}`,
    `reviewer 角色：${reviewer.role}`,
    reviewer.focus.length > 0
      ? `reviewer 关注点：${reviewer.focus.join("、")}`
      : undefined
  ]
    .filter(Boolean)
    .join("\n");

  return {
    ...context,
    userPrompt: context.userPrompt
      ? `${context.userPrompt}\n\n${reviewerPrompt}`
      : reviewerPrompt
  };
}

function mergeReports(
  baseReport: AiReviewReport,
  nextReport: AiReviewReport
): AiReviewReport {
  return {
    ...baseReport,
    reviewFocus: dedupeBy(
      [...baseReport.reviewFocus, ...nextReport.reviewFocus],
      (item) => `${item.priority}|${item.file}|${item.reason}`
    ),
    risks: dedupeBy(
      [...baseReport.risks, ...nextReport.risks],
      (risk) =>
        [
          risk.severity,
          risk.confidence,
          risk.category,
          risk.file,
          risk.line ?? "file",
          risk.title
        ].join("|")
    ),
    suggestions: dedupeBy(
      [...baseReport.suggestions, ...nextReport.suggestions],
      (suggestion) =>
        [
          suggestion.severity,
          suggestion.confidence,
          suggestion.file,
          suggestion.line ?? "file",
          suggestion.problem
        ].join("|")
    ),
    groupAnalyses: dedupeBy(
      [...baseReport.groupAnalyses, ...nextReport.groupAnalyses],
      (group) => `${group.groupId}|${group.summary}`
    ),
    contextNotes: {
      contextUsed: dedupeStrings([
        ...baseReport.contextNotes.contextUsed,
        ...nextReport.contextNotes.contextUsed
      ]),
      limitations: dedupeStrings([
        ...baseReport.contextNotes.limitations,
        ...nextReport.contextNotes.limitations
      ]),
      modelStrategy: baseReport.contextNotes.modelStrategy
    }
  };
}

function buildReviewerAnalysis(
  reviewer: RunnableReviewer,
  report: AiReviewReport
): ReviewerAnalysis {
  return {
    reviewerId: reviewer.id,
    reviewerName: reviewer.name,
    role: reviewer.role,
    model: reviewer.model,
    trigger: reviewer.trigger,
    summary: report.summary.overview,
    riskCount: report.risks.length,
    suggestionCount: report.suggestions.length,
    limitations: report.contextNotes.limitations
  };
}

function withModelStrategy(
  report: AiReviewReport,
  reviewerAnalyses: ReviewerAnalysis[]
): AiReviewReport {
  const reviewerSummary = reviewerAnalyses
    .map(
      (analysis) =>
        `${analysis.reviewerName}(${analysis.role}/${analysis.model}/${analysis.trigger})`
    )
    .join("；");

  return {
    ...report,
    contextNotes: {
      ...report.contextNotes,
      modelStrategy: reviewerSummary
        ? `${report.contextNotes.modelStrategy}；多 reviewer 执行：${reviewerSummary}`
        : report.contextNotes.modelStrategy
    }
  };
}

function dedupeBy<T>(items: T[], buildKey: (item: T) => string): T[] {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = buildKey(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function dedupeStrings(items: string[]): string[] {
  return [...new Set(items)];
}
