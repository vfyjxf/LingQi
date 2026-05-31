import { describe, expect, test, vi } from "vitest";

const buildConfigHealthReportMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/config/health-check", () => ({
  buildConfigHealthReport: buildConfigHealthReportMock
}));

describe("GET /api/health/config", () => {
  test("配置正常时返回 200", async () => {
    buildConfigHealthReportMock.mockReturnValue({
      status: "ok",
      provider: "deepseek",
      model: "deepseek-chat",
      checks: []
    });
    const { GET } = await import("@/app/api/health/config/route");

    const response = GET();

    expect(response.status).toBe(200);
    expect(buildConfigHealthReportMock).toHaveBeenCalledWith({
      env: process.env
    });
    await expect(response.json()).resolves.toEqual({
      status: "ok",
      provider: "deepseek",
      model: "deepseek-chat",
      checks: []
    });
  });

  test("配置错误时返回 500", async () => {
    buildConfigHealthReportMock.mockReturnValue({
      status: "error",
      checks: [
        {
          id: "ai-secret",
          label: "AI 模型密钥",
          status: "error",
          message: "缺少 DEEPSEEK_API_KEY，真实 AI 分析无法运行。"
        }
      ]
    });
    const { GET } = await import("@/app/api/health/config/route");

    const response = GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      status: "error",
      checks: [
        {
          id: "ai-secret",
          label: "AI 模型密钥",
          status: "error",
          message: "缺少 DEEPSEEK_API_KEY，真实 AI 分析无法运行。"
        }
      ]
    });
  });
});
