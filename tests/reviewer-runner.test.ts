import { describe, expect, test, vi } from "vitest";
import type { AiProvider } from "@/lib/ai/provider";
import { runReviewers } from "@/lib/ai/reviewer-runner";
import type { PrAnalysisContext } from "@/lib/analysis/context-builder";
import { defaultLingQiConfig } from "@/lib/config/default-config";
import type { LingQiConfig } from "@/lib/config/schema";
import type { AiReviewReport } from "@/lib/report/schema";

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
      patch: "@@ -40,3 +42,4 @@\n const session = getSession();\n+refreshSession(session);",
      numberedPatch:
        "@@ -40,3 +42,4 @@\n  LEFT 40 RIGHT 42 | const session = getSession();\n+ RIGHT 43 | refreshSession(session);",
      commentableLines: [42, 43],
      oldLines: [40],
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

function createReport(
  overrides: Partial<AiReviewReport> = {}
): AiReviewReport {
  return {
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
    risks: [],
    suggestions: [],
    groupAnalyses: [],
    contextNotes: {
      contextUsed: ["PR 元信息", "文件 diff"],
      limitations: ["未读取完整仓库"],
      modelStrategy: "DeepSeek 结构化输出"
    },
    ...overrides
  };
}

function createRisk(severity: "blocker" | "major" | "minor" | "nit") {
  return {
    severity,
    confidence: "high" as const,
    category: "security" as const,
    file: "src/auth/session.ts",
    line: 43,
    title: "刷新 token 前需要确认用户状态",
    evidence: "diff 修改了 refreshSession 分支。",
    impact: "禁用用户可能继续获得新 token。"
  };
}

function createProvider(): AiProvider {
  return {
    analyze: vi.fn()
  };
}

