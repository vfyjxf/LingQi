import { describe, expect, test, vi } from "vitest";
import type { AiProvider } from "@/lib/ai/provider";
import { analyzePrContext } from "@/lib/analysis/analyzer";
import type { PrAnalysisContext } from "@/lib/analysis/context-builder";
import type { AiReviewReport } from "@/lib/report/schema";

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

const validReport: AiReviewReport = {
  summary: {
    title: "新增后台鉴权保护",
    overview: "本次 PR 修改后台页面入口，增加鉴权保护相关逻辑。",
    changedModules: ["app/admin/page.tsx"],
    testSummary: "当前上下文未看到测试文件变更。"
  },
  reviewFocus: [
    {
      file: "app/admin/page.tsx",
      reason: "后台入口属于权限敏感路径。",
      priority: "high"
    }
  ],
  risks: [],
  suggestions: [],
  contextNotes: {
    contextUsed: ["PR 元信息", "文件 diff", "提交信息"],
    limitations: ["未读取完整仓库代码"],
    modelStrategy: "通过 provider 抽象生成结构化 Review 报告"
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
});
