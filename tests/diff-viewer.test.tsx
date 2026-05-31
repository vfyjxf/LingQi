import { describe, expect, test } from "vitest";
import { vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DiffViewer from "@/components/DiffViewer";

const mockDiff = [
  "diff --git a/src/auth.ts b/src/auth.ts",
  "--- a/src/auth.ts",
  "+++ b/src/auth.ts",
  "@@ -10,6 +10,8 @@ export function login() {",
  " function login() {",
  "   const token = await api.login(user);",
  "-  setSession(token);",
  "-  window.location.href = '/dashboard';",
  "+  if (token) {",
  "+    setSession(token);",
  "+    window.location.href = '/dashboard';",
  "+  }",
  " }",
].join("\n");

describe("DiffViewer", () => {
  test("空 diff 显示占位提示", () => {
    render(<DiffViewer diffText="" />);
    expect(screen.getByText("暂无 diff 数据")).toBeInTheDocument();
  });

  test("显示行数统计", () => {
    render(<DiffViewer diffText={mockDiff} />);

    expect(screen.getByText(/\+4/)).toBeInTheDocument();
    expect(screen.getByText(/-2/)).toBeInTheDocument();
  });

  test("渲染 diff 内容行", () => {
    render(<DiffViewer diffText={mockDiff} />);

    expect(
      screen.getByText(/diff --git a\/src\/auth.ts b\/src\/auth.ts/)
    ).toBeInTheDocument();
    expect(screen.getByText(/@@ -10,6 \+10,8 @@/)).toBeInTheDocument();
  });

  test("渲染添加和删除行", () => {
    const { container } = render(<DiffViewer diffText={mockDiff} />);

    expect(container.textContent).toContain("-  setSession(token);");
    expect(container.textContent).toContain(
      "+    window.location.href = '/dashboard';"
    );
  });

  test("显示行号", () => {
    render(
      <DiffViewer
        diffText={[
          "diff --git a/src/plain.ts b/src/plain.ts",
          "--- a/src/plain.ts",
          "+++ b/src/plain.ts",
          "@@ -1,3 +1,3 @@",
          " line1",
          " line2",
          " line3"
        ].join("\n")}
      />
    );

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  test("在匹配代码行下展示 inline review 卡片并触发操作", async () => {
    const user = userEvent.setup();
    const onAddComment = vi.fn();
    const onPublishReview = vi.fn();

    render(
      <DiffViewer
        diffText={mockDiff}
        inlineReviews={[
          {
            id: "review-1",
            path: "src/auth.ts",
            line: 10,
            title: "AI 风险评论",
            body: "需要确认 token 存在后再写入 session。",
            canPublish: true,
            source: "risk"
          }
        ]}
        onAddComment={onAddComment}
        onPublishReview={onPublishReview}
      />
    );

    expect(screen.getByText("AI 风险评论")).toBeInTheDocument();
    expect(screen.getByText("需要确认 token 存在后再写入 session。")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /补充 comment/ }));
    await user.click(screen.getByRole("button", { name: /写入 GitHub Review/ }));

    expect(onAddComment).toHaveBeenCalledTimes(1);
    expect(onPublishReview).toHaveBeenCalledTimes(1);
  });
});
