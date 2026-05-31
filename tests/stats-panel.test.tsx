import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import StatsPanel, { deriveAggregateScore } from "@/components/StatsPanel";
import type { StatsData, DimensionScoreData } from "@/components/StatsPanel";

// jsdom polyfill for Recharts ResponsiveContainer compatibility
if (typeof window !== "undefined" && !window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

const mockDimensionScores: DimensionScoreData[] = [
  { dimension: "security", label: "安全漏洞", score: 85, severity: "minor", evidence: "No critical auth issues", color: "#2563eb", icon: () => null },
  { dimension: "data", label: "数据风险", score: 70, severity: "minor", evidence: "Minor data validation gaps", color: "#2563eb", icon: () => null },
  { dimension: "stability", label: "稳定性", score: 60, severity: "major", evidence: "Potential race condition", color: "#ea580c", icon: () => null },
  { dimension: "performance", label: "性能瓶颈", score: 45, severity: "major", evidence: "N+1 query detected", color: "#ea580c", icon: () => null },
  { dimension: "api", label: "API 设计", score: 80, severity: "nit", evidence: "Well-structured endpoints", color: "#6b7280", icon: () => null },
  { dimension: "testing", label: "测试覆盖", score: 35, severity: "major", evidence: "Missing integration tests", color: "#ea580c", icon: () => null },
  { dimension: "maintainability", label: "可维护性", score: 55, severity: "minor", evidence: "Some magic numbers", color: "#2563eb", icon: () => null },
];

const mockStats: StatsData = {
  filesChanged: 8,
  linesAdded: 234,
  linesDeleted: 67,
  riskCount: 5,
  blockerCount: 1,
  majorCount: 2,
  minorCount: 1,
  nitCount: 1,
  dimensionScores: mockDimensionScores,
};

describe("deriveAggregateScore", () => {
  test("derives mean score from dimension scores", () => {
    // (85+70+60+45+80+35+55) = 430, 430/7 ≈ 61.43 → rounds to 61
    expect(deriveAggregateScore(mockDimensionScores)).toBe(61);
  });

  test("returns 0 for undefined input", () => {
    expect(deriveAggregateScore(undefined)).toBe(0);
  });

  test("returns 0 for empty array", () => {
    expect(deriveAggregateScore([])).toBe(0);
  });

  test("returns Math.round integer result", () => {
    // 80+90+70 = 240, 240/3 = 80
    expect(deriveAggregateScore([
      { score: 80 } as DimensionScoreData,
      { score: 90 } as DimensionScoreData,
      { score: 70 } as DimensionScoreData,
    ])).toBe(80);
  });
});

describe("StatsPanel", () => {
  test("显示综合质量评级", () => {
    render(<StatsPanel stats={mockStats} />);

    expect(screen.getByText("PR 综合质量评级")).toBeInTheDocument();
    // Dimension scores mean = 430/7 ≈ 61.4 → 61 → grade C (60-74 range)
    expect(screen.getByText("C")).toBeInTheDocument();
  });

  test("显示风险严重度统计标题和中心覆盖层", () => {
    render(<StatsPanel stats={mockStats} />);

    expect(screen.getByText("风险严重度统计")).toBeInTheDocument();
    // RadialBarChart 中心覆盖层: 风险总数 + "风险项"
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("风险项")).toBeInTheDocument();
  });

  test("零风险时显示优秀状态", () => {
    const zeroStats: StatsData = {
      filesChanged: 0,
      linesAdded: 0,
      linesDeleted: 0,
      riskCount: 0,
      blockerCount: 0,
      majorCount: 0,
      minorCount: 0,
      nitCount: 0,
    };

    render(<StatsPanel stats={zeroStats} />);

    expect(screen.getAllByText("零高危隐患，代码状态极为优秀！").length).toBeGreaterThanOrEqual(1);
  });

  test("显示维度质量评分标题", () => {
    render(<StatsPanel stats={mockStats} />);

    expect(screen.getByText("维度质量评分")).toBeInTheDocument();
  });

  test("零风险时两个图表区均显示空态", () => {
    const zeroStats: StatsData = {
      filesChanged: 0,
      linesAdded: 0,
      linesDeleted: 0,
      riskCount: 0,
      blockerCount: 0,
      majorCount: 0,
      minorCount: 0,
      nitCount: 0,
    };

    render(<StatsPanel stats={zeroStats} />);

    // Donut chart still shows "零高危隐患"
    expect(screen.getByText("零高危隐患，代码状态极为优秀！")).toBeInTheDocument();
    // Radar chart now shows "暂无维度评分数据"
    expect(screen.getByText("暂无维度评分数据")).toBeInTheDocument();
  });

  test("渲染 Recharts 图表容器", () => {
    // jsdom 环境需要 mock ResizeObserver 让 Recharts 正常初始化
    const { container } = render(<StatsPanel stats={mockStats} />);

    // Recharts 在 jsdom 中可能因容器尺寸为0而不渲染 SVG，
    // 但 ResponsiveContainer wrapper 一定存在于 DOM 中
    const responsiveContainers = container.querySelectorAll(".recharts-responsive-container");
    expect(responsiveContainers.length).toBeGreaterThanOrEqual(2);
  });

  test("显示 AI 维度评分雷达图", () => {
    render(<StatsPanel stats={mockStats} />);

    // Panel title for radar chart
    expect(screen.getByText("维度质量评分")).toBeInTheDocument();
  });

  test("从 AI 维度评分计算综合等级", () => {
    render(<StatsPanel stats={mockStats} />);

    // Grade C (mean 61, 60-74 range)
    expect(screen.getByText("C")).toBeInTheDocument();
    expect(screen.getByText("61 / 100")).toBeInTheDocument();
  });

  test("无维度评分时显示占位提示", () => {
    const noDimStats: StatsData = {
      filesChanged: 0,
      linesAdded: 0,
      linesDeleted: 0,
      riskCount: 0,
      blockerCount: 0,
      majorCount: 0,
      minorCount: 0,
      nitCount: 0,
      dimensionScores: [],
    };

    render(<StatsPanel stats={noDimStats} />);

    expect(screen.getByText("暂无维度评分数据")).toBeInTheDocument();
  });
});
