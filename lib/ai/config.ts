export type DeepSeekConfig = {
  apiKey: string;
  modelId: string;
};

type EnvLike = {
  DEEPSEEK_API_KEY?: string;
  DEEPSEEK_MODEL?: string;
};

export function getDeepSeekConfig(
  env?: EnvLike
): DeepSeekConfig {
  const source = env ?? process.env;
  const apiKey = source.DEEPSEEK_API_KEY?.trim();
  const modelId = source.DEEPSEEK_MODEL?.trim() || "deepseek-v4-flash";

  if (!apiKey) {
    throw new Error(
      "缺少 DEEPSEEK_API_KEY，请在 .env.local 中配置后再调用真实模型。"
    );
  }

  return { apiKey, modelId };
}
