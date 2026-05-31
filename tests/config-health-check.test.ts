import { describe, expect, test } from "vitest";
import { buildConfigHealthReport } from "@/lib/config/health-check";
import { defaultLingQiConfig } from "@/lib/config/default-config";

describe("buildConfigHealthReport", () => {
  test("配置加载失败时返回 error", () => {
    const report = buildConfigHealthReport({
      env: {},
      loadConfig: () => {
        throw new Error("LingQi 配置无效：ai.model: Required");
      }
    });

    expect(report).toEqual({
      status: "error",
      checks: [
        {
          id: "config",
          label: "配置文件",
          status: "error",
          message: "LingQi 配置无效：ai.model: Required"
        }
      ]
    });
  });

  test("缺少 AI key 时返回 error，GitHub token 缺失为 warning", () => {
    const report = buildConfigHealthReport({
      env: {},
      loadConfig: () => defaultLingQiConfig
    });

    expect(report.status).toBe("error");
    expect(report.provider).toBe(defaultLingQiConfig.ai.provider);
    expect(report.model).toBe(defaultLingQiConfig.ai.model);
    expect(report.checks).toEqual([
      {
        id: "config",
        label: "配置文件",
        status: "ok",
        message: "LingQi 配置加载成功。"
      },
      {
        id: "ai-secret",
        label: "AI 模型密钥",
        status: "error",
        message: "缺少 DEEPSEEK_API_KEY，真实 AI 分析无法运行。"
      },
      {
        id: "github-token",
        label: "GitHub Token",
        status: "warning",
        message: "未配置 GITHUB_TOKEN，公开仓库可尝试运行，但更容易触发限流。"
      },
      {
        id: "review-profile",
        label: "Review Profile",
        status: "ok",
        message: `已配置 ${defaultLingQiConfig.reviewProfile.groups.length} 个自定义 Review 分组。`
      }
    ]);
  });

  test("关键环境变量齐全时返回 ok", () => {
    const report = buildConfigHealthReport({
      env: {
        DEEPSEEK_API_KEY: "sk-test",
        GITHUB_TOKEN: "ghp-test"
      },
      loadConfig: () => defaultLingQiConfig
    });

    expect(report.status).toBe("ok");
    expect(report.checks.every((check) => check.status === "ok")).toBe(true);
  });
});
