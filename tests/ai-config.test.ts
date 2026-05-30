import { describe, expect, test } from "vitest";
import { getDeepSeekConfig } from "@/lib/ai/config";

describe("getDeepSeekConfig", () => {
  test("读取 DeepSeek API key 和默认模型", () => {
    const config = getDeepSeekConfig({
      DEEPSEEK_API_KEY: "sk-test"
    });

    expect(config).toEqual({
      apiKey: "sk-test",
      modelId: "deepseek-v4-flash"
    });
  });

  test("允许通过 DEEPSEEK_MODEL 覆盖模型", () => {
    const config = getDeepSeekConfig({
      DEEPSEEK_API_KEY: "sk-test",
      DEEPSEEK_MODEL: "deepseek-v4-pro"
    });

    expect(config.modelId).toBe("deepseek-v4-pro");
  });

  test("缺少 DEEPSEEK_API_KEY 时抛出可理解错误", () => {
    expect(() => getDeepSeekConfig({})).toThrow("缺少 DEEPSEEK_API_KEY");
  });
});
