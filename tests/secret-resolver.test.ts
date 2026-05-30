import { describe, expect, test } from "vitest";
import { resolveRequiredSecret } from "@/lib/ai/secret-resolver";

describe("resolveRequiredSecret", () => {
  test("可以按任意环境变量名读取密钥", () => {
    const secret = resolveRequiredSecret(
      { CUSTOM_AI_KEY: "sk-custom" },
      "CUSTOM_AI_KEY"
    );

    expect(secret).toBe("sk-custom");
  });

  test("会 trim 环境变量名和密钥值", () => {
    const secret = resolveRequiredSecret(
      { CUSTOM_AI_KEY: "  sk-custom  " },
      " CUSTOM_AI_KEY "
    );

    expect(secret).toBe("sk-custom");
  });

  test("缺少密钥时错误包含配置的环境变量名", () => {
    expect(() => resolveRequiredSecret({}, "CUSTOM_AI_KEY")).toThrow(
      "缺少 CUSTOM_AI_KEY"
    );
  });
});
