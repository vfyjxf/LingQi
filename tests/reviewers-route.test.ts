import { describe, expect, test, vi } from "vitest";

const buildReviewerOptionsMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/config/reviewer-options", () => ({
  buildReviewerOptions: buildReviewerOptionsMock
}));

describe("GET /api/reviewers", () => {
  test("返回可选 reviewer 列表", async () => {
    buildReviewerOptionsMock.mockReturnValue([
      {
        id: "fast-reviewer",
        name: "快速上下文 reviewer",
        role: "fast",
        provider: "deepseek",
        model: "deepseek-v4-flash",
        trigger: "always",
        focus: ["summary", "risk"]
      }
    ]);
    const { GET } = await import("@/app/api/reviewers/route");

    const response = GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      reviewers: [
        {
          id: "fast-reviewer",
          name: "快速上下文 reviewer",
          role: "fast",
          provider: "deepseek",
          model: "deepseek-v4-flash",
          trigger: "always",
          focus: ["summary", "risk"]
        }
      ]
    });
  });

  test("读取配置失败时返回 500", async () => {
    buildReviewerOptionsMock.mockImplementation(() => {
      throw new Error("LingQi 配置无效");
    });
    const { GET } = await import("@/app/api/reviewers/route");

    const response = GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "LingQi 配置无效"
    });
  });
});
