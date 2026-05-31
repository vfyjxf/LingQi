import { describe, expect, test, vi } from "vitest";
import type { LanguageModel } from "ai";
import type { PrAnalysisContext } from "@/lib/analysis/context-builder";
import {
  createVercelAiProvider,
  buildReviewPrompt
} from "@/lib/ai/vercel-ai-provider";
import type { AiReviewReport } from "@/lib/report/schema";
import { makeValidReport } from "@/tests/fixtures/report-fixtures";

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

const report: AiReviewReport = makeValidReport();

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
    expect(prompt).toContain("必须输出 groupAnalyses");
    expect(prompt).toContain("每个输入 group 必须有且仅有一个对应的 groupAnalyses 项");
    expect(prompt).toContain("不能自造 groupId、groupName 或 priority");
    expect(prompt).toContain("不能跨组引用其他文件");
    expect(prompt).toContain(
      "全局 risks 和 suggestions 应从分组结果中挑选最高价值项"
    );
  });

  test("提示词包含维度评分规则和锚点", () => {
    const prompt = buildReviewPrompt(context);

    expect(prompt).toContain("维度评分规则（0-100 分");
    expect(prompt).toContain("90-100: 该维度无已知风险");
  });

  test("提示词包含证据要求和严重程度映射", () => {
    const prompt = buildReviewPrompt(context);

    expect(prompt).toContain("证据要求");
    expect(prompt).toContain("严重程度映射指引");
    expect(prompt).toContain("score 0-25: severity 通常为 blocker");
  });

  test("提示词包含 7 个维度的检查重点", () => {
    const prompt = buildReviewPrompt(context);

    expect(prompt).toContain("security: 认证");
    expect(prompt).toContain("data: 数据一致性");
    expect(prompt).toContain("maintainability: 命名规范");
  });
});
