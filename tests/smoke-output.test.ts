import { describe, expect, test } from "vitest";
import { formatSmokeOutput } from "@/lib/smoke/smoke-output";
import type { AiReviewReport } from "@/lib/report/schema";
import type { ReviewDraft } from "@/lib/review-draft/schema";

const report: AiReviewReport = {
  summary: {
    title: "新增 checkout webhook 校验",
    overview: "本次 PR 增加 webhook 签名校验。",
    changedModules: ["app/api/checkout/route.ts"],
    testSummary: "当前上下文未看到测试文件变更。"
  },
  reviewFocus: [],
  risks: [
    {
      severity: "major",
      confidence: "high",
      category: "security",
      file: "app/api/checkout/route.ts",
      line: 12,
      title: "需要校验 webhook 签名",
      evidence: "新增 POST 入口。",
      impact: "未校验请求可能被伪造。"
    }
  ],
  suggestions: [],
  groupAnalyses: [
    {
      groupId: "api",
      groupName: "API",
      priority: "high",
      summary: "新增 webhook 入口。",
      changedFiles: ["app/api/checkout/route.ts"],
      keyRisks: [],
      reviewSuggestions: [],
      contextUsed: ["文件 diff"],
      limitations: ["未读取运行时密钥配置"]
    }
  ],
  contextNotes: {
    contextUsed: ["PR 元信息", "文件 diff"],
    limitations: ["未读取完整仓库"],
    modelStrategy: "结构化输出"
  }
};

const reviewDraft: ReviewDraft = {
  comments: [],
  publishableCount: 1,
  blockedCount: 1
};

describe("formatSmokeOutput", () => {
  test("输出稳定的 smoke 摘要", () => {
    const output = formatSmokeOutput({
      mode: "real-pr",
      model: "deepseek-v4-flash",
      prUrl: "https://github.com/acme/shop/pull/42",
      author: "octocat",
      changedFiles: 1,
      additions: 18,
      deletions: 2,
      report,
      reviewDraft
    });

    expect(output).toContain("AI smoke 调用成功");
    expect(output).toContain("模式: 真实 PR");
    expect(output).toContain("模型: deepseek-v4-flash");
    expect(output).toContain("PR: https://github.com/acme/shop/pull/42");
    expect(output).toContain("作者: @octocat");
    expect(output).toContain("Review 草稿: 可发布 1, 已拦截 1");
    expect(output).toContain(
      "1. [major/high] app/api/checkout/route.ts:12 - 需要校验 webhook 签名"
    );
    expect(output).toContain("1. 未读取完整仓库");
    expect(output).toContain("2. 未读取运行时密钥配置");
  });
});
