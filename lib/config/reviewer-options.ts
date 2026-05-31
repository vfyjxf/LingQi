import { loadLingQiConfig } from "@/lib/config/load-config";
import type { LingQiConfig, ReviewerRole, ReviewerTrigger } from "@/lib/config/schema";

export type ReviewerOption = {
  id: string;
  name: string;
  role: ReviewerRole;
  provider: string;
  model: string;
  trigger: ReviewerTrigger;
  focus: string[];
};

export type BuildReviewerOptionsParams = {
  loadConfig?: () => LingQiConfig;
};

export function buildReviewerOptions({
  loadConfig = () => loadLingQiConfig()
}: BuildReviewerOptionsParams = {}): ReviewerOption[] {
  const config = loadConfig();

  return config.reviewers
    .filter((reviewer) => reviewer.enabled)
    .map((reviewer) => ({
      id: reviewer.id,
      name: reviewer.name,
      role: reviewer.role,
      provider: reviewer.provider,
      model: reviewer.model,
      trigger: reviewer.trigger,
      focus: reviewer.focus
    }));
}
