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

  test("显示风险严重度统计", () => {
    render(<StatsPanel stats={mockStats} />);

    expect(screen.getByText("风险严重度统计")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument(); // total risk count in donut center
  });

  test("显示所有严重级别分类", () => {
    render(<StatsPanel stats={mockStats} />);

    expect(screen.getByText("Blocker")).toBeInTheDocument();
    expect(screen.getByText("Major")).toBeInTheDocument();
    expect(screen.getByText("Minor")).toBeInTheDocument();
    expect(screen.getByText("Nit")).toBeInTheDocument();
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

    expect(screen.getByText("零高危隐患，代码状态极为优秀！")).toBeInTheDocument();
  });
});
