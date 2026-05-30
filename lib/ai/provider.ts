import type { PrAnalysisContext } from "@/lib/analysis/context-builder";
import type { AiReviewReport } from "@/lib/report/schema";

export type AiProvider = {
  analyze(context: PrAnalysisContext): Promise<unknown>;
};

export type ValidatedAiProvider = {
  analyze(context: PrAnalysisContext): Promise<AiReviewReport>;
};
