import { describe, expect, test, vi } from "vitest";
import { fetchGitHubPrData } from "@/lib/github/github-client";

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {})
    }
  });
}

describe("fetchGitHubPrData", () => {
  test("获取 PR 元信息、变更文件和提交记录", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          html_url: "https://github.com/octocat/hello-world/pull/42",
          number: 42,
          title: "Improve auth flow",
          body: "This PR updates session refresh.",
          user: { login: "octocat" },
          base: { ref: "main" },
          head: { ref: "feature/auth-refresh" },
          state: "open"
        })
      )
      .mockResolvedValueOnce(
        jsonResponse([
          {
            filename: "src/auth/session.ts",
            status: "modified",
            additions: 12,
            deletions: 4,
            changes: 16,
            patch: "@@ -1,3 +1,5 @@"
          }
        ])
      )
      .mockResolvedValueOnce(
        jsonResponse([
          {
            sha: "abc123",
            commit: { message: "fix auth refresh" }
          }
        ])
      );

    const result = await fetchGitHubPrData(
      {
        owner: "octocat",
        repo: "hello-world",
        pullNumber: 42
      },
      {
        fetchImpl
      }
    );

    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "https://api.github.com/repos/octocat/hello-world/pulls/42",
      expect.objectContaining({
        headers: expect.objectContaining({
          accept: "application/vnd.github+json"
        })
      })
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      "https://api.github.com/repos/octocat/hello-world/pulls/42/files?per_page=100",
      expect.any(Object)
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      3,
      "https://api.github.com/repos/octocat/hello-world/pulls/42/commits?per_page=100",
      expect.any(Object)
    );
    expect(result).toEqual({
      pullRequest: {
        url: "https://github.com/octocat/hello-world/pull/42",
        number: 42,
        title: "Improve auth flow",
        body: "This PR updates session refresh.",
        author: "octocat",
        baseRef: "main",
        headRef: "feature/auth-refresh",
        state: "open"
      },
      files: [
        {
          filename: "src/auth/session.ts",
          status: "modified",
          additions: 12,
          deletions: 4,
          changes: 16,
          patch: "@@ -1,3 +1,5 @@"
        }
      ],
      commits: [
        {
          sha: "abc123",
          message: "fix auth refresh"
        }
      ]
    });
  });

  test("配置 token 时发送 Authorization header", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          html_url: "https://github.com/octocat/hello-world/pull/42",
          number: 42,
          title: "Improve auth flow",
          body: null,
          user: { login: "octocat" },
          base: { ref: "main" },
          head: { ref: "feature/auth-refresh" },
          state: "open"
        })
      )
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse([]));

    await fetchGitHubPrData(
      {
        owner: "octocat",
        repo: "hello-world",
        pullNumber: 42
      },
      {
        token: "github-token",
        fetchImpl
      }
    );

    expect(fetchImpl).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: "Bearer github-token"
        })
      })
    );
  });

  test("GitHub API 返回失败状态时抛出可读错误", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({ message: "Not Found" }, { status: 404 })
      );

    await expect(
      fetchGitHubPrData(
        {
          owner: "octocat",
          repo: "missing-repo",
          pullNumber: 404
        },
        {
          fetchImpl
        }
      )
    ).rejects.toThrow("GitHub API 请求失败：404");
  });
});
