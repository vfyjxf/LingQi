import { describe, expect, test } from "vitest";
import { formatSmokeOutput } from "@/lib/smoke/smoke-output";
import type { AiReviewReport } from "@/lib/report/schema";
import type { ReviewDraft } from "@/lib/review-draft/schema";
import { makeValidReport } from "@/tests/fixtures/report-fixtures";

const report: AiReviewReport = makeValidReport();

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
      "1. [major/high] src/auth/session.ts:42 - 刷新 token 前需要确认用户状态"
    );
    expect(output).toContain("1. 未读取完整调用链");
  });
});
