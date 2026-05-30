import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
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
    render(<DiffViewer diffText={"line1\nline2\nline3"} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});
