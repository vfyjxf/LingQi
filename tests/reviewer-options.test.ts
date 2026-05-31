import { describe, expect, test } from "vitest";
import { buildReviewerOptions } from "@/lib/config/reviewer-options";
import { defaultLingQiConfig } from "@/lib/config/default-config";

describe("buildReviewerOptions", () => {
  test("只返回启用 reviewer 的公开元数据", () => {
    const reviewers = buildReviewerOptions({
      loadConfig: () => ({
        ...defaultLingQiConfig,
        reviewers: [
          defaultLingQiConfig.reviewers[0],
          {
            ...defaultLingQiConfig.reviewers[0],
            id: "disabled-reviewer",
            enabled: false
          }
        ]
      })
    });

    expect(reviewers).toEqual([
      {
        id: "fast-reviewer",
        name: "快速上下文 reviewer",
        role: "fast",
        provider: "deepseek",
        model: "deepseek-v4-flash",
        trigger: "always",
        focus: ["summary", "risk", "suggestion"]
      }
    ]);
  });
});
