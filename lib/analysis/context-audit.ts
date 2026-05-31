import type { PrContextBundle } from "@/lib/analysis/context-bundle";

export type ContextAuditFile = {
  filename: string;
  groupId: string;
  groupName: string;
  reason: string;
};

export type ContextAuditGroup = {
  id: string;
  name: string;
  priority: "high" | "medium" | "low";
  includedFiles: number;
  omittedFiles: number;
  truncatedFiles: number;
  maxFiles: number;
  maxPatchCharsPerFile: number;
};

export type ContextAuditSummary = {
  enabled: boolean;
  totalGroups: number;
  includedFiles: number;
  omittedFiles: number;
  truncatedFiles: number;
  groups: ContextAuditGroup[];
  omitted: ContextAuditFile[];
  truncated: ContextAuditFile[];
  limitations: string[];
};

export function buildContextAuditSummary(
  bundle?: PrContextBundle
): ContextAuditSummary {
  if (!bundle) {
    return {
      enabled: false,
      totalGroups: 0,
      includedFiles: 0,
      omittedFiles: 0,
      truncatedFiles: 0,
      groups: [],
      omitted: [],
      truncated: [],
      limitations: ["未启用 Review Profile，上下文未按分组预算审计。"]
    };
  }

  const groups = bundle.groups.map((group): ContextAuditGroup => {
    const truncatedFiles = group.files.filter((file) => file.truncated).length;

    return {
      id: group.id,
      name: group.name,
      priority: group.priority,
      includedFiles: group.budget.includedFiles,
      omittedFiles: group.budget.omittedFiles,
      truncatedFiles,
      maxFiles: group.budget.maxFiles,
      maxPatchCharsPerFile: group.budget.maxPatchCharsPerFile
    };
  });

  const omitted = bundle.groups.flatMap((group) =>
    group.files
      .filter((file) => !file.includedInPrompt)
      .map((file): ContextAuditFile => ({
        filename: file.filename,
        groupId: group.id,
        groupName: group.name,
        reason: file.truncationReason ?? "未纳入 Prompt"
      }))
  );

  const truncated = bundle.groups.flatMap((group) =>
    group.files
      .filter((file) => file.truncated)
      .map((file): ContextAuditFile => ({
        filename: file.filename,
        groupId: group.id,
        groupName: group.name,
        reason: file.truncationReason ?? "patch 已截断"
      }))
  );

  return {
    enabled: true,
    totalGroups: groups.length,
    includedFiles: groups.reduce((total, group) => total + group.includedFiles, 0),
    omittedFiles: omitted.length,
    truncatedFiles: truncated.length,
    groups,
    omitted,
    truncated,
    limitations: bundle.limitations
  };
}
