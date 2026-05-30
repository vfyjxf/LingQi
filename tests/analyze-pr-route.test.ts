import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  AnalyzePrInputError,
  AnalyzePrUpstreamError,
  type AnalyzePullRequestResult
} from "@/lib/api/analyze-pr";

const analyzePullRequestMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/analyze-pr", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/analyze-pr")>(
    "@/lib/api/analyze-pr"
  );

  return {
    ...actual,
    analyzePullRequest: analyzePullRequestMock
  };
});

const result: AnalyzePullRequestResult = {
  report: {
    summary: {
      title: "更新鉴权流程",
      overview: "本次 PR 更新 session refresh 逻辑。",
      changedModules: ["src/auth/session.ts"],
      testSummary: "未看到测试文件变更。"
    },
    reviewFocus: [],
    risks: [],
    suggestions: [],
    contextNotes: {
      contextUsed: ["PR 元信息", "文件 diff"],
      limitations: ["未读取完整仓库"],
      modelStrategy: "DeepSeek 结构化输出"
    }
  },
  context: {
    prUrl: "https://github.com/octocat/hello-world/pull/42",
    author: "octocat",
    avatarUrl: "https://avatars.githubusercontent.com/u/583231?v=4",
    changedFiles: 1,
    additions: 12,
    deletions: 4,
    diffText: [
      "diff --git a/src/auth/session.ts b/src/auth/session.ts",
      "--- a/src/auth/session.ts",
      "+++ b/src/auth/session.ts",
      "@@ -1,3 +1,5 @@"
    ].join("\n")
  }
};

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/analyze-pr", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json"
    }
  });
}

describe("POST /api/analyze-pr", () => {
  beforeEach(() => {
    analyzePullRequestMock.mockReset();
  });

  test("请求体不是有效 JSON 时返回 400", async () => {
    const { POST } = await import("@/app/api/analyze-pr/route");

    const response = await POST(
      new Request("http://localhost/api/analyze-pr", {
        method: "POST",
        body: "{",
        headers: {
          "content-type": "application/json"
        }
      })
    );

    expect(response.status).toBe(400);
    expect(analyzePullRequestMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error: "请求体不是有效 JSON"
    });
  });

  test("缺少 prUrl 时返回 400 JSON", async () => {
    analyzePullRequestMock.mockRejectedValue(
      new AnalyzePrInputError("请输入有效的 GitHub Pull Request 链接")
    );
    const { POST } = await import("@/app/api/analyze-pr/route");

    const response = await POST(jsonRequest({}));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "请输入有效的 GitHub Pull Request 链接"
    });
  });

  test("成功时返回 200 JSON", async () => {
    analyzePullRequestMock.mockResolvedValue(result);
    const { POST } = await import("@/app/api/analyze-pr/route");

    const response = await POST(
      jsonRequest({
        prUrl: "https://github.com/octocat/hello-world/pull/42"
      })
    );

    expect(response.status).toBe(200);
    expect(analyzePullRequestMock).toHaveBeenCalledWith({
      prUrl: "https://github.com/octocat/hello-world/pull/42",
      env: process.env
    });
    await expect(response.json()).resolves.toEqual(result);
  });

  test("上游失败时返回 502 JSON", async () => {
    analyzePullRequestMock.mockRejectedValue(
      new AnalyzePrUpstreamError("GitHub API 请求失败：404")
    );
    const { POST } = await import("@/app/api/analyze-pr/route");

    const response = await POST(
      jsonRequest({
        prUrl: "https://github.com/octocat/hello-world/pull/42"
      })
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "GitHub API 请求失败：404"
    });
  });
});
