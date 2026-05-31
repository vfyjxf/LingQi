import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RiskCard from "@/components/RiskCard";
import type { RiskFinding, Suggestion } from "@/components/RiskCard";

const blockerRisk: RiskFinding = {
  severity: "blocker",
  category: "security",
  file: "src/auth/login.ts",
  line: 42,
  title: "token 刷新前需确认用户状态",
  evidence: "diff 修改了 refreshSession 分支，未检查用户状态。",
  impact: "已禁用用户可能继续获得 token。",
};

const majorRisk: RiskFinding = {
  severity: "major",
  category: "performance",
  file: "src/data/query.ts",
  title: "N+1 查询问题",
  evidence: "循环内调用 findById。",
  impact: "高并发时数据库压力大。",
};

const suggestion: Suggestion = {
  problem: "缺少 N+1 查询优化",
  recommendation: "使用 batchFindByIds 批量查询替代逐条 findById。",
  rationale: "批量查询可减少数据库往返次数，在高并发下性能提升显著。",
};

function renderCard(props = {}) {
  return {
    user: userEvent.setup(),
    ...render(<RiskCard risk={blockerRisk} {...props} />),
  };
}

describe("RiskCard", () => {
  test("显示严重级别徽章和分类徽章", () => {
    renderCard();
    expect(screen.getByText("阻断")).toBeInTheDocument();
    expect(screen.getByText("安全相关")).toBeInTheDocument();
  });

  test("显示标题、文件路径和行号", () => {
    renderCard();
    expect(screen.getByText("token 刷新前需确认用户状态")).toBeInTheDocument();
    expect(screen.getByText("src/auth/login.ts:42")).toBeInTheDocument();
  });

  test("显示风险影响描述", () => {
    renderCard();
    expect(screen.getByText("已禁用用户可能继续获得 token。")).toBeInTheDocument();
  });

  test("Major severity 显示对应徽章", () => {
    render(<RiskCard risk={majorRisk} />);
    expect(screen.getByText("严重")).toBeInTheDocument();
    expect(screen.getByText("性能隐患")).toBeInTheDocument();
  });

  test("有 suggestion 时默认展开显示修复建议", () => {
    renderCard({ suggestion });
    expect(screen.getByText("使用 batchFindByIds 批量查询替代逐条 findById。")).toBeInTheDocument();
    expect(screen.getByText("批量查询可减少数据库往返次数，在高并发下性能提升显著。")).toBeInTheDocument();
  });

  test("点击标题栏切换展开/收起", async () => {
    const { user } = renderCard({ suggestion });

    // Default: expanded
    expect(screen.getByText("证据")).toBeInTheDocument();

    // Click header to collapse
    await user.click(screen.getByText(blockerRisk.title));
    expect(screen.queryByText("证据")).toBeNull();

    // Click header to expand again
    await user.click(screen.getByText(blockerRisk.title));
    expect(screen.getByText("证据")).toBeInTheDocument();
  });

  test("无 suggestion 时不显示修复建议", () => {
    renderCard();
    expect(screen.queryByText("修复建议")).toBeNull();
  });

  test("不再显示上下文展开按钮", () => {
    renderCard();
    expect(screen.queryByText("展开上下文")).toBeNull();
    expect(screen.queryByText("上下文已展开")).toBeNull();
    expect(screen.queryByText("展开中...")).toBeNull();
  });
});
