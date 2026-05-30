import { describe, expect, test } from "vitest";
import { groupChangeFiles } from "@/lib/analysis/change-grouper";
import type { ReviewProfile } from "@/lib/config/schema";

const profile: ReviewProfile = {
  groups: [
    {
      id: "auth",
      name: "认证与权限",
      description: "认证相关改动",
      priority: "high",
      match: {
        paths: ["lib/auth/**"],
        keywords: ["token", "session"]
      },
      context: {
        maxFiles: 5,
        maxPatchCharsPerFile: 12000
      },
      reviewPrompts: ["确认权限边界"]
    },
    {
      id: "tests",
      name: "测试覆盖",
      priority: "medium",
      match: {
        paths: ["tests/**"],
        keywords: ["expect"]
      },
      context: {
        maxFiles: 5,
        maxPatchCharsPerFile: 8000
      },
      reviewPrompts: ["确认测试覆盖"]
    }
  ],
  fallbackGroup: {
    id: "uncategorized",
    name: "未归类改动",
    priority: "medium"
  }
};

describe("groupChangeFiles", () => {
  test("按路径规则把文件归入项目自定义分组", () => {
    const [file] = groupChangeFiles(
      [
        {
          filename: "lib/auth/session.ts",
          status: "modified",
          additions: 10,
          deletions: 2,
          changes: 12,
          patch: "+ refresh token",
          riskHints: ["security"]
        }
      ],
      profile
    );

    expect(file.groupId).toBe("auth");
    expect(file.groupName).toBe("认证与权限");
    expect(file.priority).toBe("high");
    expect(file.matchedBy).toContain("path");
    expect(file.matchedRules).toContain("path:lib/auth/**");
  });

  test("按关键词规则命中 diff 内容", () => {
    const [file] = groupChangeFiles(
      [
        {
          filename: "lib/session-store.ts",
          status: "modified",
          additions: 4,
          deletions: 1,
          changes: 5,
          patch: "+ const token = await rotateToken();",
          riskHints: []
        }
      ],
      profile
    );

    expect(file.groupId).toBe("auth");
    expect(file.matchedBy).toContain("keyword");
    expect(file.matchedRules).toContain("keyword:token");
  });

  test("多组命中时选择高优先级分组", () => {
    const [file] = groupChangeFiles(
      [
        {
          filename: "tests/auth/session.test.ts",
          status: "modified",
          additions: 8,
          deletions: 0,
          changes: 8,
          patch: "+ expect(token).toBeDefined();",
          riskHints: ["testing"]
        }
      ],
      profile
    );

    expect(file.groupId).toBe("auth");
  });

  test("未命中文件进入 fallback group", () => {
    const [file] = groupChangeFiles(
      [
        {
          filename: "scripts/cleanup.ts",
          status: "added",
          additions: 3,
          deletions: 0,
          changes: 3,
          riskHints: []
        }
      ],
      profile
    );

    expect(file.groupId).toBe("uncategorized");
    expect(file.groupName).toBe("未归类改动");
    expect(file.matchedBy).toEqual(["fallback"]);
    expect(file.matchedRules).toEqual(["fallback"]);
  });
});
