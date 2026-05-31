import { describe, expect, test, vi } from "vitest";
import type { AiProvider } from "@/lib/ai/provider";
import { analyzePrContext } from "@/lib/analysis/analyzer";
import type { PrAnalysisContext } from "@/lib/analysis/context-builder";
import type { AiReviewReport } from "@/lib/report/schema";
import { makeValidReport } from "@/tests/fixtures/report-fixtures";

const context: PrAnalysisContext = {
  pr: {
    title: "Add auth guard",
    body: "Protect admin routes",
    author: "octocat",
    avatarUrl: "https://avatars.githubusercontent.com/u/583231?v=4",
    url: "https://github.com/acme/app/pull/12",
    baseRef: "main",
    headRef: "feature/auth-guard",
    state: "open"
  },
  files: [
    {
      filename: "app/admin/page.tsx",
      status: "modified",
      additions: 20,
      deletions: 4,
      changes: 24,
      patch: "@@ -1 +1 @@\n+export function AdminPage() {}",
      riskHints: []
    }
  ],
  commits: [{ sha: "abc123", message: "feat: add auth guard" }],
  stats: { changedFiles: 1, additions: 20, deletions: 4, changes: 24 }
};

const validReport: AiReviewReport = makeValidReport();

const groupedContext: PrAnalysisContext = {
  ...context,
  contextBundle: {
    pr: context.pr,
    stats: context.stats,
    groups: [
      {
        id: "admin",
        name: "后台权限",
        priority: "high",
        reviewPrompts: ["确认后台入口权限"],
        files: [
          {
            filename: "app/admin/page.tsx",
            status: "modified",
            additions: 20,
            deletions: 4,
            changes: 24,
            patch: "@@ -1 +1 @@\n+export function AdminPage() {}",
            includedInPrompt: true,
            truncated: false,
            riskHints: [],
            matchedBy: ["path"],
            matchedRules: ["path:app/admin/**"]
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

describe("analyzePrContext", () => {
  test("调用传入的 provider，并返回通过 schema 校验的报告", async () => {
    const provider: AiProvider = {
      analyze: vi.fn().mockResolvedValue(validReport)
    };

    const result = await analyzePrContext(context, provider);

    expect(provider.analyze).toHaveBeenCalledWith(context);
    expect(result).toEqual(validReport);
  });

  test("provider 返回非法报告时抛出 schema 校验错误", async () => {
    const provider: AiProvider = {
      analyze: vi.fn().mockResolvedValue({ summary: { title: "" } })
    };

    await expect(analyzePrContext(context, provider)).rejects.toThrow();
  });

  test("provider 返回缺失分组时补齐分组并记录限制", async () => {
    const provider: AiProvider = {
      analyze: vi.fn().mockResolvedValue(validReport)
    };

    const result = await analyzePrContext(groupedContext, provider);

    expect(result.groupAnalyses).toHaveLength(1);
    expect(result.groupAnalyses[0]).toMatchObject({
      groupId: "admin",
      groupName: "后台权限",
      priority: "high",
      changedFiles: [],
      keyRisks: [],
      reviewSuggestions: []
    });
    expect(result.contextNotes.limitations).toContain(
      "AI 未返回分组 admin，已补充为空分组。"
    );
  });
});
