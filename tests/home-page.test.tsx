import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HomePage from "@/app/page";

function createAnalysisPayload(options: {
  title: string;
  file: string;
  riskTitle: string;
  prNumber: number;
}) {
  return {
    report: {
      summary: {
        title: options.title,
        overview: `${options.title} 的变更说明。`,
        changedModules: [options.file],
        testSummary: "未看到测试文件变更。"
      },
      reviewFocus: [
        {
          file: options.file,
          reason: "该文件包含核心变更，需要优先审查。",
          priority: "high"
        }
      ],
      risks: [
        {
          severity: "major",
          confidence: "high",
          category: "security",
          file: options.file,
          line: 1,
          title: options.riskTitle,
          evidence: "diff 命中高风险变更。",
          impact: "可能影响线上行为。"
        }
      ],
      suggestions: [
        {
          severity: "major",
          confidence: "high",
          file: options.file,
          line: 1,
          problem: options.riskTitle,
          recommendation: "补充边界校验后再合并。",
          rationale: "降低回归风险。"
        }
      ],
      contextNotes: {
        contextUsed: ["PR 元信息", "文件 diff"],
        limitations: [],
        modelStrategy: "DeepSeek 结构化输出"
      }
    },
    reviewerAnalyses: [],
    reviewDraft: {
      publishableCount: 1,
      blockedCount: 0,
      comments: [
        {
          path: options.file,
          line: 1,
          side: "RIGHT",
          body: options.riskTitle,
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
      pullNumber: options.prNumber,
      payload: {
        event: "COMMENT",
        body: "dry-run",
        comments: [
          {
            path: options.file,
            line: 1,
            side: "RIGHT",
            body: options.riskTitle
          }
        ]
      },
      publishableCount: 1,
      blockedCount: 0,
      blockedComments: [],
      dryRun: true
    },
    context: {
      prUrl: `https://github.com/octocat/hello-world/pull/${options.prNumber}`,
      author: "octocat",
      avatarUrl: "https://avatars.githubusercontent.com/u/583231?v=4",
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
        `diff --git a/${options.file} b/${options.file}`,
        `--- a/${options.file}`,
        `+++ b/${options.file}`,
        "@@ -1,3 +1,4 @@",
        "-oldCall();",
        "+newCall();"
      ].join("\n")
    }
  };
}

describe("HomePage", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("完成态展示非空 diff 内容", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            reviewers: [
              {
                id: "fast-reviewer",
                name: "快速上下文 reviewer",
                role: "fast",
                provider: "deepseek",
                model: "deepseek-v4-flash",
                trigger: "always",
                focus: ["summary", "risk"]
              }
            ]
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" }
          }
        )
      )
      .mockResolvedValueOnce(
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
            reviewerAnalyses: [
              {
                reviewerId: "fast-reviewer",
                reviewerName: "快速上下文 reviewer",
                role: "fast",
                model: "deepseek-v4-flash",
                trigger: "always",
                summary: "本次 PR 更新 session refresh 逻辑。",
                riskCount: 1,
                suggestionCount: 1,
                limitations: []
              }
            ],
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
    vi.stubGlobal("fetch", fetchMock);

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText("选择 AI reviewer")).toBeInTheDocument();
    });
    await user.click(screen.getByLabelText(/快速上下文 reviewer/));
    await user.type(
      screen.getByPlaceholderText("https://github.com/owner/repo/pull/123"),
      "https://github.com/octocat/hello-world/pull/42"
    );
    await user.type(
      screen.getByPlaceholderText(/重点检查并发安全/),
      "重点检查缓存一致性"
    );
    await user.click(screen.getByRole("button", { name: "分析" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /核心隐患审计/ })).toBeEnabled();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/analyze-pr",
      expect.objectContaining({
        body: JSON.stringify({
          prUrl: "https://github.com/octocat/hello-world/pull/42",
          reviewerIds: ["fast-reviewer"],
          userPrompt: "重点检查缓存一致性"
        })
      })
    );
    expect(screen.getByText("多模型 reviewer")).toBeInTheDocument();
    expect(screen.getByText("快速上下文 reviewer")).toBeInTheDocument();
    expect(screen.getByText("deepseek-v4-flash")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /核心隐患审计/ }));

    expect(screen.queryByText("暂无 diff 数据")).not.toBeInTheDocument();
    expect(
      screen.getByText(/diff --git a\/src\/auth\/session.ts/)
    ).toBeInTheDocument();
    expect(screen.getByText("AI 风险评论")).toBeInTheDocument();
    expect(screen.getByText("刷新 token 前需要确认用户状态。")).toBeInTheDocument();
    expect(screen.getByText("用户补充审查要求")).toBeInTheDocument();
    expect(screen.getByText("重点检查缓存一致性")).toBeInTheDocument();
  });

  test("重新分析时清理上一轮风险筛选状态", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ reviewers: [] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify(
            createAnalysisPayload({
              title: "更新鉴权流程",
              file: "src/auth/session.ts",
              riskTitle: "刷新 token 前需要确认用户状态",
              prNumber: 42
            })
          ),
          {
            status: 200,
            headers: { "content-type": "application/json" }
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify(
            createAnalysisPayload({
              title: "更新路由权限",
              file: "src/api/routes.ts",
              riskTitle: "缺少权限校验",
              prNumber: 43
            })
          ),
          {
            status: 200,
            headers: { "content-type": "application/json" }
          }
        )
      );
    vi.stubGlobal("fetch", fetchMock);

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
    await user.click(screen.getByRole("button", { name: "定位到代码" }));
    expect(screen.getByLabelText("清除文件筛选")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /重新评审其他 PR/ }));
    await user.type(
      screen.getByPlaceholderText("https://github.com/owner/repo/pull/123"),
      "https://github.com/octocat/hello-world/pull/43"
    );
    await user.click(screen.getByRole("button", { name: "分析" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /核心隐患审计/ })).toBeEnabled();
    });
    await user.click(screen.getByRole("button", { name: /核心隐患审计/ }));

    await waitFor(() => {
      expect(screen.getAllByText("缺少权限校验").length).toBeGreaterThan(0);
    });
    expect(screen.queryByText("没有匹配的隐患记录")).not.toBeInTheDocument();
  });
});
