import type { Confidence, Severity } from "@/lib/report/schema";

export type ReviewDraftComment = {
  path: string;
  line?: number;
  side: "RIGHT";
  body: string;
  severity: Exclude<Severity, "nit">;
  confidence: Confidence;
  source: "risk" | "suggestion";
  canPublish: boolean;
  blockedReason?: string;
};

export type ReviewDraft = {
  comments: ReviewDraftComment[];
  publishableCount: number;
  blockedCount: number;
};
