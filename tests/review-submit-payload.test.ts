import { describe, expect, test } from "vitest";
import { buildReviewSubmitPlan } from "@/lib/review-draft/build-submit-payload";
import type { ReviewDraft } from "@/lib/review-draft/schema";

const draft: ReviewDraft = {
  publishableCount: 1,
  blockedCount: 2,
  comments: [
    {
      path: "src/auth/session.ts",
      line: 42,
      side: "RIGHT",
      body: "刷新 token 前需要确认用户状态。",
      severity: "major",
      confidence: "high",
      source: "risk",
      canPublish: true
    },
    {
      path: "src/auth/session.ts",
      side: "RIGHT",
      body: "建议补充异常路径测试。",
      severity: "minor",
      confidence: "medium",
      source: "suggestion",
      canPublish: false,
      blockedReason: "缺少可定位行号"
    },
    {
      path: "src/auth/session.ts",
      line: 48,
      side: "RIGHT",
      body: "低置信度提示。",
      severity: "minor",
      confidence: "low",
      source: "risk",
      canPublish: false,
      blockedReason: "置信度不足"
    }
  ]
};

describe("buildReviewSubmitPlan", () => {
  test("只把可发布草稿转换为 GitHub Review comments payload", () => {
    const plan = buildReviewSubmitPlan({
      owner: "octocat",
      repo: "hello-world",
      pullNumber: 42,
      draft
    });

    expect(plan).toMatchObject({
      owner: "octocat",
      repo: "hello-world",
      pullNumber: 42,
      dryRun: true,
      publishableCount: 1,
      blockedCount: 2
    });
    expect(plan.payload.event).toBe("COMMENT");
    expect(plan.payload.comments).toEqual([
      {
        path: "src/auth/session.ts",
        line: 42,
        side: "RIGHT",
        body: "刷新 token 前需要确认用户状态。"
      }
    ]);
    expect(plan.blockedComments).toHaveLength(2);
    expect(plan.payload.body).toContain("当前结果为 dry-run 预览");
  });

  test("允许调用方覆盖 Review 总评论正文", () => {
    const plan = buildReviewSubmitPlan({
      owner: "octocat",
      repo: "hello-world",
      pullNumber: 42,
      draft,
      body: "自定义总评。"
    });

    expect(plan.payload.body).toBe("自定义总评。");
  });
});
