import type { AiProvider } from "@/lib/ai/provider";
import { createProviderFromRegistry } from "@/lib/ai/provider-registry";
import { resolveRequiredSecret } from "@/lib/ai/secret-resolver";
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
  const apiKey = resolveRequiredSecret(env, ai.apiKeyEnv);

  return createProviderFromRegistry(ai.provider, {
    apiKey,
    modelId: ai.model
  });
}
