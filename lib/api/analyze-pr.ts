import { createAiProviderFromConfig } from "@/lib/ai/provider-factory";
import type { AiProvider } from "@/lib/ai/provider";
import { analyzePrContext } from "@/lib/analysis/analyzer";
import {
  buildPrAnalysisContext,
  type PrAnalysisContext
} from "@/lib/analysis/context-builder";
import { loadLingQiConfig } from "@/lib/config/load-config";
import type { AiModelConfig, LingQiConfig } from "@/lib/config/schema";
import { fetchGitHubPrData } from "@/lib/github/github-client";
import type {
  FetchGitHubPrDataParams,
  GitHubClientOptions,
  GitHubPrData
} from "@/lib/github/github-types";
import { parsePrUrl } from "@/lib/github/parse-pr-url";
import type { AiReviewReport } from "@/lib/report/schema";

type EnvLike = Record<string, string | undefined>;

type AnalyzePullRequestDependencies = {
  loadConfig: () => LingQiConfig;
  fetchGitHubPrData: (
    params: FetchGitHubPrDataParams,
    options: GitHubClientOptions
  ) => Promise<GitHubPrData>;
  buildPrAnalysisContext: (
    githubData: GitHubPrData,
    options: {
      reviewProfile: LingQiConfig["reviewProfile"];
      contextConfig: LingQiConfig["context"];
    }
  ) => PrAnalysisContext;
  createAiProviderFromConfig: (options: {
    ai: AiModelConfig;
    env: EnvLike;
  }) => AiProvider;
  analyzePrContext: (
    context: PrAnalysisContext,
    provider: AiProvider
  ) => Promise<AiReviewReport>;
};

export type AnalyzePullRequestOptions = {
  prUrl: unknown;
  env?: EnvLike;
  dependencies?: Partial<AnalyzePullRequestDependencies>;
};

export type AnalyzePullRequestResult = {
  report: AiReviewReport;
  context: {
    prUrl: string;
    changedFiles: number;
    additions: number;
    deletions: number;
  };
};

export class AnalyzePrInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalyzePrInputError";
  }
}

export class AnalyzePrUpstreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalyzePrUpstreamError";
  }
}

export class AnalyzePrConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalyzePrConfigError";
  }
}

export async function analyzePullRequest({
  prUrl,
  env = process.env,
  dependencies = {}
}: AnalyzePullRequestOptions): Promise<AnalyzePullRequestResult> {
  const prUrlText = validatePrUrlInput(prUrl);
  const parsedPr = parsePrUrlOrThrowInputError(prUrlText);

  const deps: AnalyzePullRequestDependencies = {
    loadConfig,
    fetchGitHubPrData,
    buildPrAnalysisContext,
    createAiProviderFromConfig,
    analyzePrContext,
    ...dependencies
  };

  try {
    const config = deps.loadConfig();
    const githubData = await deps.fetchGitHubPrData(
      {
        owner: parsedPr.owner,
        repo: parsedPr.repo,
        pullNumber: parsedPr.pullNumber
      },
      { token: env.GITHUB_TOKEN?.trim() || undefined }
    );
    const context = deps.buildPrAnalysisContext(githubData, {
      reviewProfile: config.reviewProfile,
      contextConfig: config.context
    });
    const provider = deps.createAiProviderFromConfig({
      ai: config.ai,
      env
    });
    const report = await deps.analyzePrContext(context, provider);

    return {
      report,
      context: {
        prUrl: parsedPr.url,
        changedFiles: context.stats.changedFiles,
        additions: context.stats.additions,
        deletions: context.stats.deletions
      }
    };
  } catch (error) {
    throw classifyAnalyzeError(error);
  }
}

function loadConfig() {
  return loadLingQiConfig();
}

function validatePrUrlInput(prUrl: unknown): string {
  if (typeof prUrl !== "string" || prUrl.trim().length === 0) {
    throw new AnalyzePrInputError("请输入有效的 GitHub Pull Request 链接");
  }

  return prUrl;
}

function parsePrUrlOrThrowInputError(prUrl: string) {
  try {
    return parsePrUrl(prUrl);
  } catch (error) {
    throw new AnalyzePrInputError(
      error instanceof Error
        ? error.message
        : "请输入有效的 GitHub Pull Request 链接"
    );
  }
}

function classifyAnalyzeError(error: unknown): Error {
  if (
    error instanceof AnalyzePrInputError ||
    error instanceof AnalyzePrUpstreamError ||
    error instanceof AnalyzePrConfigError
  ) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);

  if (
    message.includes(".env.local") ||
    message.includes("配置") ||
    message.includes("不支持的 AI provider")
  ) {
    return new AnalyzePrConfigError(message);
  }

  return new AnalyzePrUpstreamError(message);
}
