import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  submitReview,
  SubmitReviewInputError,
  SubmitReviewUpstreamError
} from "@/lib/api/submit-review";

vi.mock("@/lib/api/submit-review", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/submit-review")>(
    "@/lib/api/submit-review"
  );

  return {
    ...actual,
    submitReview: vi.fn()
  };
});

const submitReviewMock = vi.mocked(submitReview);

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/submit-review", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json"
    }
  });
}

describe("POST /api/submit-review", () => {
  beforeEach(() => {
    submitReviewMock.mockReset();
  });

  test("请求体不是有效 JSON 时返回 400", async () => {
    const { POST } = await import("@/app/api/submit-review/route");

    const response = await POST(
      new Request("http://localhost/api/submit-review", {
        method: "POST",
        body: "{",
        headers: {
          "content-type": "application/json"
        }
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "请求体不是有效 JSON"
    });
  });

  test("成功时返回提交结果", async () => {
    submitReviewMock.mockResolvedValueOnce({
      dryRun: true,
      submitted: false,
      payload: {
        event: "COMMENT",
        body: "LingQi Review",
        comments: [
          {
            path: "src/auth/session.ts",
            line: 42,
            side: "RIGHT",
            body: "刷新 token 前需要确认用户状态。"
          }
        ]
      }
    });
    const { POST } = await import("@/app/api/submit-review/route");

    const body = { owner: "octocat", repo: "hello-world" };
    const response = await POST(jsonRequest(body));

    expect(response.status).toBe(200);
    expect(submitReviewMock).toHaveBeenCalledWith({
      input: body,
      env: process.env
    });
    await expect(response.json()).resolves.toEqual({
      dryRun: true,
      submitted: false,
      payload: {
        event: "COMMENT",
        body: "LingQi Review",
        comments: [
          {
            path: "src/auth/session.ts",
            line: 42,
            side: "RIGHT",
            body: "刷新 token 前需要确认用户状态。"
          }
        ]
      }
    });
  });

  test("输入错误返回 400", async () => {
    submitReviewMock.mockRejectedValueOnce(
      new SubmitReviewInputError("Review 提交请求无效")
    );
    const { POST } = await import("@/app/api/submit-review/route");

    const response = await POST(jsonRequest({}));

    expect(response.status).toBe(400);
  });

  test("上游错误返回 502", async () => {
    submitReviewMock.mockRejectedValueOnce(
      new SubmitReviewUpstreamError("GitHub API 请求失败：422")
    );
    const { POST } = await import("@/app/api/submit-review/route");

    const response = await POST(jsonRequest({}));

    expect(response.status).toBe(502);
  });
});
