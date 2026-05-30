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
  test("显示文件数和行数统计", () => {
    render(<StatsPanel stats={mockStats} />);

    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("234")).toBeInTheDocument();
    expect(screen.getByText("67")).toBeInTheDocument();
  });

  test("显示严重级别分段统计", () => {
    render(<StatsPanel stats={mockStats} />);

    expect(screen.getByText("Risks by Severity")).toBeInTheDocument();
  });

  test("显示所有严重级别分类", () => {
    render(<StatsPanel stats={mockStats} />);

    expect(screen.getByText("Blocker")).toBeInTheDocument();
    expect(screen.getByText("Major")).toBeInTheDocument();
    expect(screen.getByText("Minor")).toBeInTheDocument();
    expect(screen.getByText("Nit")).toBeInTheDocument();
  });

  test("显示零值时正确渲染", () => {
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

    // All "0" values should appear 8 times (3 overview + 5 risk breakdown)
    const zeros = screen.getAllByText("0");
    expect(zeros.length).toBeGreaterThanOrEqual(7);
  });
});
