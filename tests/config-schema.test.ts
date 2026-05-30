import { describe, expect, test } from "vitest";
import { defaultLingQiConfig } from "@/lib/config/default-config";
import { LingQiConfigSchema } from "@/lib/config/schema";

describe("LingQiConfigSchema", () => {
  test("默认配置能通过 schema 校验", () => {
    const result = LingQiConfigSchema.parse(defaultLingQiConfig);

    expect(result.ai.provider).toBe("deepseek");
    expect(result.ai.model).toBe("deepseek-v4-flash");
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
});
