import { describe, expect, test, vi } from "vitest";
import {
  analyzePullRequest,
  AnalyzePrInputError,
  AnalyzePrUpstreamError
} from "@/lib/api/analyze-pr";
import type { AiProvider } from "@/lib/ai/provider";
import type { PrAnalysisContext } from "@/lib/analysis/context-builder";
import { defaultLingQiConfig } from "@/lib/config/default-config";
import type { GitHubPrData } from "@/lib/github/github-types";
import type { AiReviewReport } from "@/lib/report/schema";

const githubData: GitHubPrData = {
  pullRequest: {
    url: "https://github.com/octocat/hello-world/pull/42",
    number: 42,
    title: "Improve auth flow",
    body: "Update session refresh.",
    author: "octocat",
    avatarUrl: "https://avatars.githubusercontent.com/u/583231?v=4",
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
      patch: "@@ -1,3 +1,5 @@"
    }
  ],
  commits: [{ sha: "abc123", message: "fix auth refresh" }]
};

const context: PrAnalysisContext = {
  pr: {
    title: "Improve auth flow",
    body: "Update session refresh.",
    author: "octocat",
    avatarUrl: "https://avatars.githubusercontent.com/u/583231?v=4",
    url: "https://github.com/octocat/hello-world/pull/42",
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
      patch: "@@ -1,3 +1,5 @@",
      riskHints: ["security"]
    }
  ],
  commits: [{ sha: "abc123", message: "fix auth refresh" }],
  stats: {
    changedFiles: 1,
    additions: 12,
    deletions: 4,
    changes: 16
  }
};

const report: AiReviewReport = {
  summary: {
    title: "更新鉴权流程",
    overview: "本次 PR 更新 session refresh 逻辑。",
    changedModules: ["src/auth/session.ts"],
    testSummary: "未看到测试文件变更。"
  },
  reviewFocus: [
    {
      file: "src/auth/session.ts",
      reason: "鉴权相关逻辑需要优先审查。",
      priority: "high"
    }
  ],
  risks: [
    {
      severity: "major",
      confidence: "high",
      category: "security",
      file: "src/auth/session.ts",
      line: 42,
      title: "刷新 token 前需要确认用户状态",
      evidence: "diff 修改了 refreshSession 分支。",
      impact: "禁用用户可能继续获得新 token。"
    }
  ],
  suggestions: [
    {
      severity: "major",
      confidence: "medium",
      file: "src/auth/session.ts",
      line: 42,
      problem: "刷新 token 时没有重新检查用户状态。",
      recommendation: "刷新前查询用户状态。",
      rationale: "避免已禁用账号继续获得有效会话。"
    }
  ],
  groupAnalyses: [],
  contextNotes: {
    contextUsed: ["PR 元信息", "文件 diff"],
    limitations: ["未读取完整仓库"],
    modelStrategy: "DeepSeek 结构化输出"
  }
};

