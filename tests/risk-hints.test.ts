import { describe, expect, test } from "vitest";
import { detectRiskHints } from "@/lib/analysis/risk-hints";

describe("detectRiskHints", () => {
  test("识别安全相关路径", () => {
    expect(
      detectRiskHints({
        filename: "src/auth/session.ts",
        additions: 12,
        deletions: 3,
        patch: "@@ role permission token @@"
      })
    ).toContain("security");
  });

  test("识别 API、配置、数据库迁移和测试文件", () => {
    expect(
      detectRiskHints({
        filename: "src/api/users/route.ts",
        additions: 4,
        deletions: 1
      })
    ).toContain("api");
    expect(
      detectRiskHints({
        filename: "next.config.ts",
        additions: 2,
        deletions: 0
      })
    ).toContain("config");
    expect(
      detectRiskHints({
        filename: "db/migrations/20260530_add_users.sql",
        additions: 20,
        deletions: 0
      })
    ).toContain("database");
    expect(
      detectRiskHints({
        filename: "tests/session.test.ts",
        additions: 15,
        deletions: 0
      })
    ).toContain("testing");
  });

  test("识别大变更文件", () => {
    expect(
      detectRiskHints({
        filename: "src/services/billing.ts",
        additions: 140,
        deletions: 20
      })
    ).toContain("large-change");
  });
});
