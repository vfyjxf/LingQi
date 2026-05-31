import { z } from "zod";

const NonEmptyStringSchema = z.string().min(1);
const OptionalLineSchema = z.preprocess(
  (value) => (value === null || value === 0 ? undefined : value),
  z.number().int().positive().optional()
);

export const SeveritySchema = z.enum(["blocker", "major", "minor", "nit"]);
export const ConfidenceSchema = z.enum(["high", "medium", "low"]);
export const ReviewPrioritySchema = z.enum(["high", "medium", "low"]);
export const RiskCategorySchema = z.enum([
  "security",
  "data",
  "stability",
  "performance",
  "api",
  "testing",
  "maintainability"
]);

export const DimensionScoreSchema = z.object({
  dimension: RiskCategorySchema.describe(
    "评分的维度: security/data/stability/performance/api/testing/maintainability"
  ),
  score: z.number().int().min(0).max(100).describe(
    "0-100 质量评分: 0=阻断性问题, 100=无风险"
  ),
  severity: SeveritySchema.describe(
    "该维度最严重问题的级别: blocker/major/minor/nit"
  ),
  reasoning: z.string().min(1).describe(
    "先分析该维度发现的具体问题，再给出综合评分。这是推理过程。"
  ),
  evidence: z.string().min(1).describe(
    "引用具体文件名、行号和代码片段作为评分依据。不能是笼统描述。"
  )
});

export type DimensionScore = z.infer<typeof DimensionScoreSchema>;

export const RiskItemSchema = z.object({
  severity: SeveritySchema,
  confidence: ConfidenceSchema,
  category: RiskCategorySchema,
  file: NonEmptyStringSchema,
  line: OptionalLineSchema,
  title: NonEmptyStringSchema,
  evidence: NonEmptyStringSchema,
  impact: NonEmptyStringSchema
});

export const SuggestionItemSchema = z.object({
  severity: SeveritySchema,
  confidence: ConfidenceSchema,
  file: NonEmptyStringSchema,
  line: OptionalLineSchema,
  problem: NonEmptyStringSchema,
  recommendation: NonEmptyStringSchema,
  rationale: NonEmptyStringSchema
});

export const GroupAnalysisSchema = z.object({
  groupId: NonEmptyStringSchema,
  groupName: NonEmptyStringSchema,
  priority: ReviewPrioritySchema,
  summary: NonEmptyStringSchema,
  changedFiles: z.array(NonEmptyStringSchema),
  keyRisks: z.array(RiskItemSchema),
  reviewSuggestions: z.array(SuggestionItemSchema),
  contextUsed: z.array(NonEmptyStringSchema),
  limitations: z.array(NonEmptyStringSchema)
});

export const AiReviewReportSchema = z.object({
  summary: z.object({
    title: NonEmptyStringSchema,
    overview: NonEmptyStringSchema,
    changedModules: z.array(NonEmptyStringSchema),
    testSummary: NonEmptyStringSchema
  }),
  reviewFocus: z.array(
    z.object({
      file: NonEmptyStringSchema,
      reason: NonEmptyStringSchema,
      priority: ReviewPrioritySchema
    })
  ),
  risks: z.array(RiskItemSchema),
  suggestions: z.array(SuggestionItemSchema),
  groupAnalyses: z.array(GroupAnalysisSchema),
  dimensionScores: z.array(DimensionScoreSchema).length(7).describe(
    "7 个维度的评分数组: security/data/stability/performance/api/testing/maintainability 各一个"
  ),
  contextNotes: z.object({
    contextUsed: z.array(NonEmptyStringSchema),
    limitations: z.array(NonEmptyStringSchema),
    modelStrategy: NonEmptyStringSchema
  })
});

export type AiReviewReport = z.infer<typeof AiReviewReportSchema>;
export type Severity = z.infer<typeof SeveritySchema>;
export type Confidence = z.infer<typeof ConfidenceSchema>;
export type ReviewPriority = z.infer<typeof ReviewPrioritySchema>;
export type RiskCategory = z.infer<typeof RiskCategorySchema>;

export function parseAiReviewReport(input: unknown): AiReviewReport {
  return AiReviewReportSchema.parse(input);
}
