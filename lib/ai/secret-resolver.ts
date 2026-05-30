type EnvLike = Record<string, string | undefined>;

export function resolveRequiredSecret(env: EnvLike, envName: string): string {
  const normalizedEnvName = envName.trim();
  const secret = env[normalizedEnvName]?.trim();

  if (!secret) {
    throw new Error(
      `缺少 ${normalizedEnvName}，请在 .env.local 中配置后再调用真实模型。`
    );
  }

  return secret;
}
