import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import StatsPanel from "@/components/StatsPanel";
import type { StatsData } from "@/components/StatsPanel";

const mockStats: StatsData = {
  filesChanged: 8,
  linesAdded: 234,
  linesDeleted: 67,
  riskCount: 5,
  blockerCount: 1,
  majorCount: 2,
  minorCount: 1,
  nitCount: 1,
};

describe("StatsPanel", () => {
  test("显示综合质量评级", () => {
    render(<StatsPanel stats={mockStats} />);

    expect(screen.getByText("PR 综合质量评级")).toBeInTheDocument();
    // 100 - (1*20 + 2*12 + 1*5 + 1*2) = 100 - 51 = 49 → D
    expect(screen.getByText("D")).toBeInTheDocument();
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

  test("显示风险类别分布标题", () => {
    render(<StatsPanel stats={mockStats} />);

    expect(screen.getByText("风险类别分布")).toBeInTheDocument();
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

    expect(screen.getAllByText("零高危隐患，代码状态极为优秀！")).toHaveLength(2);
  });

  test("渲染 Recharts 图表容器", () => {
    // jsdom 环境需要 mock ResizeObserver 让 Recharts 正常初始化
    const { container } = render(<StatsPanel stats={mockStats} />);

    // Recharts 在 jsdom 中可能因容器尺寸为0而不渲染 SVG，
    // 但 ResponsiveContainer wrapper 一定存在于 DOM 中
    const responsiveContainers = container.querySelectorAll(".recharts-responsive-container");
    expect(responsiveContainers.length).toBeGreaterThanOrEqual(2);
  });
});
