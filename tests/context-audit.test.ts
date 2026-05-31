import { describe, expect, test } from "vitest";
import { buildContextAuditSummary } from "@/lib/analysis/context-audit";
import type { PrContextBundle } from "@/lib/analysis/context-bundle";

const bundle: PrContextBundle = {
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
  groups: [
    {
      id: "auth",
      name: "认证与权限",
      priority: "high",
      reviewPrompts: ["确认权限边界"],
      files: [
        {
          filename: "lib/auth/session.ts",
          status: "modified",
          additions: 20,
          deletions: 2,
          changes: 22,
          patch: "+".repeat(20),
          includedInPrompt: true,
          truncated: true,
          truncationReason: "超过分组 patch 字符预算",
          riskHints: ["security"],
          matchedBy: ["path"],
          matchedRules: ["path:lib/auth/**"]
        },
        {
          filename: "lib/auth/token.ts",
          status: "modified",
          additions: 4,
          deletions: 1,
          changes: 5,
          includedInPrompt: false,
          truncated: false,
          truncationReason: "超过 认证与权限 分组文件数量预算",
          riskHints: ["security"],
          matchedBy: ["path"],
          matchedRules: ["path:lib/auth/**"]
        }
      ],
      budget: {
        maxFiles: 1,
        maxPatchCharsPerFile: 20,
        includedFiles: 1,
        omittedFiles: 1
      }
    }
  ],
  limitations: [
    "lib/auth/session.ts patch 已截断到 20 字符。",
    "认证与权限 分组省略 1 个文件，超过 maxFiles=1。"
  ]
};

describe("buildContextAuditSummary", () => {
  test("从上下文包生成预算、截断和省略摘要", () => {
    const audit = buildContextAuditSummary(bundle);

    expect(audit).toMatchObject({
      enabled: true,
      totalGroups: 1,
      includedFiles: 1,
      omittedFiles: 1,
      truncatedFiles: 1,
      groups: [
        {
          id: "auth",
          name: "认证与权限",
          priority: "high",
          includedFiles: 1,
          omittedFiles: 1,
          truncatedFiles: 1,
          maxFiles: 1,
          maxPatchCharsPerFile: 20
        }
      ],
      omitted: [
        {
          filename: "lib/auth/token.ts",
          groupId: "auth",
          groupName: "认证与权限",
          reason: "超过 认证与权限 分组文件数量预算"
        }
      ],
      truncated: [
        {
          filename: "lib/auth/session.ts",
          groupId: "auth",
          groupName: "认证与权限",
          reason: "超过分组 patch 字符预算"
        }
      ]
    });
    expect(audit.limitations).toHaveLength(2);
  });

  test("未启用上下文包时返回未审计说明", () => {
    const audit = buildContextAuditSummary();

    expect(audit).toEqual({
      enabled: false,
      totalGroups: 0,
      includedFiles: 0,
      omittedFiles: 0,
      truncatedFiles: 0,
      groups: [],
      omitted: [],
      truncated: [],
      limitations: ["未启用 Review Profile，上下文未按分组预算审计。"]
    });
  });
});
