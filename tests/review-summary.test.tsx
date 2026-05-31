import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import ReviewSummary from "@/components/ReviewSummary";
import type { ReviewSummaryData, ReviewSummaryMeta } from "@/components/ReviewSummary";

const mockSummary: ReviewSummaryData = {
  title: "修复登录 token 刷新逻辑",
  overview: "本次 PR 修复了 refreshSession 分支中未验证用户状态的问题，并新增用户详情 API。",
  changedModules: ["src/auth/login.ts", "src/api/routes.ts"],
  testSummary: "已添加 token 刷新和用户 API 的单元测试，覆盖正常和异常路径。",
};

const mockMeta: ReviewSummaryMeta = {
  owner: "vfyjxf",
  repo: "LingQi",
  pullNumber: 42,
  filesCount: 4,
  totalAdditions: 234,
  totalDeletions: 67,
  author: "douziovo",
};

const mockSuggestions = [
  "建议使用批量查询替代逐条 findById",
  "建议添加 token 过期后的重试机制",
];

describe("ReviewSummary", () => {
  test("显示 PR 元信息", () => {
    render(<ReviewSummary summary={mockSummary} generalSuggestions={mockSuggestions} meta={mockMeta} />);

    expect(screen.getByText("#42")).toBeInTheDocument();
    expect(screen.getByText("@douziovo")).toBeInTheDocument();
    expect(screen.getByText("vfyjxf/LingQi")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("+234")).toBeInTheDocument();
    expect(screen.getByText("-67")).toBeInTheDocument();
  });

  test("显示 PR 标题和概述", () => {
    render(<ReviewSummary summary={mockSummary} generalSuggestions={mockSuggestions} meta={mockMeta} />);

    expect(screen.getByText("修复登录 token 刷新逻辑")).toBeInTheDocument();
    expect(screen.getByText(/refreshSession/)).toBeInTheDocument();
  });

  test("显示变更模块", () => {
    render(<ReviewSummary summary={mockSummary} generalSuggestions={mockSuggestions} meta={mockMeta} />);

    expect(screen.getByText("src/auth/login.ts")).toBeInTheDocument();
    expect(screen.getByText("src/api/routes.ts")).toBeInTheDocument();
  });

  test("显示测试摘要", () => {
    render(<ReviewSummary summary={mockSummary} generalSuggestions={mockSuggestions} meta={mockMeta} />);

    expect(screen.getByText("测试摘要")).toBeInTheDocument();
    expect(screen.getByText(/已添加 token 刷新和用户 API 的单元测试/)).toBeInTheDocument();
  });

  test("显示改进建议列表", () => {
    render(<ReviewSummary summary={mockSummary} generalSuggestions={mockSuggestions} meta={mockMeta} />);

    expect(screen.getByText("架构与质量改进建议")).toBeInTheDocument();
    expect(screen.getByText("建议使用批量查询替代逐条 findById")).toBeInTheDocument();
  });

  test("空建议列表不渲染建议区块", () => {
    render(<ReviewSummary summary={mockSummary} generalSuggestions={[]} meta={mockMeta} />);

    expect(screen.queryByText("架构与质量改进建议")).toBeNull();
  });
});
