import { z } from "zod";

export const AiProviderNameSchema = z.enum(["deepseek"]);
export const ReviewLanguageSchema = z.enum(["zh-CN", "en-US"]);
export const ReviewToneSchema = z.enum(["direct", "friendly"]);
export const ReviewConfidenceSchema = z.enum(["high", "medium", "low"]);

export const LingQiConfigSchema = z.object({
  ai: z.object({
    provider: AiProviderNameSchema,
    model: z.string().min(1),
    temperature: z.number().min(0).max(1),
    maxOutputTokens: z.number().int().min(512).max(16000),
    timeoutMs: z.number().int().min(5000).max(180000),
    strictSchema: z.boolean()
  }),
  review: z.object({
    language: ReviewLanguageSchema,
    tone: ReviewToneSchema,
    minConfidence: ReviewConfidenceSchema,
    maxRisks: z.number().int().min(1).max(20),
    maxSuggestions: z.number().int().min(1).max(20),
    includeLowConfidenceNotes: z.boolean(),
    requireEvidence: z.boolean()
  }),
  context: z.object({
    maxFiles: z.number().int().min(1).max(100),
    maxPatchCharsPerFile: z.number().int().min(1000).max(50000),
    includeCommits: z.boolean(),
    includeRiskHints: z.boolean(),
    largePrThreshold: z.object({
      changedFiles: z.number().int().min(1),
      changes: z.number().int().min(1)
    })
  }),
  github: z.object({
    apiBaseUrl: z.string().url(),
    requestTimeoutMs: z.number().int().min(1000).max(120000)
  })
});

export type LingQiConfig = z.infer<typeof LingQiConfigSchema>;
export type AiProviderName = z.infer<typeof AiProviderNameSchema>;
export type AiModelConfig = LingQiConfig["ai"];
