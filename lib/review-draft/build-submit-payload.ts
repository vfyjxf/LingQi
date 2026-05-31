import type {
  ReviewDraft,
  ReviewDraftComment,
  ReviewSubmitPayloadComment,
  ReviewSubmitPlan
} from "./schema";

export type BuildReviewSubmitPlanInput = {
  owner: string;
  repo: string;
  pullNumber: number;
  draft: ReviewDraft;
  body?: string;
};

export function buildReviewSubmitPlan({
  owner,
  repo,
  pullNumber,
  draft,
  body
}: BuildReviewSubmitPlanInput): ReviewSubmitPlan {
  const publishableComments = draft.comments.filter(isPublishableComment);
  const blockedComments = draft.comments.filter((comment) => !comment.canPublish);

  return {
    owner,
    repo,
    pullNumber,
    payload: {
      event: "COMMENT",
      body: body ?? buildDefaultReviewBody(publishableComments, blockedComments),
      comments: publishableComments.map(toSubmitPayloadComment)
    },
    publishableCount: publishableComments.length,
    blockedCount: blockedComments.length,
    blockedComments,
    dryRun: true
  };
}

function isPublishableComment(
  comment: ReviewDraftComment
): comment is ReviewDraftComment & { line: number } {
  return comment.canPublish && typeof comment.line === "number";
}

function toSubmitPayloadComment(
  comment: ReviewDraftComment & { line: number }
): ReviewSubmitPayloadComment {
  return {
    path: comment.path,
    line: comment.line,
    side: comment.side,
    body: comment.body
  };
}

function buildDefaultReviewBody(
  publishableComments: ReviewDraftComment[],
  blockedComments: ReviewDraftComment[]
): string {
  return [
    "LingQi 已生成本次 Pull Request 的 Review 评论草稿。",
    "",
    `可提交评论：${publishableComments.length}`,
    `已拦截评论：${blockedComments.length}`,
    "",
    "当前结果为 dry-run 预览，尚未写回 GitHub。"
  ].join("\n");
}
