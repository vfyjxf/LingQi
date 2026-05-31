"use client";

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
    <div className="mx-auto mt-6 w-full max-w-[560px] rounded-lg border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
      {/* ---- Progressing ---- */}
      {isProgressing && (
        <div className="flex flex-col items-center gap-2">
          <span className="text-xl text-slate-400 animate-pulse">&loz;</span>
          <span className="text-sm font-medium text-slate-200">
            {progressMessage || "处理中..."}
          </span>
          <div
            className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-800"
            role="progressbar"
            aria-label="评审进行中"
          >
            <div className="animate-progress-bar h-full w-[30%] rounded-full bg-cyan-400" />
          </div>
        </div>
      )}

      {/* ---- Done ---- */}
      {status === "done" && stats && (
        <div className="flex flex-col items-center gap-2">
          <span className="text-xl text-green-400">&check;</span>
          <span className="text-sm font-medium text-slate-200">评审完成</span>
          <div className="mt-1 flex gap-4 text-xs">
            <span className="text-slate-400">{stats.filesChanged} 个文件变更</span>
            <span className="font-semibold text-green-400">+{stats.linesAdded}</span>
            <span className="font-semibold text-red-400">-{stats.linesDeleted}</span>
            <span className="font-semibold text-purple-400">{stats.riskCount} 个风险</span>
          </div>
        </div>
      )}

      {/* ---- Error ---- */}
      {status === "error" && error && (
        <div className="flex flex-col items-center gap-2">
          <span className="text-xl text-red-400">&times;</span>
          <span className="text-sm font-medium text-slate-200">发生错误</span>
          <p className="text-center text-xs text-red-400">{error.message}</p>
          <p className="text-center text-xs text-slate-500">{error.suggestion}</p>
        </div>
      )}
    </div>
  );
}
