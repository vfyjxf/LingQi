import { describe, expect, test } from "vitest";
import { createAiProviderFromConfig } from "@/lib/ai/provider-factory";
import { defaultLingQiConfig } from "@/lib/config/default-config";

describe("createAiProviderFromConfig", () => {
  test("缺少配置指定的 key 时抛出明确错误", () => {
    expect(() =>
      createAiProviderFromConfig({
        ai: {
          ...defaultLingQiConfig.ai,
          apiKeyEnv: "CUSTOM_AI_KEY"
        },
        env: {}
      })
    ).toThrow("缺少 CUSTOM_AI_KEY");
  });

  test("按配置指定的环境变量名创建 provider", () => {
    const provider = createAiProviderFromConfig({
      ai: {
        ...defaultLingQiConfig.ai,
        apiKeyEnv: "CUSTOM_AI_KEY"
      },
      env: { CUSTOM_AI_KEY: "sk-test" }
    });

    expect(provider).toHaveProperty("analyze");
  });
});
