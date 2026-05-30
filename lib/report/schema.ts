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
  risks: z.array(
    z.object({
      severity: SeveritySchema,
      confidence: ConfidenceSchema,
      category: RiskCategorySchema,
      file: NonEmptyStringSchema,
      line: OptionalLineSchema,
      title: NonEmptyStringSchema,
      evidence: NonEmptyStringSchema,
      impact: NonEmptyStringSchema
    })
  ),
  suggestions: z.array(
    z.object({
      severity: SeveritySchema,
      confidence: ConfidenceSchema,
      file: NonEmptyStringSchema,
      line: OptionalLineSchema,
      problem: NonEmptyStringSchema,
      recommendation: NonEmptyStringSchema,
      rationale: NonEmptyStringSchema
    })
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
