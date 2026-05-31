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
        onPublishReview={onPublishReview}
      />
    );

    expect(screen.getByText("AI 风险评论")).toBeInTheDocument();
    expect(screen.getByText("需要确认 token 存在后再写入 session。")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /写入 GitHub Review/ }));

    expect(onPublishReview).toHaveBeenCalledTimes(1);
  });

  test("inline review 渲染受控 markdown 粗体内容", () => {
    render(
      <DiffViewer
        diffText={mockDiff}
        inlineReviews={[
          {
            id: "review-markdown",
            path: "src/auth.ts",
            line: 10,
            title: "AI 风险评论",
            body: "**风险：会话写入缺少保护**\n\n证据：token 未确认。",
            canPublish: true,
            source: "risk"
          }
        ]}
      />
    );

    expect(
      screen.getByText("风险：会话写入缺少保护").tagName
    ).toBe("STRONG");
    expect(screen.getByText("证据：token 未确认。")).toBeInTheDocument();
  });

  test("展示用户补充审查要求", () => {
    render(
      <DiffViewer
        diffText={mockDiff}
        reviewPrompt="重点检查缓存一致性"
      />
    );

    expect(screen.getByText("用户补充审查要求")).toBeInTheDocument();
    expect(screen.getByText("重点检查缓存一致性")).toBeInTheDocument();
  });

  test("inline review 长内容不使用裁剪样式", () => {
    const longBody =
      "建议：这里是一段很长的 Review 评论，需要完整展示给 reviewer 阅读，不能因为卡片宽度、pre 容器或标题区域而被截断。";
    const { container } = render(
      <DiffViewer
        diffText={mockDiff}
        inlineReviews={[
          {
            id: "review-long",
            path: "src/auth.ts",
            line: 10,
            title:
              "AI Review 建议标题很长也必须完整换行展示，不能只显示一半",
            body: longBody,
            canPublish: true,
            source: "suggestion"
          }
        ]}
      />
    );

    expect(screen.getByText(longBody)).toBeInTheDocument();
    expect(container.querySelector(".truncate")).not.toBeInTheDocument();
    expect(container.querySelector(".overflow-hidden")).not.toBeInTheDocument();
  });

  test("补充 comment 展开输入并保存到卡片内", async () => {
    const user = userEvent.setup();
    const onAddComment = vi.fn();

    render(
      <DiffViewer
        diffText={mockDiff}
        inlineReviews={[
          {
            id: "review-comment",
            path: "src/auth.ts",
            line: 10,
            title: "AI 风险评论",
            body: "需要补充上下文。",
            canPublish: true,
            source: "risk"
          }
        ]}
        onAddComment={onAddComment}
      />
    );

    await user.click(screen.getByRole("button", { name: /补充 comment/ }));
    await user.type(
      screen.getByPlaceholderText("补充给 reviewer 的上下文、疑问或修复建议..."),
      "这里需要确认登录失败分支。"
    );
    await user.click(screen.getByRole("button", { name: "保存补充" }));

    expect(screen.getByText("这里需要确认登录失败分支。")).toBeInTheDocument();
    expect(onAddComment).toHaveBeenCalledTimes(1);
  });
});
