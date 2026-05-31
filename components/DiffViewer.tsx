"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, MessageSquarePlus, Send } from "lucide-react";
import type { ReviewDraftComment } from "@/lib/review-draft/schema";

export type InlineReviewItem = {
  id: string;
  path: string;
  line?: number;
  title: string;
  body: string;
  severity?: string;
  confidence?: string;
  canPublish?: boolean;
  blockedReason?: string;
  source?: "risk" | "suggestion";
};

type DiffViewerProps = {
  diffText: string;
  maxHeight?: string;
  selectedTarget?: {
    path: string;
    line?: number;
  } | null;
  inlineReviews?: InlineReviewItem[];
  onAddComment?: (item: InlineReviewItem) => void;
  onPublishReview?: (item: InlineReviewItem) => void;
};

function classifyLine(line: string): {
  type: "add" | "del" | "hunk" | "header" | "context";
} {
  if (line.startsWith("+") && !line.startsWith("+++")) return { type: "add" };
  if (line.startsWith("-") && !line.startsWith("---")) return { type: "del" };
  if (line.startsWith("@@")) return { type: "hunk" };
  if (
    line.startsWith("diff --git") ||
    line.startsWith("--- ") ||
    line.startsWith("+++ ") ||
    line.startsWith("index ") ||
    line.startsWith("new file") ||
    line.startsWith("deleted file") ||
    line.startsWith("rename ") ||
    line.startsWith("similarity ")
  )
    return { type: "header" };
  return { type: "context" };
}

const typeStyle: Record<string, string> = {
  add: "bg-[#3fb950]/10 text-[#3fb950] border-l-2 border-[#3fb950]/50",
  del: "bg-[#f85149]/10 text-[#f85149] border-l-2 border-[#f85149]/50",
  hunk: "bg-[#58a6ff]/10 text-[#58a6ff] border-l-2 border-[#58a6ff]/30",
  header: "bg-[#21262d] text-[#8b949e] font-semibold",
  context: "text-[#8b949e]",
};

type DiffLine = {
  index: number;
  type: "add" | "del" | "hunk" | "header" | "context";
  content: string;
  path?: string;
  oldLine?: number;
  newLine?: number;
};

function LinePrefix(line: string, type: string): string {
  if (type === "add") return "+";
  if (type === "del") return "-";
  if (type === "hunk" || type === "header") return "";
  return " ";
}

