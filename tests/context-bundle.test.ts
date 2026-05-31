import { describe, expect, test } from "vitest";
import { buildPrContextBundle } from "@/lib/analysis/context-bundle";
import type { GroupedChangeFile } from "@/lib/analysis/change-grouper";
import type { ReviewProfile } from "@/lib/config/schema";

const profile: ReviewProfile = {
  groups: [
    {
      id: "auth",
      name: "认证与权限",
      description: "认证相关改动",
      priority: "high",
      match: { paths: ["lib/auth/**"], keywords: [] },
      context: { maxFiles: 1, maxPatchCharsPerFile: 20 },
      reviewPrompts: ["确认权限边界"]
    }
  ],
  fallbackGroup: {
    id: "uncategorized",
    name: "未归类改动",
    priority: "medium"
  }
};

const groupedFiles: GroupedChangeFile[] = [
  {
    filename: "lib/auth/session.ts",
    status: "modified",
    additions: 20,
    deletions: 2,
    changes: 22,
    patch: "+".repeat(40),
    riskHints: ["security"],
    groupId: "auth",
    groupName: "认证与权限",
    groupDescription: "认证相关改动",
    priority: "high",
    matchedBy: ["path"],
    matchedRules: ["path:lib/auth/**"]
  },
  {
    filename: "lib/auth/token.ts",
    status: "modified",
    additions: 4,
    deletions: 1,
    changes: 5,
    patch: "+ rotate token",
    riskHints: ["security"],
    groupId: "auth",
    groupName: "认证与权限",
    groupDescription: "认证相关改动",
    priority: "high",
    matchedBy: ["path"],
    matchedRules: ["path:lib/auth/**"]
  }
];

describe("buildPrContextBundle", () => {
  test("按分组预算截断 patch 并省略超出文件", () => {
    const bundle = buildPrContextBundle({
      pr: {
        title: "Update auth",
        body: null,
        author: "octocat",
        avatarUrl: "https://avatars.githubusercontent.com/u/583231?v=4",
        url: "https://github.com/acme/app/pull/1",
        baseRef: "main",
        headRef: "feature/auth",
        state: "open"
      },
      stats: {
        changedFiles: 2,
        additions: 24,
        deletions: 3,
        changes: 27
      },
      groupedFiles,
      profile,
      contextConfig: {
        maxFiles: 30,
        maxPatchCharsPerFile: 12000,
        includeCommits: true,
        includeRiskHints: true,
        largePrThreshold: {
          changedFiles: 1,
          changes: 10
        }
      }
    });

    expect(bundle.groups).toHaveLength(1);
    expect(bundle.groups[0].files[0].includedInPrompt).toBe(true);
    expect(bundle.groups[0].files[0].truncated).toBe(true);
    expect(bundle.groups[0].files[0].patch?.length).toBeGreaterThan(20);
    expect(bundle.groups[0].files[0].commentableLines).toEqual([]);
    expect(bundle.groups[0].files[0].oldLines).toEqual([]);
    expect(bundle.groups[0].files[1].includedInPrompt).toBe(false);
    expect(bundle.groups[0].budget.omittedFiles).toBe(1);
    expect(bundle.limitations.some((item) => item.includes("大 PR"))).toBe(
      true
    );
    expect(
      bundle.limitations.some((item) => item.includes("省略 1 个文件"))
    ).toBe(true);
  });

  test("向模型上下文提供带 RIGHT 行号的 diff", () => {
    const bundle = buildPrContextBundle({
      pr: {
        title: "Update auth",
        body: null,
        author: "octocat",
        avatarUrl: "https://avatars.githubusercontent.com/u/583231?v=4",
        url: "https://github.com/acme/app/pull/1",
        baseRef: "main",
        headRef: "feature/auth",
        state: "open"
      },
      stats: {
        changedFiles: 1,
        additions: 1,
        deletions: 0,
        changes: 1
      },
      groupedFiles: [
        {
          ...groupedFiles[0],
          patch: "@@ -10,1 +10,2 @@\n const token = session.token;\n+refresh(token);",
          numberedPatch:
            "@@ -10,1 +10,2 @@\n  LEFT 10 RIGHT 10 | const token = session.token;\n+ RIGHT 11 | refresh(token);",
          commentableLines: [10, 11],
          oldLines: [10]
        }
      ],
      profile: {
        ...profile,
        groups: [
          {
            ...profile.groups[0],
            context: { maxFiles: 5, maxPatchCharsPerFile: 12000 }
          }
        ]
      },
      contextConfig: {
        maxFiles: 30,
        maxPatchCharsPerFile: 12000,
        includeCommits: true,
        includeRiskHints: true,
        largePrThreshold: {
          changedFiles: 20,
          changes: 800
        }
      }
    });

    expect(bundle.groups[0].files[0].numberedPatch).toContain(
      "+ RIGHT 11 | refresh(token);"
    );
    expect(bundle.groups[0].files[0].commentableLines).toEqual([10, 11]);
  });
});
