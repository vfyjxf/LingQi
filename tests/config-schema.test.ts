import { describe, expect, test } from "vitest";
import { defaultLingQiConfig } from "@/lib/config/default-config";
import { LingQiConfigSchema } from "@/lib/config/schema";

describe("LingQiConfigSchema", () => {
  test("默认配置能通过 schema 校验", () => {
    const result = LingQiConfigSchema.parse(defaultLingQiConfig);

    expect(result.ai.provider).toBe("deepseek");
    expect(result.ai.model).toBe("deepseek-v4-flash");
    expect(result.ai.apiKeyEnv).toBe("DEEPSEEK_API_KEY");
    expect(result.reviewers[0]).toMatchObject({
      id: "fast-reviewer",
      provider: "deepseek",
      trigger: "always"
    });
    expect(result.review.language).toBe("zh-CN");
  });

  test("非法 temperature 会给出字段路径", () => {
    const result = LingQiConfigSchema.safeParse({
      ...defaultLingQiConfig,
      ai: {
        ...defaultLingQiConfig.ai,
        temperature: 2
      }
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["ai", "temperature"]);
    }
  });

  test("非法 provider 会被拒绝", () => {
    const result = LingQiConfigSchema.safeParse({
      ...defaultLingQiConfig,
      ai: {
        ...defaultLingQiConfig.ai,
        provider: "openai"
      }
    });

    expect(result.success).toBe(false);
  });

  test("非法 reviewer role 会被拒绝", () => {
    const result = LingQiConfigSchema.safeParse({
      ...defaultLingQiConfig,
      reviewers: [
        {
          ...defaultLingQiConfig.reviewers[0],
          role: "architect"
        }
      ]
    });

    expect(result.success).toBe(false);
  });

  test("非法 reviewer trigger 会被拒绝", () => {
    const result = LingQiConfigSchema.safeParse({
      ...defaultLingQiConfig,
      reviewers: [
        {
          ...defaultLingQiConfig.reviewers[0],
          trigger: "on-demand"
        }
      ]
    });

    expect(result.success).toBe(false);
  });

  test("非法 reviewer provider 会被拒绝", () => {
    const result = LingQiConfigSchema.safeParse({
      ...defaultLingQiConfig,
      reviewers: [
        {
          ...defaultLingQiConfig.reviewers[0],
          provider: "openai"
        }
      ]
    });

    expect(result.success).toBe(false);
  });

  test("空 apiKeyEnv 会给出字段路径", () => {
    const result = LingQiConfigSchema.safeParse({
      ...defaultLingQiConfig,
      ai: {
        ...defaultLingQiConfig.ai,
        apiKeyEnv: ""
      }
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["ai", "apiKeyEnv"]);
    }
  });

  test("默认配置包含 Review Profile 分组", () => {
    const config = LingQiConfigSchema.parse(defaultLingQiConfig);

    expect(config.reviewProfile.groups.length).toBeGreaterThan(0);
    expect(config.reviewProfile.fallbackGroup.id).toBe("uncategorized");
  });

  test("拒绝空的 Review Profile 分组 id", () => {
    const result = LingQiConfigSchema.safeParse({
      ...defaultLingQiConfig,
      reviewProfile: {
        ...defaultLingQiConfig.reviewProfile,
        groups: [
          {
            ...defaultLingQiConfig.reviewProfile.groups[0],
            id: ""
          }
        ]
      }
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual([
        "reviewProfile",
        "groups",
        0,
        "id"
      ]);
    }
  });

  test("拒绝非法 Review Profile 优先级", () => {
    const result = LingQiConfigSchema.safeParse({
      ...defaultLingQiConfig,
      reviewProfile: {
        ...defaultLingQiConfig.reviewProfile,
        fallbackGroup: {
          ...defaultLingQiConfig.reviewProfile.fallbackGroup,
          priority: "urgent"
        }
      }
    });

    expect(result.success).toBe(false);
  });
});
