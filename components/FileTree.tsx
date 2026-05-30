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
    added: "text-green-400",
    modified: "text-yellow-400",
    removed: "text-red-400",
    renamed: "text-purple-400",
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 shadow">
      {/* Header */}
      <div className="border-b border-slate-800 px-4 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Changed Files ({files.length})
        </h3>
      </div>

      {/* Search */}
      <div className="border-b border-slate-800 px-4 py-2">
        <input
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 outline-none placeholder:text-slate-600 focus:border-cyan-300/50"
          placeholder="Search files..."
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* File list */}
      <ul className="max-h-[400px] overflow-y-auto">
        {filtered.length === 0 && (
          <li className="px-4 py-6 text-center text-xs text-slate-600">
            {search ? "没有匹配的文件" : "暂无文件"}
          </li>
        )}

        {filtered.map((file) => {
          const riskCount = riskCounts[file.filename] ?? 0;

          return (
            <li
              key={file.filename}
              className="flex cursor-pointer items-center gap-3 border-b border-slate-800/50 px-4 py-2.5 text-xs transition hover:bg-slate-800/50 last:border-none"
              onClick={() => onFileSelect?.(file.filename)}
            >
              {/* File status indicator */}
              <span
                className={[
                  "inline-block w-1.5 h-1.5 rounded-full shrink-0",
                  statusColor[file.status] || "text-slate-500",
                ].join(" ")}
                title={file.status}
                style={{ backgroundColor: "currentColor" }}
              />

              {/* File name */}
              <span className="min-w-0 flex-1 truncate font-mono text-slate-300">
                {displayName(file.filename)}
              </span>

              {/* Full path */}
              <span className="hidden truncate text-slate-600 sm:inline">
                {file.filename}
              </span>

              {/* Risk count badge */}
              {riskCount > 0 && (
                <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-400/10 px-1.5 text-[10px] font-semibold text-red-400">
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
