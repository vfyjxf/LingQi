import { createVercelAiProvider } from "@/lib/ai/vercel-ai-provider";
import type { AiProvider } from "@/lib/ai/provider";
import type { AiModelConfig } from "@/lib/config/schema";

type EnvLike = Record<string, string | undefined>;

export type CreateAiProviderFromConfigOptions = {
  ai: AiModelConfig;
  env?: EnvLike;
};

export function createAiProviderFromConfig({
  ai,
  env = process.env
}: CreateAiProviderFromConfigOptions): AiProvider {
  if (ai.provider === "deepseek") {
    const apiKey = env.DEEPSEEK_API_KEY?.trim();

    if (!apiKey) {
      throw new Error(
        "缺少 DEEPSEEK_API_KEY，请在 .env.local 中配置后再调用真实模型。"
      );
    }

    return createVercelAiProvider({
      apiKey,
      modelId: ai.model
    });
  }

  const unsupportedProvider: never = ai.provider;
  throw new Error(`不支持的 AI provider: ${unsupportedProvider}`);
}
