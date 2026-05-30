import type { LingQiConfig } from "@/lib/config/schema";

export const defaultLingQiConfig: LingQiConfig = {
  ai: {
    provider: "deepseek",
    model: "deepseek-v4-flash",
    temperature: 0.2,
    maxOutputTokens: 4000,
    timeoutMs: 60000,
    strictSchema: true
  },
  review: {
    language: "zh-CN",
    tone: "direct",
    minConfidence: "medium",
    maxRisks: 8,
    maxSuggestions: 8,
    includeLowConfidenceNotes: true,
    requireEvidence: true
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
