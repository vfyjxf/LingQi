import { describe, expect, test, vi } from "vitest";
import {
  submitReview,
  SubmitReviewConfigError,
  SubmitReviewInputError,
  SubmitReviewUpstreamError
} from "@/lib/api/submit-review";
import { submitGitHubReview } from "@/lib/github/github-client";

vi.mock("@/lib/github/github-client", () => ({
  submitGitHubReview: vi.fn()
}));

const submitGitHubReviewMock = vi.mocked(submitGitHubReview);

const input = {
  owner: "octocat",
  repo: "hello-world",
  pullNumber: 42,
  body: "LingQi Review",
  comments: [
    {
      path: "src/auth/session.ts",
      line: 42,
      side: "RIGHT" as const,
      body: "刷新 token 前需要确认用户状态。"
    }
  ]
};

describe("submitReview", () => {
  test("dryRun 默认只返回提交预览", async () => {
    const result = await submitReview({ input });

    expect(submitGitHubReviewMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      dryRun: true,
      submitted: false,
      payload: {
        event: "COMMENT",
        body: "LingQi Review",
        comments: input.comments
      }
    });
  });

  test("dryRun 为 false 时调用 GitHub Review API", async () => {
    submitGitHubReviewMock.mockResolvedValueOnce({
      id: 1001,
      htmlUrl: "https://github.com/octocat/hello-world/pull/42#pullrequestreview-1001",
      state: "COMMENTED"
    });

    const result = await submitReview({
      input: { ...input, dryRun: false },
      env: { GITHUB_TOKEN: "github-token" }
    });

    expect(submitGitHubReviewMock).toHaveBeenCalledWith(
      {
        owner: "octocat",
        repo: "hello-world",
        pullNumber: 42,
        event: "COMMENT",
        body: "LingQi Review",
        comments: input.comments
      },
      { token: "github-token" }
    );
    expect(result.submitted).toBe(true);
    expect(result.review?.id).toBe(1001);
  });

  test("请求无效时抛出输入错误", async () => {
    await expect(submitReview({ input: { ...input, comments: [] } })).rejects.toBeInstanceOf(
      SubmitReviewInputError
    );
  });

  test("真实提交缺少 token 时抛出配置错误", async () => {
    await expect(
      submitReview({ input: { ...input, dryRun: false }, env: {} })
    ).rejects.toBeInstanceOf(SubmitReviewConfigError);
  });

  test("GitHub 写入失败时包装为上游错误", async () => {
    submitGitHubReviewMock.mockRejectedValueOnce(new Error("GitHub API 请求失败：422"));

    await expect(
      submitReview({
        input: { ...input, dryRun: false },
        env: { GITHUB_TOKEN: "github-token" }
      })
    ).rejects.toBeInstanceOf(SubmitReviewUpstreamError);
  });
});
