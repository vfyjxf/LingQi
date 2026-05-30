import { minimatch } from "minimatch";
import type { RiskHint } from "@/lib/analysis/risk-hints";
import { getReviewPriorityRank } from "@/lib/analysis/review-profile";
import type { ReviewPriorityConfig, ReviewProfile } from "@/lib/config/schema";

export type ChangeGrouperFile = {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  riskHints: RiskHint[];
};

export type GroupedChangeFile = ChangeGrouperFile & {
  groupId: string;
  groupName: string;
  groupDescription?: string;
  priority: ReviewPriorityConfig;
  matchedBy: Array<"path" | "keyword" | "fallback">;
  matchedRules: string[];
};

type MatchCandidate = {
  groupIndex: number;
  groupId: string;
  groupName: string;
  groupDescription?: string;
  priority: ReviewPriorityConfig;
  matchedBy: Array<"path" | "keyword">;
  matchedRules: string[];
};

export function groupChangeFiles(
  files: ChangeGrouperFile[],
  profile: ReviewProfile
): GroupedChangeFile[] {
  return files.map((file) => {
    const candidates = profile.groups
      .map((group, groupIndex): MatchCandidate | null => {
        const matchedRules: string[] = [];
        const matchedBy = new Set<"path" | "keyword">();

        for (const pattern of group.match.paths) {
          if (minimatch(file.filename, pattern, { dot: true })) {
            matchedBy.add("path");
            matchedRules.push(`path:${pattern}`);
          }
        }

        const keywordSource = `${file.filename}\n${file.patch ?? ""}`.toLowerCase();
        for (const keyword of group.match.keywords) {
          if (keywordSource.includes(keyword.toLowerCase())) {
            matchedBy.add("keyword");
            matchedRules.push(`keyword:${keyword}`);
          }
        }

        if (matchedRules.length === 0) {
          return null;
        }

        return {
          groupIndex,
          groupId: group.id,
          groupName: group.name,
          groupDescription: group.description,
          priority: group.priority,
          matchedBy: Array.from(matchedBy),
          matchedRules
        };
      })
      .filter((candidate): candidate is MatchCandidate => candidate !== null);

    const selected = selectBestCandidate(candidates);

    if (!selected) {
      return {
        ...file,
        groupId: profile.fallbackGroup.id,
        groupName: profile.fallbackGroup.name,
        priority: profile.fallbackGroup.priority,
        matchedBy: ["fallback"],
        matchedRules: ["fallback"]
      };
    }

    return {
      ...file,
      groupId: selected.groupId,
      groupName: selected.groupName,
      groupDescription: selected.groupDescription,
      priority: selected.priority,
      matchedBy: selected.matchedBy,
      matchedRules: selected.matchedRules
    };
  });
}

function selectBestCandidate(
  candidates: MatchCandidate[]
): MatchCandidate | undefined {
  return [...candidates].sort((left, right) => {
    const priorityDelta =
      getReviewPriorityRank(right.priority) -
      getReviewPriorityRank(left.priority);

    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return left.groupIndex - right.groupIndex;
  })[0];
}
