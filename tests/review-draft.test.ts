import { describe, expect, test } from "vitest";
import type { PrAnalysisContext } from "@/lib/analysis/context-builder";
import type { AiReviewReport } from "@/lib/report/schema";
import { buildReviewDraft } from "@/lib/review-draft/build-review-draft";

const context: PrAnalysisContext = {
  pr: {
    title: "Improve auth flow",
    body: "Update session refresh.",
    author: "octocat",
    avatarUrl: "https://avatars.githubusercontent.com/u/583231?v=4",
    url: "https://github.com/octocat/hello-world/pull/42",
    baseRef: "main",
    headRef: "feature/auth-refresh",
    state: "open"
  },
  files: [
    {
      filename: "src/auth/session.ts",
      status: "modified",
      additions: 12,
      deletions: 4,
      changes: 16,
      patch: "@@ -1,3 +1,5 @@",
      commentableLines: [42, 43],
      oldLines: [40, 41],
      riskHints: ["security"]
    }
  ],
  commits: [{ sha: "abc123", message: "fix auth refresh" }],
  stats: {
    changedFiles: 1,
    additions: 12,
    deletions: 4,
    changes: 16
  }
};

const baseReport: AiReviewReport = {
  summary: {
    title: "更新鉴权流程",
    overview: "本次 PR 更新 session refresh 逻辑。",
    changedModules: ["src/auth/session.ts"],
    testSummary: "未看到测试文件变更。"
  },
  reviewFocus: [],
  risks: [],
  suggestions: [],
  groupAnalyses: [],
  contextNotes: {
    contextUsed: ["PR 元信息", "文件 diff"],
    limitations: [],
    modelStrategy: "DeepSeek 结构化输出"
  }
};

describe("buildReviewDraft", () => {
  test("把高置信风险和建议转换成可发布草稿", () => {
    const draft = buildReviewDraft(
      {
        ...baseReport,
        risks: [
          {
            severity: "major",
            confidence: "high",
            category: "security",
            file: "src/auth/session.ts",
            line: 42,
            title: "刷新 token 前需要确认用户状态",
            evidence: "diff 修改了 refreshSession 分支。",
            impact: "禁用用户可能继续获得新 token。"
          }
        ],
        suggestions: [
          {
            severity: "major",
            confidence: "medium",
            file: "src/auth/session.ts",
            line: 42,
            problem: "刷新 token 时没有重新检查用户状态。",
            recommendation: "刷新前查询用户状态。",
            rationale: "避免已禁用账号继续获得有效会话。"
          }
        ]
      },
      context
    );

    expect(draft.publishableCount).toBe(2);
    expect(draft.blockedCount).toBe(0);
    expect(draft.comments).toEqual([
      {
        path: "src/auth/session.ts",
        line: 42,
        side: "RIGHT",
        body: [
          "**风险：刷新 token 前需要确认用户状态**",
          "",
          "证据：diff 修改了 refreshSession 分支。",
          "",
          "影响：禁用用户可能继续获得新 token。"
        ].join("\n"),
        severity: "major",
        confidence: "high",
        source: "risk",
        canPublish: true
      },
      {
        path: "src/auth/session.ts",
        line: 42,
        side: "RIGHT",
        body: [
          "**建议：刷新 token 时没有重新检查用户状态。**",
          "",
          "建议做法：刷新前查询用户状态。",
          "",
          "原因：避免已禁用账号继续获得有效会话。"
        ].join("\n"),
        severity: "major",
        confidence: "medium",
        source: "suggestion",
        canPublish: true
      }
    ]);
  });

  test("缺少行号时保留草稿但标记不可发布", () => {
    const draft = buildReviewDraft(
      {
        ...baseReport,
        risks: [
          {
            severity: "major",
            confidence: "high",
            category: "security",
            file: "src/auth/session.ts",
            title: "缺少行号",
            evidence: "模型只定位到文件。",
            impact: "无法生成 GitHub inline comment。"
          }
        ]
      },
      context
    );

    expect(draft.publishableCount).toBe(0);
    expect(draft.blockedCount).toBe(1);
    expect(draft.comments[0]).toMatchObject({
      path: "src/auth/session.ts",
      canPublish: false,
      blockedReason: "缺少可定位行号"
    });
  });

  test("文件不在 diff 中时标记不可发布", () => {
    const draft = buildReviewDraft(
      {
        ...baseReport,
        suggestions: [
          {
            severity: "major",
            confidence: "high",
            file: "src/missing.ts",
            line: 10,
            problem: "引用了未变更文件。",
            recommendation: "只对 PR diff 内文件生成评论。",
            rationale: "GitHub inline comment 需要定位到本次 diff。"
          }
        ]
      },
      context
    );

    expect(draft.comments[0]).toMatchObject({
      path: "src/missing.ts",
      canPublish: false,
      blockedReason: "文件不在本次 PR diff 中"
    });
  });

  test("低置信度草稿不可发布", () => {
    const draft = buildReviewDraft(
      {
        ...baseReport,
        risks: [
          {
            severity: "major",
            confidence: "low",
            category: "security",
            file: "src/auth/session.ts",
            line: 42,
            title: "低置信风险",
            evidence: "上下文不足。",
            impact: "需要人工确认。"
          }
        ]
      },
      context
    );

    expect(draft.comments[0]).toMatchObject({
      canPublish: false,
      blockedReason: "置信度不足"
    });
  });

  test("行号不在可评论行中时标记不可发布", () => {
    const draft = buildReviewDraft(
      {
        ...baseReport,
        risks: [
          {
            severity: "major",
            confidence: "high",
            category: "security",
            file: "src/auth/session.ts",
            line: 99,
            title: "错误行号",
            evidence: "模型输出了 diff 中不存在的新文件行号。",
            impact: "GitHub Review inline comment 会提交失败。"
          }
        ]
      },
      context
    );

    expect(draft.comments[0]).toMatchObject({
      canPublish: false,
      blockedReason: "行号不在本次 PR 可评论行中"
    });
  });

  test("忽略 nit 级别项", () => {
    const draft = buildReviewDraft(
      {
        ...baseReport,
        risks: [
          {
            severity: "nit",
            confidence: "high",
            category: "maintainability",
            file: "src/auth/session.ts",
            line: 42,
            title: "格式问题",
            evidence: "少了空行。",
            impact: "只有轻微风格影响。"
          }
        ],
        suggestions: [
          {
            severity: "nit",
            confidence: "high",
            file: "src/auth/session.ts",
            line: 43,
            problem: "格式问题。",
            recommendation: "调整空行。",
            rationale: "保持风格一致。"
          }
        ]
      },
      context
    );

    expect(draft.comments).toEqual([]);
    expect(draft.publishableCount).toBe(0);
    expect(draft.blockedCount).toBe(0);
  });
});
