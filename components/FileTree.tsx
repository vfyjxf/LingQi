"use client";

import { useState, useMemo } from "react";

export type FileEntry = {
  filename: string;
  status: string;
};

type FileTreeProps = {
  files: FileEntry[];
  riskCounts: Record<string, number>;
  onFileSelect?: (filename: string) => void;
};

export default function FileTree({
  files,
  riskCounts,
  onFileSelect,
}: FileTreeProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return files;
    const q = search.toLowerCase();
    return files.filter(
      (f) =>
        f.filename.toLowerCase().includes(q) ||
        f.filename.split("/").pop()?.toLowerCase().includes(q)
    );
  }, [files, search]);

  function displayName(filename: string): string {
    return filename.split("/").pop() || filename;
  }

  const statusColor: Record<string, string> = {
    added: "text-[#3fb950]",
    modified: "text-[#d29922]",
    removed: "text-[#f85149]",
    renamed: "text-[#8957e5]",
  };

  return (
    <div className="rounded-lg border border-[#30363d] bg-[#161b22] shadow">
      {/* Header */}
      <div className="border-b border-[#30363d] px-4 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[#8b949e]">
          变更文件 ({files.length})
        </h3>
      </div>

      {/* Search */}
      <div className="border-b border-[#30363d] px-4 py-2">
        <input
          className="w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-1.5 text-xs text-[#c9d1d9] outline-none placeholder:text-[#57606a] focus:border-[#58a6ff]/50"
          placeholder="搜索文件..."
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* File list */}
      <ul className="max-h-[400px] overflow-y-auto" role="listbox">
        {filtered.length === 0 && (
          <li className="px-4 py-6 text-center text-xs text-[#57606a]">
            {search ? "没有匹配的文件" : "暂无文件"}
          </li>
        )}

        {filtered.map((file) => {
          const riskCount = riskCounts[file.filename] ?? 0;

          return (
            <li
              key={file.filename}
              role="option"
              className="flex cursor-pointer items-center gap-3 border-b border-[#30363d] px-4 py-2.5 text-xs transition hover:bg-[#1c2128] last:border-none"
              onClick={() => onFileSelect?.(file.filename)}
            >
              {/* File status indicator */}
              <span
                className={[
                  "inline-block w-1.5 h-1.5 rounded-full shrink-0",
                  statusColor[file.status] || "text-[#8b949e]",
                ].join(" ")}
                title={file.status}
                style={{ backgroundColor: "currentColor" }}
              />

              {/* File name */}
              <button
                className="min-w-0 flex-1 truncate font-mono text-left text-[#c9d1d9] bg-transparent border-none cursor-pointer p-0"
                onClick={() => onFileSelect?.(file.filename)}
                aria-label={file.filename}
              >
                {displayName(file.filename)}
              </button>

              {/* Full path */}
              <span className="hidden truncate text-[#57606a] sm:inline">
                {file.filename}
              </span>

              {/* Risk count badge */}
              {riskCount > 0 && (
                <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#f85149]/10 px-1.5 text-[10px] font-semibold text-[#f85149]">
                  {riskCount}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