export default function DiffViewer({
  diffText,
  maxHeight = "600px",
  selectedTarget,
  inlineReviews = [],
  onAddComment,
  onPublishReview,
}: DiffViewerProps) {
  const [expandedReviews, setExpandedReviews] = useState<Record<string, boolean>>({});
  const lineRefs = useRef<Record<string, HTMLElement | null>>({});
  const lines = useMemo(() => parseDiffLines(diffText), [diffText]);
  const reviewsByLocation = useMemo(
    () => groupInlineReviews(inlineReviews),
    [inlineReviews]
  );

  useEffect(() => {
    if (!selectedTarget) return;

    const key = toLocationKey(selectedTarget.path, selectedTarget.line);
    const target = lineRefs.current[key];
    target?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [selectedTarget]);

  if (!diffText.trim()) {
    return (
      <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-8 text-center text-sm text-[#8b949e]">
        暂无 diff 数据
      </div>
    );
  }

  const addedCount = lines.filter((l) => l.type === "add").length;
  const deletedCount = lines.filter((l) => l.type === "del").length;

  return (
    <div className="rounded-lg border border-[#30363d] shadow">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#30363d] px-4 py-2.5">
        <span className="text-xs font-medium text-[#c9d1d9]">
          差异 ({lines.length} 行)
        </span>
        <div className="flex gap-3 text-xs">
          <span className="text-[#3fb950]">+{addedCount}</span>
          <span className="text-[#f85149]">-{deletedCount}</span>
        </div>
      </div>

      {/* Diff content */}
      <div
        className="overflow-auto"
        style={{ maxHeight }}
      >
        <pre className="m-0 whitespace-pre text-xs leading-relaxed font-mono">
          {lines.map((line) => (
            <DiffCodeLine
              key={line.index}
              line={line}
              selectedTarget={selectedTarget}
              reviews={reviewsByLocation.get(toLocationKey(line.path, line.newLine)) ?? []}
              expandedReviews={expandedReviews}
              setExpandedReviews={setExpandedReviews}
              setLineRef={(element) => {
                const key = toLocationKey(line.path, line.newLine);
                if (key) lineRefs.current[key] = element;
              }}
              onAddComment={onAddComment}
              onPublishReview={onPublishReview}
            />
          ))}
        </pre>
      </div>
    </div>
  );
}

function DiffCodeLine({
  line,
  selectedTarget,
  reviews,
  expandedReviews,
  setExpandedReviews,
  setLineRef,
  onAddComment,
  onPublishReview,
}: {
  line: DiffLine;
  selectedTarget?: DiffViewerProps["selectedTarget"];
  reviews: InlineReviewItem[];
  expandedReviews: Record<string, boolean>;
  setExpandedReviews: (next: Record<string, boolean>) => void;
  setLineRef: (element: HTMLElement | null) => void;
  onAddComment?: (item: InlineReviewItem) => void;
  onPublishReview?: (item: InlineReviewItem) => void;
}) {
  const isSelected =
    selectedTarget?.path === line.path &&
    (!selectedTarget?.line || selectedTarget.line === line.newLine);

  return (
    <span ref={setLineRef} className="block">
      <code
        className={[
          "block px-4 py-[1px]",
          typeStyle[line.type],
          isSelected ? "ring-1 ring-inset ring-cyan-400 bg-cyan-400/10" : "",
        ].join(" ")}
        data-path={line.path}
        data-new-line={line.newLine}
      >
        <span className="mr-3 inline-block w-9 select-none text-right text-xs text-[#57606a]">
          {line.newLine ?? ""}
        </span>
        <span className="mr-2 inline-block w-3 select-none text-center text-xs text-[#8b949e]">
          {LinePrefix(line.content, line.type)}
        </span>
        {line.content}
      </code>

      {reviews.map((review) => {
        const expanded = expandedReviews[review.id] ?? true;
        return (
          <InlineReviewCard
            key={review.id}
            review={review}
            expanded={expanded}
            onToggle={() =>
              setExpandedReviews({
                ...expandedReviews,
                [review.id]: !expanded,
              })
            }
            onAddComment={onAddComment}
            onPublishReview={onPublishReview}
          />
        );
      })}
    </span>
  );
}

function InlineReviewCard({
  review,
  expanded,
  onToggle,
  onAddComment,
  onPublishReview,
}: {
  review: InlineReviewItem;
  expanded: boolean;
  onToggle: () => void;
  onAddComment?: (item: InlineReviewItem) => void;
  onPublishReview?: (item: InlineReviewItem) => void;
}) {
  return (
    <span className="mx-4 my-2 block overflow-hidden rounded-md border border-[#30363d] bg-[#0d1117] shadow-sm">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 border-b border-[#30363d] bg-[#161b22] px-3 py-2 text-left text-xs text-[#c9d1d9] focus-visible:ring-2 focus-visible:ring-cyan-400"
        aria-expanded={expanded}
        onClick={onToggle}
      >
        <span className="flex min-w-0 items-center gap-2">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="truncate font-semibold">{review.title}</span>
        </span>
        <span className="shrink-0 rounded-full border border-[#30363d] px-2 py-0.5 text-xs text-[#8b949e]">
          {review.canPublish === false ? "需人工确认" : "可写入 Review"}
        </span>
      </button>

      {expanded && (
        <span className="block space-y-3 px-3 py-3 text-xs">
          <span className="block whitespace-pre-wrap leading-relaxed text-[#c9d1d9]">
            {review.body}
          </span>
          {review.blockedReason && (
            <span className="block rounded-md border border-yellow-400/20 bg-yellow-400/10 px-3 py-2 text-yellow-400">
              {review.blockedReason}
            </span>
          )}
          <span className="flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md border border-[#30363d] bg-[#161b22] px-3 py-1.5 text-xs font-semibold text-[#c9d1d9] hover:bg-[#21262d] focus-visible:ring-2 focus-visible:ring-cyan-400"
              onClick={() => onAddComment?.(review)}
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
              补充 comment
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md bg-[#238636] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2ea043] disabled:cursor-not-allowed disabled:bg-[#21262d] disabled:text-[#57606a] focus-visible:ring-2 focus-visible:ring-cyan-400"
              disabled={review.canPublish === false}
              onClick={() => onPublishReview?.(review)}
            >
              <Send className="h-3.5 w-3.5" />
              写入 GitHub Review
            </button>
          </span>
        </span>
      )}
    </span>
  );
}

function parseDiffLines(diffText: string): DiffLine[] {
  let currentPath: string | undefined;
  let oldLine: number | undefined;
  let newLine: number | undefined;

  return diffText.split("\n").map((content, index): DiffLine => {
    const type = classifyLine(content).type;
    const diffMatch = content.match(/^diff --git a\/(.+?) b\/(.+)$/);
    if (diffMatch) {
      currentPath = diffMatch[2];
      oldLine = undefined;
      newLine = undefined;
    }

    const hunkMatch = content.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunkMatch) {
      oldLine = Number(hunkMatch[1]);
      newLine = Number(hunkMatch[2]);
      return { index, type, content, path: currentPath };
    }

    const line: DiffLine = {
      index,
      type,
      content,
      path: currentPath,
      oldLine,
      newLine,
    };

    if (type === "add") {
      newLine = newLine === undefined ? undefined : newLine + 1;
    } else if (type === "del") {
      oldLine = oldLine === undefined ? undefined : oldLine + 1;
      line.newLine = undefined;
    } else if (type === "context") {
      oldLine = oldLine === undefined ? undefined : oldLine + 1;
      newLine = newLine === undefined ? undefined : newLine + 1;
    }

    return line;
  });
}

function groupInlineReviews(items: InlineReviewItem[]) {
  return items.reduce<Map<string, InlineReviewItem[]>>((groups, item) => {
    const key = toLocationKey(item.path, item.line);
    if (!key) return groups;
    groups.set(key, [...(groups.get(key) ?? []), item]);
    return groups;
  }, new Map());
}

function toLocationKey(path?: string, line?: number) {
  if (!path || !line) return "";
  return `${path}:${line}`;
}

export function mapDraftCommentToInlineReview(
  comment: ReviewDraftComment,
  index: number
): InlineReviewItem {
  return {
    id: `draft-${index}-${comment.path}-${comment.line ?? "file"}`,
    path: comment.path,
    line: comment.line,
    title: comment.source === "risk" ? "AI 风险评论" : "AI Review 建议",
    body: comment.body,
    severity: comment.severity,
    confidence: comment.confidence,
    canPublish: comment.canPublish,
    blockedReason: comment.blockedReason,
    source: comment.source,
  };
}
