import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FileTree from "@/components/FileTree";
import type { FileEntry } from "@/components/FileTree";

const mockFiles: FileEntry[] = [
  { filename: "src/auth/login.ts", status: "modified" },
  { filename: "src/api/routes.ts", status: "added" },
  { filename: "src/utils/helper.ts", status: "removed" },
  { filename: "docs/README.md", status: "renamed" },
];

const riskCounts: Record<string, number> = {
  "src/auth/login.ts": 3,
  "src/api/routes.ts": 1,
};

describe("FileTree", () => {
  test("显示文件总数", () => {
    render(<FileTree files={mockFiles} riskCounts={{}} />);
    expect(screen.getByText("Changed Files (4)")).toBeInTheDocument();
  });

  test("显示所有文件名", () => {
    render(<FileTree files={mockFiles} riskCounts={{}} />);

    expect(screen.getByText("login.ts")).toBeInTheDocument();
    expect(screen.getByText("routes.ts")).toBeInTheDocument();
    expect(screen.getByText("helper.ts")).toBeInTheDocument();
    expect(screen.getByText("README.md")).toBeInTheDocument();
  });

  test("有风险的文件显示风险计数", () => {
    render(<FileTree files={mockFiles} riskCounts={riskCounts} />);

    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  test("搜索过滤文件列表", async () => {
    const user = userEvent.setup();
    render(<FileTree files={mockFiles} riskCounts={{}} />);

    const input = screen.getByPlaceholderText("Search files...");
    await user.type(input, "login");

    expect(screen.getByText("login.ts")).toBeInTheDocument();
    expect(screen.queryByText("routes.ts")).toBeNull();
  });

  test("搜索无结果时显示提示", async () => {
    const user = userEvent.setup();
    render(<FileTree files={mockFiles} riskCounts={{}} />);

    const input = screen.getByPlaceholderText("Search files...");
    await user.type(input, "zzz");

    expect(screen.getByText("没有匹配的文件")).toBeInTheDocument();
  });

  test("空文件列表显示提示", () => {
    render(<FileTree files={[]} riskCounts={{}} />);
    expect(screen.getByText("暂无文件")).toBeInTheDocument();
  });

  test("点击文件触发回调", async () => {
    const onFileSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <FileTree
        files={mockFiles}
        riskCounts={{}}
        onFileSelect={onFileSelect}
      />
    );

    await user.click(screen.getByText("login.ts"));
    expect(onFileSelect).toHaveBeenCalledWith("src/auth/login.ts");
  });
});
