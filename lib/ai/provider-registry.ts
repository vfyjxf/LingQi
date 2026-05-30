import { createVercelAiProvider } from "@/lib/ai/vercel-ai-provider";
import type { AiProvider } from "@/lib/ai/provider";

export type ProviderCreateOptions = {
  apiKey: string;
  modelId: string;
};

export function createProviderFromRegistry(
  provider: string,
  options: ProviderCreateOptions
): AiProvider {
  if (provider === "deepseek") {
    return createVercelAiProvider({
      apiKey: options.apiKey,
      modelId: options.modelId
    });
  }

  throw new Error(`不支持的 AI provider: ${provider}`);
}