describe("analyzePullRequest", () => {
  test("缺少 prUrl 时抛出输入错误", async () => {
    await expect(
      analyzePullRequest({
        prUrl: "",
        env: {}
      })
    ).rejects.toBeInstanceOf(AnalyzePrInputError);
  });

  test("非法 PR URL 时抛出输入错误", async () => {
    await expect(
      analyzePullRequest({
        prUrl: "https://example.com/not-pr",
        env: {}
      })
    ).rejects.toBeInstanceOf(AnalyzePrInputError);
  });

  test("正常请求会调用依赖并返回报告和上下文摘要", async () => {
    const provider: AiProvider = {
      analyze: vi.fn().mockResolvedValue(report)
    };
    const dependencies = {
      loadConfig: vi.fn().mockReturnValue(defaultLingQiConfig),
      fetchGitHubPrData: vi.fn().mockResolvedValue(githubData),
      buildPrAnalysisContext: vi.fn().mockReturnValue(context),
      createAiProviderFromConfig: vi.fn().mockReturnValue(provider),
      analyzePrContext: vi.fn().mockResolvedValue(report)
    };

    const result = await analyzePullRequest({
      prUrl: "https://github.com/octocat/hello-world/pull/42",
      env: {
        GITHUB_TOKEN: "github-token",
        DEEPSEEK_API_KEY: "deepseek-key"
      },
      dependencies
    });

    expect(dependencies.fetchGitHubPrData).toHaveBeenCalledWith(
      {
        owner: "octocat",
        repo: "hello-world",
        pullNumber: 42
      },
      { token: "github-token" }
    );
    expect(dependencies.buildPrAnalysisContext).toHaveBeenCalledWith(
      githubData,
      {
        reviewProfile: defaultLingQiConfig.reviewProfile,
        contextConfig: defaultLingQiConfig.context
      }
    );
    expect(dependencies.createAiProviderFromConfig).toHaveBeenCalledWith({
      ai: dependencies.loadConfig().ai,
      env: {
        GITHUB_TOKEN: "github-token",
        DEEPSEEK_API_KEY: "deepseek-key"
      }
    });
    expect(dependencies.analyzePrContext).toHaveBeenCalledWith(
      context,
      provider
    );
    expect(result).toEqual({
      report,
      reviewDraft: {
        comments: [
          {
            path: "src/auth/session.ts",
            line: 42,
            side: "RIGHT",
            body: [
              "**风险：刷新 token 前需要确认用户状态**",
              "",
              "证据：diff 修改了 refreshSession 分支。",
              "",
              "影响：禁用用户可能继续获得新 token。"
            ].join("\n"),
            severity: "major",
            confidence: "high",
            source: "risk",
            canPublish: true
          },
          {
            path: "src/auth/session.ts",
            line: 42,
            side: "RIGHT",
            body: [
              "**建议：刷新 token 时没有重新检查用户状态。**",
              "",
              "建议做法：刷新前查询用户状态。",
              "",
              "原因：避免已禁用账号继续获得有效会话。"
            ].join("\n"),
            severity: "major",
            confidence: "medium",
            source: "suggestion",
            canPublish: true
          }
        ],
        publishableCount: 2,
        blockedCount: 0
      },
      reviewSubmitPlan: {
        owner: "octocat",
        repo: "hello-world",
        pullNumber: 42,
        payload: {
          event: "COMMENT",
          body: [
            "LingQi 已生成本次 Pull Request 的 Review 评论草稿。",
            "",
            "可提交评论：2",
            "已拦截评论：0",
            "",
            "当前结果为 dry-run 预览，尚未写回 GitHub。"
          ].join("\n"),
          comments: [
            {
              path: "src/auth/session.ts",
              line: 42,
              side: "RIGHT",
              body: [
                "**风险：刷新 token 前需要确认用户状态**",
                "",
                "证据：diff 修改了 refreshSession 分支。",
                "",
                "影响：禁用用户可能继续获得新 token。"
              ].join("\n")
            },
            {
              path: "src/auth/session.ts",
              line: 42,
              side: "RIGHT",
              body: [
                "**建议：刷新 token 时没有重新检查用户状态。**",
                "",
                "建议做法：刷新前查询用户状态。",
                "",
                "原因：避免已禁用账号继续获得有效会话。"
              ].join("\n")
            }
          ]
        },
        publishableCount: 2,
        blockedCount: 0,
        blockedComments: [],
        dryRun: true
      },
      context: {
        prUrl: "https://github.com/octocat/hello-world/pull/42",
        author: "octocat",
        avatarUrl: "https://avatars.githubusercontent.com/u/583231?v=4",
        changedFiles: 1,
        additions: 12,
        deletions: 4,
        diffText: [
          "diff --git a/src/auth/session.ts b/src/auth/session.ts",
          "--- a/src/auth/session.ts",
          "+++ b/src/auth/session.ts",
          "@@ -1,3 +1,5 @@"
        ].join("\n"),
        audit: {
          enabled: false,
          totalGroups: 0,
          includedFiles: 0,
          omittedFiles: 0,
          truncatedFiles: 0,
          groups: [],
          omitted: [],
          truncated: [],
          limitations: ["未启用 Review Profile，上下文未按分组预算审计。"]
        }
      }
    });
  });

  test("GitHub 或 AI 失败时包装为上游错误", async () => {
    await expect(
      analyzePullRequest({
        prUrl: "https://github.com/octocat/hello-world/pull/42",
        env: {},
        dependencies: {
          fetchGitHubPrData: vi
            .fn()
            .mockRejectedValue(new Error("GitHub API 请求失败：404"))
        }
      })
    ).rejects.toBeInstanceOf(AnalyzePrUpstreamError);
  });
});
