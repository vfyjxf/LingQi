"use client";

import { useMemo } from "react";

type DiffViewerProps = {
  diffText: string;
  maxHeight?: string;
};

function classifyLine(line: string): {
  type: "add" | "del" | "hunk" | "header" | "context";
  lineNumber?: number;
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
  add: "bg-green-400/5 text-green-300 border-l-2 border-green-400/50",
  del: "bg-red-400/5 text-red-300 border-l-2 border-red-400/50",
  hunk: "bg-cyan-400/5 text-cyan-300 border-l-2 border-cyan-400/30",
  header: "bg-slate-800/50 text-slate-400 font-semibold",
  context: "text-slate-400",
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
}: DiffViewerProps) {
  const lines = useMemo(
    () =>
      diffText.split("\n").map((line, i) => ({
        index: i,
        ...classifyLine(line),
        content: line,
      })),
    [diffText]
  );

  if (!diffText.trim()) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-8 text-center text-sm text-slate-500">
        暂无 diff 数据
      </div>
    );
  }

  const addedCount = lines.filter((l) => l.type === "add").length;
  const deletedCount = lines.filter((l) => l.type === "del").length;

  return (
    <div className="rounded-lg border border-slate-800 shadow">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5">
        <span className="text-xs font-medium text-slate-300">
          Diff ({lines.length} 行)
        </span>
        <div className="flex gap-3 text-xs">
          <span className="text-green-400">+{addedCount}</span>
          <span className="text-red-400">-{deletedCount}</span>
        </div>
      </div>

      {/* Diff content */}
      <div
        className="overflow-auto"
        style={{ maxHeight }}
      >
        <pre className="m-0 whitespace-pre text-[11px] leading-relaxed font-mono">
          {lines.map((line) => (
            <code
              key={line.index}
              className={[
                "block px-4 py-[1px]",
                typeStyle[line.type],
              ].join(" ")}
            >
              <span className="mr-4 inline-block w-4 select-none text-right text-[10px] text-slate-600">
                {line.index + 1}
              </span>
              <span className="mr-2 inline-block w-3 select-none text-center text-[10px] text-slate-500">
                {LinePrefix(line.content, line.type)}
              </span>
              {line.content}
            </code>
          ))}
        </pre>
      </div>
    </div>
  );
}
