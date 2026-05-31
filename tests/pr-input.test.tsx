import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PrInput from "@/components/PrInput";

function renderPrInput(onAnalyze = vi.fn()) {
  return {
    user: userEvent.setup(),
    onAnalyze,
    ...render(<PrInput onAnalyze={onAnalyze} />)
  };
}

describe("PrInput", () => {
  test("输入框为空时 Analyze 按钮禁用", () => {
    renderPrInput();
    expect(screen.getByRole("button", { name: "分析" })).toBeDisabled();
  });

  test("输入非法 URL 后点击 Analyze 显示错误提示", async () => {
    const { user } = renderPrInput();

    const input = screen.getByPlaceholderText(
      "https://github.com/owner/repo/pull/123"
    );
    await user.type(input, "not-a-valid-url");
    await user.click(screen.getByRole("button", { name: "分析" }));

    expect(
      screen.getByText("请输入有效的 GitHub Pull Request 链接")
    ).toBeInTheDocument();
  });

  test("输入合法 GitHub PR 链接后点击 Analyze 调用 onAnalyze", async () => {
    const onAnalyze = vi.fn().mockResolvedValue(undefined);
    const { user } = renderPrInput(onAnalyze);

    const input = screen.getByPlaceholderText(
      "https://github.com/owner/repo/pull/123"
    );
    await user.type(input, "https://github.com/vercel/next.js/pull/123");
    await user.click(screen.getByRole("button", { name: "分析" }));

    expect(onAnalyze).toHaveBeenCalledWith(
      "https://github.com/vercel/next.js/pull/123",
      [],
      ""
    );
  });

  test("填写补充审查要求后提交 userPrompt", async () => {
    const onAnalyze = vi.fn().mockResolvedValue(undefined);
    const { user } = renderPrInput(onAnalyze);

    await user.type(
      screen.getByPlaceholderText("https://github.com/owner/repo/pull/123"),
      "https://github.com/vercel/next.js/pull/123"
    );
    await user.type(
      screen.getByPlaceholderText(/重点检查并发安全/),
      "重点检查缓存一致性"
    );
    await user.click(screen.getByRole("button", { name: "分析" }));

    expect(onAnalyze).toHaveBeenCalledWith(
      "https://github.com/vercel/next.js/pull/123",
      [],
      "重点检查缓存一致性"
    );
  });

  test("选择 reviewer 后提交 reviewerIds", async () => {
    const onAnalyze = vi.fn().mockResolvedValue(undefined);
    const { user } = {
      user: userEvent.setup(),
      ...render(
        <PrInput
          onAnalyze={onAnalyze}
          reviewers={[
            {
              id: "fast-reviewer",
              name: "快速上下文 reviewer",
              role: "fast",
              provider: "deepseek",
              model: "deepseek-v4-flash",
              trigger: "always",
              focus: ["summary", "risk"]
            }
          ]}
        />
      )
    };

    await user.click(screen.getByLabelText(/快速上下文 reviewer/));
    await user.type(
      screen.getByPlaceholderText("https://github.com/owner/repo/pull/123"),
      "https://github.com/vercel/next.js/pull/123"
    );
    await user.click(screen.getByRole("button", { name: "分析" }));

    expect(onAnalyze).toHaveBeenCalledWith(
      "https://github.com/vercel/next.js/pull/123",
      ["fast-reviewer"],
      ""
    );
  });

  test("输入时自动清除错误提示", async () => {
    const { user } = renderPrInput();

    const input = screen.getByPlaceholderText(
      "https://github.com/owner/repo/pull/123"
    );
    await user.type(input, "bad");
    await user.click(screen.getByRole("button", { name: "分析" }));

    expect(
      screen.getByText("请输入有效的 GitHub Pull Request 链接")
    ).toBeInTheDocument();

    await user.type(input, "x");

    expect(
      screen.queryByText("请输入有效的 GitHub Pull Request 链接")
    ).not.toBeInTheDocument();
  });

  test("onAnalyze 为异步时显示 loading 态", async () => {
    const onAnalyze = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );
    const { user } = renderPrInput(onAnalyze);

    const input = screen.getByPlaceholderText(
      "https://github.com/owner/repo/pull/123"
    );
    await user.type(input, "https://github.com/a/b/pull/1");
    await user.click(screen.getByRole("button", { name: "分析" }));

    expect(screen.getByText("分析中...")).toBeInTheDocument();
    expect(input).toBeDisabled();
  });
});
