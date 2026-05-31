import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import ReviewProgress from "@/components/ReviewProgress";

describe("ReviewProgress", () => {
  test("idle 状态不渲染任何内容", () => {
    const { container } = render(<ReviewProgress status="idle" />);
    expect(container.firstChild).toBeNull();
  });

  test("fetching 状态显示进度指示器和消息", () => {
    render(
      <ReviewProgress status="fetching" progressMessage="正在从 GitHub 获取 PR 数据..." />
    );

    expect(
      screen.getByText("正在从 GitHub 获取 PR 数据...")
    ).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  test("analyzing 状态显示进度指示器", () => {
    render(
      <ReviewProgress status="analyzing" progressMessage="正在分析代码变更..." />
    );

    expect(screen.getByText("正在分析代码变更...")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  test("scoring 状态显示进度指示器", () => {
    render(
      <ReviewProgress status="scoring" progressMessage="正在生成健康评分..." />
    );

    expect(screen.getByText("正在生成健康评分...")).toBeInTheDocument();
  });

  test("done 状态显示完成标志和统计数据", () => {
    render(
      <ReviewProgress
        status="done"
        stats={{
          filesChanged: 5,
          linesAdded: 120,
          linesDeleted: 45,
          riskCount: 3,
        }}
      />
    );

    expect(screen.getByText("评审完成")).toBeInTheDocument();
    expect(screen.getByText("5 个文件变更")).toBeInTheDocument();
    expect(screen.getByText("+120")).toBeInTheDocument();
    expect(screen.getByText("-45")).toBeInTheDocument();
    expect(screen.getByText("3 个风险")).toBeInTheDocument();
  });

  test("done 状态无 stats 不渲染统计", () => {
    const { container } = render(<ReviewProgress status="done" />);
    expect(container.firstChild).toBeNull();
  });

  test("error 状态显示错误信息和修复建议", () => {
    render(
      <ReviewProgress
        status="error"
        error={{
          code: "GITHUB_API_ERROR",
          message: "GitHub API 请求失败。",
          suggestion: "请检查 GITHUB_TOKEN 是否有效。",
        }}
      />
    );

    expect(screen.getByText("发生错误")).toBeInTheDocument();
    expect(screen.getByText("GitHub API 请求失败。")).toBeInTheDocument();
    expect(
      screen.getByText("请检查 GITHUB_TOKEN 是否有效。")
    ).toBeInTheDocument();
  });

  test("error 状态无 error 对象不渲染", () => {
    const { container } = render(<ReviewProgress status="error" />);
    expect(container.firstChild).toBeNull();
  });
});
