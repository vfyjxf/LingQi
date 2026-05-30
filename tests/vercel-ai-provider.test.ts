import { describe, expect, test, vi } from "vitest";
import type { LanguageModel } from "ai";
import type { PrAnalysisContext } from "@/lib/analysis/context-builder";
import { createVercelAiProvider } from "@/lib/ai/vercel-ai-provider";
import type { AiReviewReport } from "@/lib/report/schema";

const context: PrAnalysisContext = {
  pr: {
    title: "Add billing webhook",
    body: "Handle invoice paid event",
    author: "octocat",
    avatarUrl: "https://avatars.githubusercontent.com/u/583231?v=4",
    url: "https://github.com/acme/app/pull/34",
    baseRef: "main",
    headRef: "feature/billing-webhook",
    state: "open"
  },
  files: [
    {
      filename: "app/api/billing/route.ts",
      status: "modified",
      additions: 42,
      deletions: 3,
      changes: 45,
      patch: "@@ -1 +1 @@\n+export async function POST() {}",
      riskHints: ["api"]
    }
  ],
  commits: [{ sha: "def456", message: "feat: handle billing webhook" }],
  stats: { changedFiles: 1, additions: 42, deletions: 3, changes: 45 }
};

const report: AiReviewReport = {
  summary: {
    title: "新增账单 webhook 处理",
    overview: "本次 PR 修改账单 API 入口，处理发票支付事件。",
    changedModules: ["app/api/billing/route.ts"],
    testSummary: "当前上下文未看到测试文件变更。"
  },
  reviewFocus: [
    {
      file: "app/api/billing/route.ts",
      reason: "API webhook 入口对数据一致性和鉴权敏感。",
      priority: "high"
    }
  ],
  risks: [
    {
      severity: "major",
      confidence: "medium",
      category: "api",
      file: "app/api/billing/route.ts",
      title: "需要确认 webhook 鉴权",
      evidence: "新增 POST 入口但上下文未显示签名校验。",
      impact: "未校验的 webhook 可能导致伪造事件。"
    }
  ],
  suggestions: [],
  contextNotes: {
    contextUsed: ["PR 元信息", "文件 diff", "风险 hints"],
    limitations: ["未读取运行时配置"],
    modelStrategy: "使用 Vercel AI SDK 结构化输出"
  }
};

describe("createVercelAiProvider", () => {
  test("组装 PR Review 提示词并返回结构化报告", async () => {
    const generateObject = vi.fn().mockResolvedValue({ object: report });
    const provider = createVercelAiProvider({
      model: "test-model" as LanguageModel,
      generateObject
    });

    const result = await provider.analyze(context);

    expect(result).toEqual(report);
    expect(generateObject).toHaveBeenCalledTimes(1);
    expect(generateObject.mock.calls[0][0].model).toBe("test-model");
    expect(generateObject.mock.calls[0][0].prompt).toContain(
      "Add billing webhook"
    );
    expect(generateObject.mock.calls[0][0].prompt).toContain(
      "app/api/billing/route.ts"
    );
    expect(generateObject.mock.calls[0][0].prompt).toContain(
      "只返回符合 schema 的结构化 Review 报告"
    );
  });

  test("优先把分组上下文包写入 AI 提示词", async () => {
    const generateObject = vi.fn().mockResolvedValue({ object: report });
    const provider = createVercelAiProvider({
      model: "test-model" as LanguageModel,
      generateObject
    });

    await provider.analyze({
      ...context,
      contextBundle: {
        pr: context.pr,
        stats: context.stats,
        groups: [
          {
            id: "billing",
            name: "账单链路",
            priority: "high",
            reviewPrompts: ["确认 webhook 鉴权"],
            files: [
              {
                filename: "app/api/billing/route.ts",
                status: "modified",
                additions: 42,
                deletions: 3,
                changes: 45,
                patch: "@@ -1 +1 @@\n+export async function POST() {}",
                includedInPrompt: true,
                truncated: false,
                riskHints: ["api"],
                matchedBy: ["path"],
                matchedRules: ["path:app/api/**"]
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
        limitations: ["没有读取完整调用链"]
      }
    });

    const prompt = generateObject.mock.calls[0][0].prompt;
    expect(prompt).toContain("PR 分组上下文 JSON");
    expect(prompt).toContain("账单链路");
    expect(prompt).toContain("确认 webhook 鉴权");
    expect(prompt).toContain("不要编造未提供的上下文");
  });
});
