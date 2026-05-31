import { describe, expect, test } from "vitest";
import {
  AiReviewReportSchema,
  parseAiReviewReport
} from "@/lib/report/schema";
import { makeValidReport } from "@/tests/fixtures/report-fixtures";

const validReport = makeValidReport();

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

  test("把模型输出的空行号归一化为未提供行号", () => {
    const report = {
      ...validReport,
      risks: [
        {
          ...validReport.risks[0],
          line: null
        }
      ],
      suggestions: [
        {
          ...validReport.suggestions[0],
          line: null
        }
      ]
    };

    const parsed = parseAiReviewReport(report);

    expect(parsed.risks[0].line).toBeUndefined();
    expect(parsed.suggestions[0].line).toBeUndefined();
  });

  test("拒绝没有分组 id 的分组分析", () => {
    const report = {
      ...validReport,
      groupAnalyses: [
        {
          ...validReport.groupAnalyses[0],
          groupId: ""
        }
      ]
    };

    expect(() => AiReviewReportSchema.parse(report)).toThrow();
  });

  test("把分组分析里的空行号归一化为未提供行号", () => {
    const report = {
      ...validReport,
      groupAnalyses: [
        {
          ...validReport.groupAnalyses[0],
          keyRisks: [
            {
              ...validReport.groupAnalyses[0].keyRisks[0],
              line: 0
            }
          ],
          reviewSuggestions: [
            {
              ...validReport.groupAnalyses[0].reviewSuggestions[0],
              line: null
            }
          ]
        }
      ]
    };

    const parsed = parseAiReviewReport(report);

    expect(parsed.groupAnalyses[0].keyRisks[0].line).toBeUndefined();
    expect(
      parsed.groupAnalyses[0].reviewSuggestions[0].line
    ).toBeUndefined();
  });

  test("接受包含 7 个维度评分的合法报告", () => {
    const report = makeValidReport();
    const parsed = AiReviewReportSchema.parse(report);
    expect(parsed.dimensionScores).toHaveLength(7);
  });

  test("拒绝只有 6 个维度评分的报告", () => {
    const report = makeValidReport({
      dimensionScores: makeValidReport().dimensionScores.slice(0, 6)
    });
    expect(() => AiReviewReportSchema.parse(report)).toThrow();
  });

  test("拒绝维度评分超出 0-100 范围 (>100)", () => {
    const report = makeValidReport();
    report.dimensionScores[0].score = 101;
    expect(() => AiReviewReportSchema.parse(report)).toThrow();
  });

  test("拒绝维度评分为负数", () => {
    const report = makeValidReport();
    report.dimensionScores[0].score = -1;
    expect(() => AiReviewReportSchema.parse(report)).toThrow();
  });

  test("拒绝维度评分缺少证据", () => {
    const report = makeValidReport();
    report.dimensionScores[0].evidence = "";
    expect(() => AiReviewReportSchema.parse(report)).toThrow();
  });

  test("拒绝非法的严重程度值", () => {
    const report = makeValidReport();
    report.dimensionScores[0].severity = "critical" as never;
    expect(() => AiReviewReportSchema.parse(report)).toThrow();
  });
});
