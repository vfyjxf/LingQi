import type { GroupedChangeFile } from "@/lib/analysis/change-grouper";
import { compareReviewPriority } from "@/lib/analysis/review-profile";
import type { LingQiConfig, ReviewProfile } from "@/lib/config/schema";

type ContextConfig = LingQiConfig["context"];

export type PrContextBundle = {
  pr: {
    title: string;
    body: string | null;
    author: string;
    avatarUrl: string;
    url: string;
    baseRef: string;
    headRef: string;
    state: string;
  };
  stats: {
    changedFiles: number;
    additions: number;
    deletions: number;
    changes: number;
  };
  groups: PrContextBundleGroup[];
  limitations: string[];
};

export type PrContextBundleGroup = {
  id: string;
  name: string;
  description?: string;
  priority: "high" | "medium" | "low";
  reviewPrompts: string[];
  files: PrContextBundleFile[];
  budget: {
    maxFiles: number;
    maxPatchCharsPerFile: number;
    includedFiles: number;
    omittedFiles: number;
  };
};

export type PrContextBundleFile = {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  includedInPrompt: boolean;
  truncated: boolean;
  truncationReason?: string;
  riskHints: GroupedChangeFile["riskHints"];
  matchedBy: GroupedChangeFile["matchedBy"];
  matchedRules: string[];
};

export type BuildPrContextBundleOptions = {
  pr: PrContextBundle["pr"];
  stats: PrContextBundle["stats"];
  groupedFiles: GroupedChangeFile[];
  profile: ReviewProfile;
  contextConfig: ContextConfig;
};

type GroupWithFiles = {
  id: string;
  name: string;
  description?: string;
  priority: "high" | "medium" | "low";
  reviewPrompts: string[];
  context?: {
    maxFiles: number;
    maxPatchCharsPerFile: number;
  };
  groupIndex: number;
  files: GroupedChangeFile[];
};

export function buildPrContextBundle({
  pr,
  stats,
  groupedFiles,
  profile,
  contextConfig
}: BuildPrContextBundleOptions): PrContextBundle {
  const limitations: string[] = [];
  const groups = getGroupsWithFiles(groupedFiles, profile).map((group) =>
    buildBundleGroup(group, limitations)
  );

  if (
    stats.changedFiles >= contextConfig.largePrThreshold.changedFiles ||
    stats.changes >= contextConfig.largePrThreshold.changes
  ) {
    limitations.push(
      `该 PR 属于大 PR：${stats.changedFiles} 个文件、${stats.changes} 行变更，部分上下文可能被截断或省略。`
    );
  }

  return {
    pr,
    stats,
    groups,
    limitations
  };
}

function getGroupsWithFiles(
  groupedFiles: GroupedChangeFile[],
  profile: ReviewProfile
): GroupWithFiles[] {
  return profile.groups
    .map((group, groupIndex): GroupWithFiles => ({
      id: group.id,
      name: group.name,
      description: group.description,
      priority: group.priority,
      reviewPrompts: group.reviewPrompts,
      context: group.context,
      groupIndex,
      files: groupedFiles.filter((file) => file.groupId === group.id)
    }))
    .concat([
      {
        id: profile.fallbackGroup.id,
        name: profile.fallbackGroup.name,
        priority: profile.fallbackGroup.priority,
        reviewPrompts: [],
        groupIndex: profile.groups.length,
        files: groupedFiles.filter(
          (file) => file.groupId === profile.fallbackGroup.id
        )
      }
    ])
    .filter((group) => group.files.length > 0)
    .sort((left, right) => {
      const priorityDelta = compareReviewPriority(
        left.priority,
        right.priority
      );

      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      return left.groupIndex - right.groupIndex;
    });
}

function buildBundleGroup(
  group: GroupWithFiles,
  limitations: string[]
): PrContextBundleGroup {
  const maxFiles = group.context?.maxFiles ?? group.files.length;
  const maxPatchCharsPerFile =
    group.context?.maxPatchCharsPerFile ?? Number.POSITIVE_INFINITY;

  const files = group.files.map((file, index) => {
    if (index >= maxFiles) {
      return {
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
        includedInPrompt: false,
        truncated: false,
        truncationReason: `超过 ${group.name} 分组文件数量预算`,
        riskHints: file.riskHints,
        matchedBy: file.matchedBy,
        matchedRules: file.matchedRules
      };
    }

    return buildIncludedFile(file, maxPatchCharsPerFile, limitations);
  });

  const omittedFiles = files.filter((file) => !file.includedInPrompt).length;
  if (omittedFiles > 0) {
    limitations.push(
      `${group.name} 分组省略 ${omittedFiles} 个文件，超过 maxFiles=${maxFiles}。`
    );
  }

  return {
    id: group.id,
    name: group.name,
    description: group.description,
    priority: group.priority,
    reviewPrompts: group.reviewPrompts,
    files,
    budget: {
      maxFiles,
      maxPatchCharsPerFile:
        maxPatchCharsPerFile === Number.POSITIVE_INFINITY
          ? 0
          : maxPatchCharsPerFile,
      includedFiles: files.length - omittedFiles,
      omittedFiles
    }
  };
}

function buildIncludedFile(
  file: GroupedChangeFile,
  maxPatchCharsPerFile: number,
  limitations: string[]
): PrContextBundleFile {
  const patch = file.patch;

  if (patch && patch.length > maxPatchCharsPerFile) {
    limitations.push(
      `${file.filename} patch 已截断到 ${maxPatchCharsPerFile} 字符。`
    );

    return {
      filename: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
      patch: `${patch.slice(
        0,
        maxPatchCharsPerFile
      )}\n[已截断：超过分组 patch 字符预算]`,
      includedInPrompt: true,
      truncated: true,
      truncationReason: "超过分组 patch 字符预算",
      riskHints: file.riskHints,
      matchedBy: file.matchedBy,
      matchedRules: file.matchedRules
    };
  }

  return {
    filename: file.filename,
    status: file.status,
    additions: file.additions,
    deletions: file.deletions,
    changes: file.changes,
    patch,
    includedInPrompt: true,
    truncated: false,
    riskHints: file.riskHints,
    matchedBy: file.matchedBy,
    matchedRules: file.matchedRules
  };
}
