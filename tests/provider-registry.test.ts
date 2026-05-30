import { describe, expect, test } from "vitest";
import { createProviderFromRegistry } from "@/lib/ai/provider-registry";

describe("createProviderFromRegistry", () => {
  test("可以创建 DeepSeek provider", () => {
    const provider = createProviderFromRegistry("deepseek", {
      apiKey: "sk-test",
      modelId: "deepseek-v4-flash"
    });

    expect(provider).toHaveProperty("analyze");
  });

  test("不支持的 provider 会抛出明确错误", () => {
    expect(() =>
      createProviderFromRegistry("unknown-provider", {
        apiKey: "sk-test",
        modelId: "test-model"
      })
    ).toThrow("不支持的 AI provider: unknown-provider");
  });
});
