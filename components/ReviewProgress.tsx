"use client";

import { Loader2, CheckCircle, X } from "lucide-react";

export type ReviewStatus = "idle" | "fetching" | "analyzing" | "scoring" | "done" | "error";

export type ReviewStats = {
  filesChanged: number;
  linesAdded: number;
  linesDeleted: number;
  riskCount: number;
};

export type ReviewError = {
  code: string;
  message: string;
  suggestion: string;
};

type ReviewProgressProps = {
  status: ReviewStatus;
  progressMessage?: string;
  stats?: ReviewStats;
  error?: ReviewError;
};

export default function ReviewProgress({
  status,
  progressMessage,
  stats,
  error,
}: ReviewProgressProps) {
  const isProgressing =
    status === "fetching" || status === "analyzing" || status === "scoring";

  if (status === "idle") return null;
  if (status === "done" && !stats) return null;
  if (status === "error" && !error) return null;

  return (
    <div className="mx-auto mt-6 w-full max-w-[560px] rounded-lg border border-[#30363d] bg-[#161b22] p-5 shadow-lg">
      {/* ---- Progressing ---- */}
      {isProgressing && (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-[#8b949e]" />
          <span className="text-sm font-medium text-[#c9d1d9]">
            {progressMessage || "处理中..."}
          </span>
          <div
            className="mt-1 h-1 w-full overflow-hidden rounded-full bg-[#21262d]"
            role="progressbar"
            aria-label="评审进行中"
          >
            <div className="animate-progress-bar h-full w-[30%] rounded-full bg-[#238636]" />
          </div>
        </div>
      )}

      {/* ---- Done ---- */}
      {status === "done" && stats && (
        <div className="flex flex-col items-center gap-2">
          <CheckCircle className="h-5 w-5 text-[#3fb950]" />
          <span className="text-sm font-medium text-[#c9d1d9]">评审完成</span>
          <div className="mt-1 flex gap-4 text-xs">
            <span className="text-[#8b949e]">{stats.filesChanged} 个文件变更</span>
            <span className="font-semibold text-[#3fb950]">+{stats.linesAdded}</span>
            <span className="font-semibold text-[#f85149]">-{stats.linesDeleted}</span>
            <span className="font-semibold text-[#8957e5]">{stats.riskCount} 个风险</span>
          </div>
        </div>
      )}

      {/* ---- Error ---- */}
      {status === "error" && error && (
        <div className="flex flex-col items-center gap-2">
          <X className="h-5 w-5 text-[#f85149]" />
          <span className="text-sm font-medium text-[#c9d1d9]">发生错误</span>
          <p className="text-center text-xs text-[#f85149]">{error.message}</p>
          <p className="text-center text-xs text-[#8b949e]">{error.suggestion}</p>
        </div>
      )}
    </div>
  );
}
