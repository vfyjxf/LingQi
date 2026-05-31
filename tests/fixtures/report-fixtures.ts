import type { AiReviewReport } from "@/lib/report/schema";

const DIMENSIONS = [
  "security",
  "data",
  "stability",
  "performance",
  "api",
  "testing",
  "maintainability"
] as const;

const defaultDimensionScores = DIMENSIONS.map((dimension) => ({
  dimension,
  score: 75 as const,
  severity: "minor" as const,
  reasoning: "该维度未发现严重问题。",
  evidence: "未在变更中发现该维度相关风险"
}));

export function makeValidReport(
  overrides?: Partial<AiReviewReport>
): AiReviewReport {
  const defaultReport: AiReviewReport = {
    summary: {
      title: "修复登录态刷新逻辑",
      overview:
        "这个 PR 调整了 session 刷新流程，并补充了失败场景处理。",
      changedModules: ["auth", "api"],
      testSummary: "新增 auth refresh 的单元测试。"
    },
    reviewFocus: [
      {
        file: "src/auth/session.ts",
        reason: "修改了登录态刷新入口，影响认证流程。",
        priority: "high"
      }
    ],
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
        confidence: "high",
        file: "src/auth/session.ts",
        line: 42,
        problem: "刷新 token 时没有重新检查用户状态。",
        recommendation: "刷新前查询用户状态，并拒绝 disabled 用户。",
        rationale: "这能避免已禁用账号继续获得有效会话。"
      }
    ],
    groupAnalyses: [
      {
        groupId: "auth",
        groupName: "认证链路",
        priority: "high",
        summary:
          "认证分组修改了 session 刷新流程，需要重点确认禁用账号处理。",
        changedFiles: ["src/auth/session.ts"],
        keyRisks: [
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
        reviewSuggestions: [
          {
            severity: "major",
            confidence: "high",
            file: "src/auth/session.ts",
            line: 42,
            problem: "刷新 token 时没有重新检查用户状态。",
            recommendation: "刷新前查询用户状态，并拒绝 disabled 用户。",
            rationale: "这能避免已禁用账号继续获得有效会话。"
          }
        ],
        contextUsed: ["src/auth/session.ts diff", "认证分组 reviewPrompts"],
        limitations: ["未读取完整调用链"]
      }
    ],
    dimensionScores: defaultDimensionScores,
    contextNotes: {
      contextUsed: ["PR diff", "changed files"],
      limitations: ["未读取完整调用链"],
      modelStrategy: "快速摘要模型生成概览，强推理模型分析高风险片段。"
    }
  };

  return overrides ? { ...defaultReport, ...overrides } : defaultReport;
}
