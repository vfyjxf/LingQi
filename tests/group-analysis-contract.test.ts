import { describe, expect, test } from "vitest";
import type { PrAnalysisContext } from "@/lib/analysis/context-builder";
import {
  normalizeGroupAnalysisContract,
  validateGroupAnalysisContract
} from "@/lib/analysis/group-analysis-contract";
import type { AiReviewReport } from "@/lib/report/schema";
import { makeValidReport } from "@/tests/fixtures/report-fixtures";

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

const report: AiReviewReport = makeValidReport({
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
});

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

  test("规整分组输出时过滤跨组文件并记录限制", () => {
    const normalized = normalizeGroupAnalysisContract(
      {
        ...report,
        reviewFocus: [
          { file: "app/auth/guard.ts", reason: "认证改动", priority: "high" },
          { file: "docs/missing.md", reason: "不存在", priority: "low" }
        ],
        risks: [
          {
            severity: "major",
            confidence: "high",
            category: "security",
            file: "app/auth/guard.ts",
            line: 1,
            title: "认证风险",
            evidence: "认证 diff",
            impact: "权限绕过"
          },
          {
            severity: "major",
            confidence: "high",
            category: "security",
            file: "docs/missing.md",
            line: 1,
            title: "不存在文件",
            evidence: "无",
            impact: "无"
          }
        ],
        groupAnalyses: [
          {
            ...report.groupAnalyses[0],
            changedFiles: ["app/auth/guard.ts", "app/api/billing/route.ts"],
            keyRisks: [
              {
                severity: "major",
                confidence: "high",
                category: "security",
                file: "app/api/billing/route.ts",
                line: 1,
                title: "跨组风险",
                evidence: "跨组引用",
                impact: "不应属于认证分组"
              }
            ],
            reviewSuggestions: [
              {
                severity: "major",
                confidence: "high",
                file: "app/auth/guard.ts",
                line: 1,
                problem: "认证建议",
                recommendation: "补充鉴权",
                rationale: "认证文件属于该分组"
              }
            ]
          },
          report.groupAnalyses[1]
        ]
      },
      context
    );

    expect(normalized.reviewFocus).toHaveLength(1);
    expect(normalized.risks).toHaveLength(1);
    expect(normalized.groupAnalyses[0].changedFiles).toEqual([
      "app/auth/guard.ts"
    ]);
    expect(normalized.groupAnalyses[0].keyRisks).toEqual([]);
    expect(normalized.groupAnalyses[0].reviewSuggestions).toHaveLength(1);
    expect(normalized.groupAnalyses[0].limitations.join("\n")).toContain(
      "AI 引用了不属于该分组的文件"
    );
    expect(normalized.contextNotes.limitations).toEqual([]);
  });

  test("规整分组输出时补齐缺失分组并忽略未知分组", () => {
    const normalized = normalizeGroupAnalysisContract(
      {
        ...report,
        groupAnalyses: [
          report.groupAnalyses[0],
          {
            ...report.groupAnalyses[0],
            groupId: "security",
            groupName: "安全"
          }
        ]
      },
      context
    );

    expect(normalized.groupAnalyses.map((group) => group.groupId)).toEqual([
      "auth",
      "billing"
    ]);
    expect(normalized.groupAnalyses[1].changedFiles).toEqual([]);
    expect(normalized.groupAnalyses[1].limitations).toContain(
      "模型未返回该分组分析，已由系统补充为空结果。"
    );
    expect(normalized.contextNotes.limitations.join("\n")).toContain(
      "AI 输出了未知分组 security，已忽略。"
    );
    expect(normalized.contextNotes.limitations.join("\n")).toContain(
      "AI 未返回分组 billing，已补充为空分组。"
    );
  });
});
