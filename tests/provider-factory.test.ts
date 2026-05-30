import { describe, expect, test } from "vitest";
import { createAiProviderFromConfig } from "@/lib/ai/provider-factory";
import { defaultLingQiConfig } from "@/lib/config/default-config";

describe("createAiProviderFromConfig", () => {
  test("缺少 DeepSeek key 时抛出明确错误", () => {
    expect(() =>
      createAiProviderFromConfig({
        ai: defaultLingQiConfig.ai,
        env: {}
      })
    ).toThrow("缺少 DEEPSEEK_API_KEY");
  });

  test("有 DeepSeek key 时创建 provider", () => {
    const provider = createAiProviderFromConfig({
      ai: defaultLingQiConfig.ai,
      env: { DEEPSEEK_API_KEY: "sk-test" }
    });

    expect(provider).toHaveProperty("analyze");
  });
});
