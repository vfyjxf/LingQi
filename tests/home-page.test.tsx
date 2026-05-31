import { afterEach, describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HomePage from "@/app/page";

describe("HomePage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("完成态展示非空 diff 内容", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          report: {
            summary: {
              title: "更新鉴权流程",
              overview: "本次 PR 更新 session refresh 逻辑。",
              changedModules: ["src/auth/session.ts"],
              testSummary: "未看到测试文件变更。"
            },
            reviewFocus: [
              {
                file: "src/auth/session.ts",
                reason: "鉴权相关逻辑需要优先审查。",
                priority: "high"
              }
            ],
            risks: [
              {
                severity: "major",
                confidence: "high",
                category: "security",
                file: "src/auth/session.ts",
                line: 1,
                title: "刷新 token 前需要确认用户状态",
                evidence: "diff 修改了 refreshSession 分支。",
                impact: "禁用用户可能继续获得新 token。"
              }
            ],
            suggestions: [
              {
                severity: "major",
                confidence: "high",
                file: "src/auth/session.ts",
                line: 1,
                problem: "刷新 token 时没有重新检查用户状态。",
                recommendation: "刷新前查询用户状态。",
                rationale: "避免已禁用账号继续获得有效会话。"
              }
            ],
            contextNotes: {
              contextUsed: ["PR 元信息", "文件 diff"],
              limitations: [],
              modelStrategy: "DeepSeek 结构化输出"
            }
          },
          reviewDraft: {
            publishableCount: 1,
            blockedCount: 0,
            comments: [
              {
                path: "src/auth/session.ts",
                line: 1,
                side: "RIGHT",
                body: "刷新 token 前需要确认用户状态。",
                severity: "major",
                confidence: "high",
                source: "risk",
                canPublish: true
              }
            ]
          },
          reviewSubmitPlan: {
            owner: "octocat",
            repo: "hello-world",
            pullNumber: 42,
            payload: {
              event: "COMMENT",
              body: "dry-run",
              comments: [
                {
                  path: "src/auth/session.ts",
                  line: 1,
                  side: "RIGHT",
                  body: "刷新 token 前需要确认用户状态。"
                }
              ]
            },
            publishableCount: 1,
            blockedCount: 0,
            blockedComments: [],
            dryRun: true
          },
          context: {
            prUrl: "https://github.com/octocat/hello-world/pull/42",
            author: "octocat",
            avatarUrl:
              "https://avatars.githubusercontent.com/u/583231?v=4",
            changedFiles: 1,
            additions: 2,
            deletions: 1,
            audit: {
              enabled: false,
              totalGroups: 0,
              includedFiles: 0,
              omittedFiles: 0,
              truncatedFiles: 0,
              groups: [],
              omitted: [],
              truncated: [],
              limitations: []
            },
            diffText: [
              "diff --git a/src/auth/session.ts b/src/auth/session.ts",
              "--- a/src/auth/session.ts",
              "+++ b/src/auth/session.ts",
              "@@ -1,3 +1,4 @@",
              "-setSession(token);",
              "+if (token) setSession(token);"
            ].join("\n")
          }
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" }
        }
      )
    );
    vi.stubGlobal(
      "fetch",
      fetchMock
    );

    render(<HomePage />);

    await user.type(
      screen.getByPlaceholderText("https://github.com/owner/repo/pull/123"),
      "https://github.com/octocat/hello-world/pull/42"
    );
    await user.click(screen.getByRole("button", { name: "分析" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /核心隐患审计/ })).toBeEnabled();
    });
    await user.click(screen.getByRole("button", { name: /核心隐患审计/ }));

    expect(screen.queryByText("暂无 diff 数据")).not.toBeInTheDocument();
    expect(
      screen.getByText(/diff --git a\/src\/auth\/session.ts/)
    ).toBeInTheDocument();
    expect(screen.getByText("AI 风险评论")).toBeInTheDocument();
    expect(screen.getByText("刷新 token 前需要确认用户状态。")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "加入 Review" }));
    expect(screen.getByText("Pending Review (1)")).toBeInTheDocument();

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          dryRun: true,
          submitted: false,
          payload: {
            event: "COMMENT",
            body: "LingQi Review",
            comments: [
              {
                path: "src/auth/session.ts",
                line: 1,
                side: "RIGHT",
                body: "刷新 token 前需要确认用户状态。"
              }
            ]
          }
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" }
        }
      )
    );
    await user.click(screen.getByRole("button", { name: "提交 Review" }));

    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/submit-review",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("\"owner\":\"octocat\"")
      })
    );
    expect(
      await screen.findByText("dry-run：已准备一次性提交 1 条 Review 评论。")
    ).toBeInTheDocument();
  });
});
