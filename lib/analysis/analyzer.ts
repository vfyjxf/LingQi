import type { AiProvider } from "@/lib/ai/provider";
import type { PrAnalysisContext } from "@/lib/analysis/context-builder";
import { parseAiReviewReport } from "@/lib/report/schema";

export async function analyzePrContext(
  context: PrAnalysisContext,
  provider: AiProvider
) {
  const report = await provider.analyze(context);
  return parseAiReviewReport(report);
}
