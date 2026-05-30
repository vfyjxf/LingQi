import { describe, expect, test } from "vitest";
import {
  AiReviewReportSchema,
  parseAiReviewReport
} from "@/lib/report/schema";

const validReport = {
  summary: {
    title: "修复登录态刷新逻辑",
    overview: "这个 PR 调整了 session 刷新流程，并补充了失败场景处理。",
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
  contextNotes: {
    contextUsed: ["PR diff", "changed files"],
    limitations: ["未读取完整调用链"],
    modelStrategy: "快速摘要模型生成概览，强推理模型分析高风险片段。"
  }
};

describe("AiReviewReportSchema", () => {
  test("接受合法的结构化 Review 报告", () => {
    expect(AiReviewReportSchema.parse(validReport)).toEqual(validReport);
  });

  test("parseAiReviewReport 返回校验后的报告", () => {
    expect(parseAiReviewReport(validReport)).toEqual(validReport);
  });

  test("拒绝非法严重级别", () => {
    const report = {
      ...validReport,
      risks: [
        {
          ...validReport.risks[0],
          severity: "critical"
        }
      ]
    };

    expect(() => AiReviewReportSchema.parse(report)).toThrow();
  });

  test("拒绝没有证据的风险项", () => {
    const report = {
      ...validReport,
      risks: [
        {
          ...validReport.risks[0],
          evidence: ""
        }
      ]
    };

    expect(() => AiReviewReportSchema.parse(report)).toThrow();
  });

  test("拒绝没有修复建议的 Review 建议", () => {
    const report = {
      ...validReport,
      suggestions: [
        {
          ...validReport.suggestions[0],
          recommendation: ""
        }
      ]
    };

    expect(() => AiReviewReportSchema.parse(report)).toThrow();
  });
});
