import { describe, expect, test } from "vitest";
import { buildPrAnalysisContext } from "@/lib/analysis/context-builder";
import type { GitHubPrData } from "@/lib/github/github-types";

const githubData: GitHubPrData = {
  pullRequest: {
    url: "https://github.com/octocat/hello-world/pull/42",
    number: 42,
    title: "Improve auth flow",
    body: "This PR updates session refresh.",
    author: "octocat",
    baseRef: "main",
    headRef: "feature/auth-refresh",
    state: "open"
  },
  files: [
    {
      filename: "src/auth/session.ts",
      status: "modified",
      additions: 12,
      deletions: 4,
      changes: 16,
      patch: "@@ token session @@"
    },
    {
      filename: "tests/session.test.ts",
      status: "added",
      additions: 20,
      deletions: 0,
      changes: 20
    }
  ],
  commits: [
    {
      sha: "abc123",
      message: "fix auth refresh"
    }
  ]
};

describe("buildPrAnalysisContext", () => {
  test("构建 PR 基础信息、文件列表、提交记录和统计信息", () => {
    const context = buildPrAnalysisContext(githubData);

    expect(context.pr).toEqual({
      title: "Improve auth flow",
      body: "This PR updates session refresh.",
      author: "octocat",
      url: "https://github.com/octocat/hello-world/pull/42",
      baseRef: "main",
      headRef: "feature/auth-refresh",
      state: "open"
    });
    expect(context.stats).toEqual({
      changedFiles: 2,
      additions: 32,
      deletions: 4,
      changes: 36
    });
    expect(context.commits).toEqual([
      {
        sha: "abc123",
        message: "fix auth refresh"
      }
    ]);
  });

  test("为每个文件附加风险 hints", () => {
    const context = buildPrAnalysisContext(githubData);

    expect(context.files).toEqual([
      {
        filename: "src/auth/session.ts",
        status: "modified",
        additions: 12,
        deletions: 4,
        changes: 16,
        patch: "@@ token session @@",
        riskHints: ["security"]
      },
      {
        filename: "tests/session.test.ts",
        status: "added",
        additions: 20,
        deletions: 0,
        changes: 20,
        riskHints: ["testing"]
      }
    ]);
  });
});
