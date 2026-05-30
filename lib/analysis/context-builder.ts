import {
  groupChangeFiles,
  type GroupedChangeFile
} from "@/lib/analysis/change-grouper";
import {
  buildPrContextBundle,
  type PrContextBundle
} from "@/lib/analysis/context-bundle";
import type { LingQiConfig, ReviewProfile } from "@/lib/config/schema";
import type { GitHubPrData } from "@/lib/github/github-types";
import { detectRiskHints, type RiskHint } from "./risk-hints";

export type PrAnalysisContext = {
  pr: {
    title: string;
    body: string | null;
    author: string;
    avatarUrl: string;
    url: string;
    baseRef: string;
    headRef: string;
    state: string;
  };
  files: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
    riskHints: RiskHint[];
  }>;
  commits: Array<{
    sha: string;
    message: string;
  }>;
  stats: {
    changedFiles: number;
    additions: number;
    deletions: number;
    changes: number;
  };
  contextBundle?: PrContextBundle;
};

export type BuildPrAnalysisContextOptions = {
  reviewProfile?: ReviewProfile;
  contextConfig?: LingQiConfig["context"];
};

export function buildPrAnalysisContext(
  githubData: GitHubPrData,
  options: BuildPrAnalysisContextOptions = {}
): PrAnalysisContext {
  const files = githubData.files.map((file) => ({
    filename: file.filename,
    status: file.status,
    additions: file.additions,
    deletions: file.deletions,
    changes: file.changes,
    patch: file.patch,
    riskHints: detectRiskHints(file)
  }));

  const context: PrAnalysisContext = {
    pr: {
      title: githubData.pullRequest.title,
      body: githubData.pullRequest.body,
      author: githubData.pullRequest.author,
      avatarUrl: githubData.pullRequest.avatarUrl,
      url: githubData.pullRequest.url,
      baseRef: githubData.pullRequest.baseRef,
      headRef: githubData.pullRequest.headRef,
      state: githubData.pullRequest.state
    },
    files,
    commits: githubData.commits.map((commit) => ({
      sha: commit.sha,
      message: commit.message
    })),
    stats: {
      changedFiles: files.length,
      additions: files.reduce((total, file) => total + file.additions, 0),
      deletions: files.reduce((total, file) => total + file.deletions, 0),
      changes: files.reduce((total, file) => total + file.changes, 0)
    }
  };

  if (!options.reviewProfile || !options.contextConfig) {
    return context;
  }

  const groupedFiles: GroupedChangeFile[] = groupChangeFiles(
    context.files,
    options.reviewProfile
  );

  return {
    ...context,
    contextBundle: buildPrContextBundle({
      pr: context.pr,
      stats: context.stats,
      groupedFiles,
      profile: options.reviewProfile,
      contextConfig: options.contextConfig
    })
  };
}
