import { z } from "zod";

export const AiProviderNameSchema = z.enum(["deepseek"]);
export const ReviewLanguageSchema = z.enum(["zh-CN", "en-US"]);
export const ReviewToneSchema = z.enum(["direct", "friendly"]);
export const ReviewConfidenceSchema = z.enum(["high", "medium", "low"]);
export const ReviewPriorityConfigSchema = z.enum(["high", "medium", "low"]);

export const ReviewProfileGroupSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: z.string().trim().min(1).optional(),
  priority: ReviewPriorityConfigSchema,
  match: z.object({
    paths: z.array(z.string().trim().min(1)).default([]),
    keywords: z.array(z.string().trim().min(1)).default([])
  }),
  context: z.object({
    maxFiles: z.number().int().min(1).max(100),
    maxPatchCharsPerFile: z.number().int().min(1000).max(50000)
  }),
  reviewPrompts: z.array(z.string().trim().min(1)).default([]),
  githubReview: z
    .object({
      allowDraftComments: z.boolean(),
      minConfidence: ReviewConfidenceSchema
    })
    .optional()
});

export const ReviewProfileSchema = z.object({
  groups: z.array(ReviewProfileGroupSchema),
  fallbackGroup: z.object({
    id: z.string().trim().min(1),
    name: z.string().trim().min(1),
    priority: ReviewPriorityConfigSchema
  })
});

export const LingQiConfigSchema = z.object({
  ai: z.object({
    provider: AiProviderNameSchema,
    model: z.string().min(1),
    apiKeyEnv: z.string().trim().min(1),
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
  reviewProfile: ReviewProfileSchema,
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
export type ReviewPriorityConfig = z.infer<typeof ReviewPriorityConfigSchema>;
export type ReviewProfile = z.infer<typeof ReviewProfileSchema>;
export type ReviewProfileGroup = z.infer<typeof ReviewProfileGroupSchema>;
