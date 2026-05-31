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
  add: "bg-[#3fb950]/10 text-[#3fb950] border-l-2 border-[#3fb950]/50",
  del: "bg-[#f85149]/10 text-[#f85149] border-l-2 border-[#f85149]/50",
  hunk: "bg-[#58a6ff]/10 text-[#58a6ff] border-l-2 border-[#58a6ff]/30",
  header: "bg-[#21262d] text-[#8b949e] font-semibold",
  context: "text-[#8b949e]",
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
            <code
              key={line.index}
              className={[
                "block px-4 py-[1px]",
                typeStyle[line.type],
              ].join(" ")}
            >
              <span className="mr-4 inline-block w-4 select-none text-right text-xs text-[#57606a]">
                {line.index + 1}
              </span>
              <span className="mr-2 inline-block w-3 select-none text-center text-xs text-[#8b949e]">
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
