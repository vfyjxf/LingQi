import { loadLingQiConfig } from "@/lib/config/load-config";
import type { LingQiConfig } from "@/lib/config/schema";

type EnvLike = Record<string, string | undefined>;

export type ConfigHealthStatus = "ok" | "warning" | "error";

export type ConfigHealthCheck = {
  id: string;
  label: string;
  status: ConfigHealthStatus;
  message: string;
};

export type ConfigHealthReport = {
  status: ConfigHealthStatus;
  provider?: string;
  model?: string;
  checks: ConfigHealthCheck[];
};

export type BuildConfigHealthReportOptions = {
  env?: EnvLike;
  loadConfig?: () => LingQiConfig;
};

export function buildConfigHealthReport({
  env = process.env,
  loadConfig = () => loadLingQiConfig()
}: BuildConfigHealthReportOptions = {}): ConfigHealthReport {
  const checks: ConfigHealthCheck[] = [];
  let config: LingQiConfig;

  try {
    config = loadConfig();
    checks.push({
      id: "config",
      label: "配置文件",
      status: "ok",
      message: "LingQi 配置加载成功。"
    });
  } catch (error) {
    return {
      status: "error",
      checks: [
        {
          id: "config",
          label: "配置文件",
          status: "error",
          message:
            error instanceof Error ? error.message : "LingQi 配置加载失败。"
        }
      ]
    };
  }

  checks.push(checkAiSecret(config, env));
  checks.push(checkGitHubToken(env));
  checks.push(checkReviewProfile(config));

  return {
    status: getOverallStatus(checks),
    provider: config.ai.provider,
    model: config.ai.model,
    checks
  };
}

function checkAiSecret(
  config: LingQiConfig,
  env: EnvLike
): ConfigHealthCheck {
  const envName = config.ai.apiKeyEnv.trim();

  if (!env[envName]?.trim()) {
    return {
      id: "ai-secret",
      label: "AI 模型密钥",
      status: "error",
      message: `缺少 ${envName}，真实 AI 分析无法运行。`
    };
  }

  return {
    id: "ai-secret",
    label: "AI 模型密钥",
    status: "ok",
    message: `${envName} 已配置。`
  };
}

function checkGitHubToken(env: EnvLike): ConfigHealthCheck {
  if (!env.GITHUB_TOKEN?.trim()) {
    return {
      id: "github-token",
      label: "GitHub Token",
      status: "warning",
      message: "未配置 GITHUB_TOKEN，公开仓库可尝试运行，但更容易触发限流。"
    };
  }

  return {
    id: "github-token",
    label: "GitHub Token",
    status: "ok",
    message: "GITHUB_TOKEN 已配置。"
  };
}

function checkReviewProfile(config: LingQiConfig): ConfigHealthCheck {
  if (config.reviewProfile.groups.length === 0) {
    return {
      id: "review-profile",
      label: "Review Profile",
      status: "warning",
      message: "未配置自定义分组，分析会更多依赖默认兜底分类。"
    };
  }

  return {
    id: "review-profile",
    label: "Review Profile",
    status: "ok",
    message: `已配置 ${config.reviewProfile.groups.length} 个自定义 Review 分组。`
  };
}

function getOverallStatus(checks: ConfigHealthCheck[]): ConfigHealthStatus {
  if (checks.some((check) => check.status === "error")) {
    return "error";
  }

  if (checks.some((check) => check.status === "warning")) {
    return "warning";
  }

  return "ok";
}
