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

export type ReviewSubmitPayloadComment = {
  path: string;
  line: number;
  side: "RIGHT";
  body: string;
};

export type ReviewSubmitPayload = {
  event: "COMMENT";
  body: string;
  comments: ReviewSubmitPayloadComment[];
};

export type ReviewSubmitPlan = {
  owner: string;
  repo: string;
  pullNumber: number;
  payload: ReviewSubmitPayload;
  publishableCount: number;
  blockedCount: number;
  blockedComments: ReviewDraftComment[];
  dryRun: true;
};
