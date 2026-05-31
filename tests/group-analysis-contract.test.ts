import { describe, expect, test } from "vitest";
import type { PrAnalysisContext } from "@/lib/analysis/context-builder";
import { validateGroupAnalysisContract } from "@/lib/analysis/group-analysis-contract";
import type { AiReviewReport } from "@/lib/report/schema";

const context: PrAnalysisContext = {
  pr: {
    title: "Update auth and billing",
    body: "Change auth guard and billing webhook.",
    author: "octocat",
    avatarUrl: "https://avatars.githubusercontent.com/u/583231?v=4",
    url: "https://github.com/acme/app/pull/12",
    baseRef: "main",
    headRef: "feature/auth-billing",
    state: "open"
  },
  files: [
    {
      filename: "app/auth/guard.ts",
      status: "modified",
      additions: 10,
      deletions: 2,
      changes: 12,
      patch: "@@ auth @@",
      riskHints: ["security"]
    },
    {
      filename: "app/api/billing/route.ts",
      status: "modified",
      additions: 20,
      deletions: 1,
      changes: 21,
      patch: "@@ billing @@",
      riskHints: ["api"]
    }
  ],
  commits: [],
  stats: {
    changedFiles: 2,
    additions: 30,
    deletions: 3,
    changes: 33
  },
  contextBundle: {
    pr: {
      title: "Update auth and billing",
      body: "Change auth guard and billing webhook.",
      author: "octocat",
      avatarUrl: "https://avatars.githubusercontent.com/u/583231?v=4",
      url: "https://github.com/acme/app/pull/12",
      baseRef: "main",
      headRef: "feature/auth-billing",
      state: "open"
    },
    stats: {
      changedFiles: 2,
      additions: 30,
      deletions: 3,
      changes: 33
    },
    groups: [
      {
        id: "auth",
        name: "认证链路",
        priority: "high",
        reviewPrompts: ["确认权限边界"],
        files: [
          {
            filename: "app/auth/guard.ts",
            status: "modified",
            additions: 10,
            deletions: 2,
            changes: 12,
            patch: "@@ auth @@",
            includedInPrompt: true,
            truncated: false,
            riskHints: ["security"],
            matchedBy: ["path"],
            matchedRules: ["path:app/auth/**"]
          }
        ],
        budget: {
          maxFiles: 5,
          maxPatchCharsPerFile: 12000,
          includedFiles: 1,
          omittedFiles: 0
        }
      },
      {
        id: "billing",
        name: "账单链路",
        priority: "medium",
        reviewPrompts: ["确认 webhook 鉴权"],
        files: [
          {
            filename: "app/api/billing/route.ts",
            status: "modified",
            additions: 20,
            deletions: 1,
            changes: 21,
            patch: "@@ billing @@",
            includedInPrompt: true,
            truncated: false,
            riskHints: ["api"],
            matchedBy: ["path"],
            matchedRules: ["path:app/api/billing/**"]
          }
        ],
        budget: {
          maxFiles: 5,
          maxPatchCharsPerFile: 12000,
          includedFiles: 1,
          omittedFiles: 0
        }
      }
    ],
    limitations: []
  }
};

const report: AiReviewReport = {
  summary: {
    title: "更新认证和账单链路",
    overview: "本次 PR 修改认证守卫和账单 webhook。",
    changedModules: ["app/auth/guard.ts", "app/api/billing/route.ts"],
    testSummary: "当前上下文未看到测试文件变更。"
  },
  reviewFocus: [],
  risks: [],
  suggestions: [],
  groupAnalyses: [
    {
      groupId: "auth",
      groupName: "认证链路",
      priority: "high",
      summary: "认证链路修改权限守卫。",
      changedFiles: ["app/auth/guard.ts"],
      keyRisks: [],
      reviewSuggestions: [],
      contextUsed: ["认证链路 diff"],
      limitations: []
    },
    {
      groupId: "billing",
      groupName: "账单链路",
      priority: "medium",
      summary: "账单链路修改 webhook。",
      changedFiles: ["app/api/billing/route.ts"],
      keyRisks: [],
      reviewSuggestions: [],
      contextUsed: ["账单链路 diff"],
      limitations: []
    }
  ],
  contextNotes: {
    contextUsed: ["分组上下文"],
    limitations: [],
    modelStrategy: "按 Review Profile 分组输出"
  }
};

describe("validateGroupAnalysisContract", () => {
  test("分组输出符合上下文契约时返回报告", () => {
    expect(validateGroupAnalysisContract(report, context)).toBe(report);
  });

  test("缺少输入分组时抛出错误", () => {
    expect(() =>
      validateGroupAnalysisContract(
        {
          ...report,
          groupAnalyses: [report.groupAnalyses[0]]
        },
        context
      )
    ).toThrow("AI 分组分析缺少配置中的分组：billing");
  });

  test("包含未知分组时抛出错误", () => {
    expect(() =>
      validateGroupAnalysisContract(
        {
          ...report,
          groupAnalyses: [
            ...report.groupAnalyses,
            {
              ...report.groupAnalyses[0],
              groupId: "security",
              groupName: "安全"
            }
          ]
        },
        context
      )
    ).toThrow("AI 分组分析包含未知分组：security");
  });

  test("分组引用其他分组文件时抛出错误", () => {
    expect(() =>
      validateGroupAnalysisContract(
        {
          ...report,
          groupAnalyses: [
            {
              ...report.groupAnalyses[0],
              changedFiles: ["app/api/billing/route.ts"]
            },
            report.groupAnalyses[1]
          ]
        },
        context
      )
    ).toThrow("AI 分组分析 auth 引用了不属于该分组的文件");
  });
});
