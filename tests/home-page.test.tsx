import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";

describe("HomePage", () => {
  test("初始状态显示标题和 PrInput", () => {
    render(<HomePage />);

    expect(screen.getByText("AI 驱动的代码审查")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("https://github.com/owner/repo/pull/123")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Analyze" })).toBeInTheDocument();
  });

  test("显示模拟错误状态按钮", () => {
    render(<HomePage />);
    expect(screen.getByText("模拟错误状态")).toBeInTheDocument();
  });

  test("ReviewProgress 在初始状态不渲染", () => {
    const { container } = render(<HomePage />);
    // Progress card wrapper shouldn't exist in initial hero state
    expect(
      container.querySelector(".ReviewProgress_card")
    ).toBeNull();
  });
});
