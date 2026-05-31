import type { LingQiConfig } from "@/lib/config/schema";

export const defaultLingQiConfig: LingQiConfig = {
  ai: {
    provider: "deepseek",
    model: "deepseek-v4-flash",
    apiKeyEnv: "DEEPSEEK_API_KEY",
    temperature: 0.2,
    maxOutputTokens: 4000,
    timeoutMs: 60000,
    strictSchema: true
  },
  reviewers: [
    {
      id: "fast-reviewer",
      name: "快速上下文 reviewer",
      role: "fast",
      enabled: true,
      provider: "deepseek",
      model: "deepseek-v4-flash",
      apiKeyEnv: "DEEPSEEK_API_KEY",
      trigger: "always",
      focus: ["summary", "risk", "suggestion"]
    }
  ],
  review: {
    language: "zh-CN",
    tone: "direct",
    minConfidence: "medium",
    maxRisks: 8,
    maxSuggestions: 8,
    includeLowConfidenceNotes: true,
    requireEvidence: true
  },
  reviewProfile: {
    groups: [
      {
        id: "backend-analysis",
        name: "后端分析链路",
        description: "PR 解析、上下文构建、AI 编排和报告 schema",
        priority: "high",
        match: {
          paths: ["lib/api/**", "lib/analysis/**", "lib/report/**"],
          keywords: ["risk", "schema", "context", "analyze"]
        },
        context: {
          maxFiles: 12,
          maxPatchCharsPerFile: 12000
        },
        reviewPrompts: [
          "确认分析上下文是否足以支撑 Review 结论",
          "确认风险和建议是否有证据来源",
          "确认错误信息是否能帮助用户定位问题"
        ],
        githubReview: {
          allowDraftComments: true,
          minConfidence: "high"
        }
      },
      {
        id: "github-integration",
        name: "GitHub 集成",
        description: "GitHub API、PR 数据获取和 URL 解析",
        priority: "high",
        match: {
          paths: ["lib/github/**", "app/api/**"],
          keywords: ["github", "pull", "review", "diff"]
        },
        context: {
          maxFiles: 10,
          maxPatchCharsPerFile: 12000
        },
        reviewPrompts: [
          "确认 GitHub API 错误和限流提示是否清晰",
          "确认 PR 文件、提交和 diff 获取是否完整",
          "确认不会把密钥或 token 写入输出"
        ],
        githubReview: {
          allowDraftComments: true,
          minConfidence: "high"
        }
      },
      {
        id: "frontend-report",
        name: "前端报告展示",
        description: "首页和 Review 报告组件",
        priority: "medium",
        match: {
          paths: ["app/**", "components/**"],
          keywords: ["render", "loading", "error", "report"]
        },
        context: {
          maxFiles: 10,
          maxPatchCharsPerFile: 10000
        },
        reviewPrompts: [
          "确认用户能理解分析状态和错误原因",
          "确认风险、建议和上下文限制展示清晰"
        ],
        githubReview: {
          allowDraftComments: false,
          minConfidence: "high"
        }
      },
      {
        id: "tests",
        name: "测试覆盖",
        description: "单元测试和组件测试",
        priority: "medium",
        match: {
          paths: ["tests/**"],
          keywords: ["expect", "mock", "fixture"]
        },
        context: {
          maxFiles: 12,
          maxPatchCharsPerFile: 8000
        },
        reviewPrompts: [
          "确认测试是否覆盖核心分支",
          "确认测试名称能表达行为"
        ],
        githubReview: {
          allowDraftComments: false,
          minConfidence: "high"
        }
      },
      {
        id: "config",
        name: "配置与运行环境",
        description: "项目配置、依赖、脚本和运行说明",
        priority: "medium",
        match: {
          paths: [
            "package.json",
            "package-lock.json",
            "lingqi.config.json",
            "README.md",
            "*.config.*"
          ],
          keywords: ["config", "provider", "dependency", "script"]
        },
        context: {
          maxFiles: 8,
          maxPatchCharsPerFile: 10000
        },
        reviewPrompts: [
          "确认新增依赖已在 README 中说明",
          "确认配置默认值不会暴露密钥"
        ],
        githubReview: {
          allowDraftComments: false,
          minConfidence: "high"
        }
      }
    ],
    fallbackGroup: {
      id: "uncategorized",
      name: "未归类改动",
      priority: "medium"
    }
  },
  context: {
    maxFiles: 30,
    maxPatchCharsPerFile: 12000,
    includeCommits: true,
    includeRiskHints: true,
    largePrThreshold: {
      changedFiles: 20,
      changes: 800
    }
  },
  github: {
    apiBaseUrl: "https://api.github.com",
    requestTimeoutMs: 20000
  }
};
