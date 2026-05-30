import type { ReviewPriorityConfig } from "@/lib/config/schema";

const PRIORITY_RANK: Record<ReviewPriorityConfig, number> = {
  high: 3,
  medium: 2,
  low: 1
};

export function compareReviewPriority(
  left: ReviewPriorityConfig,
  right: ReviewPriorityConfig
): number {
  return PRIORITY_RANK[right] - PRIORITY_RANK[left];
}

export function getReviewPriorityRank(priority: ReviewPriorityConfig): number {
  return PRIORITY_RANK[priority];
}
