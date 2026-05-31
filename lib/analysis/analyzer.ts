import type { AiProvider } from "@/lib/ai/provider";
import type { PrAnalysisContext } from "@/lib/analysis/context-builder";
import { normalizeGroupAnalysisContract } from "@/lib/analysis/group-analysis-contract";
import { parseAiReviewReport } from "@/lib/report/schema";

export async function analyzePrContext(
  context: PrAnalysisContext,
  provider: AiProvider
) {
  const report = await provider.analyze(context);
  return normalizeGroupAnalysisContract(parseAiReviewReport(report), context);
}
