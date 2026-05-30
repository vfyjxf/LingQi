import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { defaultLingQiConfig } from "@/lib/config/default-config";
import {
  LingQiConfigSchema,
  type LingQiConfig
} from "@/lib/config/schema";

type LoadLingQiConfigOptions = {
  cwd?: string;
};

type JsonObject = Record<string, unknown>;

const CONFIG_FILES = ["lingqi.config.json", "lingqi.config.local.json"];

export function loadLingQiConfig(
  options: LoadLingQiConfigOptions = {}
): LingQiConfig {
  const cwd = options.cwd ?? process.cwd();
  const merged = CONFIG_FILES.reduce<unknown>(
    (config, filename) =>
      deepMerge(config, readConfigFileIfExists(cwd, filename)),
    defaultLingQiConfig
  );

  const result = LingQiConfigSchema.safeParse(merged);
  if (!result.success) {
    throw new Error(formatConfigError(result.error));
  }

  return result.data;
}

function readConfigFileIfExists(cwd: string, filename: string): unknown {
  const filepath = join(cwd, filename);
  if (!existsSync(filepath)) {
    return {};
  }

  try {
    return JSON.parse(readFileSync(filepath, "utf8"));
  } catch (error) {
    throw new Error(
      `读取配置文件 ${filename} 失败：${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

function deepMerge(base: unknown, override: unknown): unknown {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return override;
  }

  return Object.entries(override).reduce<JsonObject>(
    (merged, [key, value]) => ({
      ...merged,
      [key]: key in merged ? deepMerge(merged[key], value) : value
    }),
    { ...base }
  );
}

function isPlainObject(value: unknown): value is JsonObject {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function formatConfigError(error: z.ZodError): string {
  const issues = error.issues.map((issue) => {
    const path = issue.path.join(".") || "config";
    return `${path}: ${issue.message}`;
  });

  return `LingQi 配置无效：${issues.join("; ")}`;
}