describe("runReviewers", () => {
  test("没有启用 reviewers 时回退到 ai 配置", async () => {
    const config: LingQiConfig = {
      ...defaultLingQiConfig,
      reviewers: []
    };
    const provider = createProvider();
    const createAiProviderFromConfig = vi.fn().mockReturnValue(provider);
    const analyzePrContext = vi.fn().mockResolvedValue(createReport());

    const result = await runReviewers({
      config,
      context,
      env: { DEEPSEEK_API_KEY: "key" },
      createAiProviderFromConfig,
      analyzePrContext
    });

    expect(createAiProviderFromConfig).toHaveBeenCalledWith({
      ai: config.ai,
      env: { DEEPSEEK_API_KEY: "key" }
    });
    expect(result.reviewerAnalyses[0]).toMatchObject({
      reviewerId: "default-ai",
      model: "deepseek-v4-flash",
      trigger: "always"
    });
  });

  test("disabled 和 manual reviewer 不会自动执行", async () => {
    const config: LingQiConfig = {
      ...defaultLingQiConfig,
      reviewers: [
        {
          ...defaultLingQiConfig.reviewers[0],
          enabled: false
        },
        {
          ...defaultLingQiConfig.reviewers[0],
          id: "manual-reviewer",
          name: "手动 reviewer",
          trigger: "manual"
        }
      ]
    };
    const createAiProviderFromConfig = vi.fn().mockReturnValue(createProvider());
    const analyzePrContext = vi.fn().mockResolvedValue(createReport());

    await expect(
      runReviewers({
        config,
        context,
        createAiProviderFromConfig,
        analyzePrContext
      })
    ).rejects.toThrow("没有可执行的 AI reviewer");
    expect(createAiProviderFromConfig).not.toHaveBeenCalled();
  });

  test("执行 reviewer 时会把角色和关注点注入分析上下文", async () => {
    const createAiProviderFromConfig = vi
      .fn()
      .mockReturnValue(createProvider());
    const analyzePrContext = vi.fn().mockResolvedValue(createReport());

    await runReviewers({
      config: defaultLingQiConfig,
      context: {
        ...context,
        userPrompt: "重点检查缓存一致性"
      },
      createAiProviderFromConfig,
      analyzePrContext
    });

    expect(analyzePrContext).toHaveBeenCalledWith(
      expect.objectContaining({
        userPrompt: expect.stringContaining("重点检查缓存一致性")
      }),
      expect.any(Object)
    );
    expect(analyzePrContext).toHaveBeenCalledWith(
      expect.objectContaining({
        userPrompt: expect.stringContaining(
          "当前 reviewer：快速上下文 reviewer"
        )
      }),
      expect.any(Object)
    );
    expect(analyzePrContext).toHaveBeenCalledWith(
      expect.objectContaining({
        userPrompt: expect.stringContaining("reviewer 关注点")
      }),
      expect.any(Object)
    );
  });

  test("high-risk reviewer 在基础报告有高风险时执行", async () => {
    const config: LingQiConfig = {
      ...defaultLingQiConfig,
      reviewers: [
        defaultLingQiConfig.reviewers[0],
        {
          ...defaultLingQiConfig.reviewers[0],
          id: "expert-reviewer",
          name: "专家 reviewer",
          role: "expert",
          model: "deepseek-reasoner",
          trigger: "high-risk"
        }
      ]
    };
    const createAiProviderFromConfig = vi
      .fn()
      .mockReturnValue(createProvider());
    const analyzePrContext = vi
      .fn()
      .mockResolvedValueOnce(createReport({ risks: [createRisk("major")] }))
      .mockResolvedValueOnce(createReport({ risks: [createRisk("minor")] }));

    const result = await runReviewers({
      config,
      context,
      createAiProviderFromConfig,
      analyzePrContext
    });

    expect(analyzePrContext).toHaveBeenCalledTimes(2);
    expect(result.reviewerAnalyses.map((item) => item.reviewerId)).toEqual([
      "fast-reviewer",
      "expert-reviewer"
    ]);
    expect(result.report.risks).toHaveLength(2);
  });

  test("high-risk reviewer 在没有高风险信号时跳过", async () => {
    const config: LingQiConfig = {
      ...defaultLingQiConfig,
      reviewers: [
        defaultLingQiConfig.reviewers[0],
        {
          ...defaultLingQiConfig.reviewers[0],
          id: "expert-reviewer",
          name: "专家 reviewer",
          role: "expert",
          trigger: "high-risk"
        }
      ]
    };
    const createAiProviderFromConfig = vi
      .fn()
      .mockReturnValue(createProvider());
    const analyzePrContext = vi
      .fn()
      .mockResolvedValue(createReport({ risks: [createRisk("minor")] }));

    const result = await runReviewers({
      config,
      context,
      createAiProviderFromConfig,
      analyzePrContext
    });

    expect(analyzePrContext).toHaveBeenCalledTimes(1);
    expect(result.reviewerAnalyses).toHaveLength(1);
  });

  test("合并多个 reviewer 报告时去重风险和建议", async () => {
    const duplicatedRisk = createRisk("major");
    const duplicatedSuggestion = {
      severity: "major" as const,
      confidence: "medium" as const,
      file: "src/auth/session.ts",
      line: 43,
      problem: "刷新 token 时没有重新检查用户状态。",
      recommendation: "刷新前查询用户状态。",
      rationale: "避免已禁用账号继续获得有效会话。"
    };
    const config: LingQiConfig = {
      ...defaultLingQiConfig,
      reviewers: [
        defaultLingQiConfig.reviewers[0],
        {
          ...defaultLingQiConfig.reviewers[0],
          id: "expert-reviewer",
          name: "专家 reviewer",
          role: "expert",
          trigger: "always"
        }
      ]
    };
    const createAiProviderFromConfig = vi
      .fn()
      .mockReturnValue(createProvider());
    const analyzePrContext = vi
      .fn()
      .mockResolvedValueOnce(
        createReport({
          risks: [duplicatedRisk],
          suggestions: [duplicatedSuggestion]
        })
      )
      .mockResolvedValueOnce(
        createReport({
          risks: [duplicatedRisk],
          suggestions: [duplicatedSuggestion]
        })
      );

    const result = await runReviewers({
      config,
      context,
      createAiProviderFromConfig,
      analyzePrContext
    });

    expect(result.report.risks).toHaveLength(1);
    expect(result.report.suggestions).toHaveLength(1);
    expect(result.report.contextNotes.modelStrategy).toContain(
      "多 reviewer 执行"
    );
  });
});
