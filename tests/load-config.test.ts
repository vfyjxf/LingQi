import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { loadLingQiConfig } from "@/lib/config/load-config";

function tempProject() {
  return mkdtempSync(join(tmpdir(), "lingqi-config-"));
}

describe("loadLingQiConfig", () => {
  test("无配置文件时使用默认配置", () => {
    const config = loadLingQiConfig({ cwd: tempProject() });

    expect(config.ai.provider).toBe("deepseek");
    expect(config.reviewers[0].id).toBe("fast-reviewer");
    expect(config.context.maxFiles).toBe(30);
  });

  test("lingqi.config.json 覆盖默认配置", () => {
    const cwd = tempProject();
    writeFileSync(
      join(cwd, "lingqi.config.json"),
      JSON.stringify({
        review: { maxSuggestions: 5 },
        context: { maxFiles: 12 }
      })
    );

    const config = loadLingQiConfig({ cwd });

    expect(config.review.maxSuggestions).toBe(5);
    expect(config.context.maxFiles).toBe(12);
    expect(config.ai.provider).toBe("deepseek");
  });

  test("lingqi.config.json 可以覆盖 reviewer 列表", () => {
    const cwd = tempProject();
    writeFileSync(
      join(cwd, "lingqi.config.json"),
      JSON.stringify({
        reviewers: [
          {
            id: "expert-reviewer",
            name: "专家 reviewer",
            role: "expert",
            enabled: true,
            provider: "deepseek",
            model: "deepseek-reasoner",
            apiKeyEnv: "DEEPSEEK_EXPERT_API_KEY",
            trigger: "high-risk",
            focus: ["security", "data"]
          }
        ]
      })
    );

    const config = loadLingQiConfig({ cwd });

    expect(config.reviewers).toHaveLength(1);
    expect(config.reviewers[0]).toMatchObject({
      id: "expert-reviewer",
      role: "expert",
      model: "deepseek-reasoner",
      trigger: "high-risk"
    });
  });

  test("lingqi.config.local.json 优先级高于 lingqi.config.json", () => {
    const cwd = tempProject();
    writeFileSync(
      join(cwd, "lingqi.config.json"),
      JSON.stringify({ review: { maxSuggestions: 5 } })
    );
    writeFileSync(
      join(cwd, "lingqi.config.local.json"),
      JSON.stringify({ review: { maxSuggestions: 3 } })
    );

    const config = loadLingQiConfig({ cwd });

    expect(config.review.maxSuggestions).toBe(3);
  });

  test("非法 JSON 抛出包含文件名的错误", () => {
    const cwd = tempProject();
    writeFileSync(join(cwd, "lingqi.config.json"), "{");

    expect(() => loadLingQiConfig({ cwd })).toThrow("lingqi.config.json");
  });

  test("非法配置抛出包含字段路径的错误", () => {
    const cwd = tempProject();
    writeFileSync(
      join(cwd, "lingqi.config.json"),
      JSON.stringify({ ai: { temperature: 2 } })
    );

    expect(() => loadLingQiConfig({ cwd })).toThrow("ai.temperature");
  });
});
