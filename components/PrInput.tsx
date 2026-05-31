"use client";

import { useState, type FormEvent } from "react";
import { parsePrUrl } from "@/lib/github/parse-pr-url";
import type { ReviewerOption } from "@/lib/config/reviewer-options";

type PrInputProps = {
  onAnalyze: (url: string, reviewerIds: string[]) => void | Promise<void>;
  reviewers?: ReviewerOption[];
};

export default function PrInput({ onAnalyze, reviewers = [] }: PrInputProps) {
  const [inputUrl, setInputUrl] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedReviewerIds, setSelectedReviewerIds] = useState<string[]>([]);

  function handleInput(value: string) {
    setInputUrl(value);
    if (error) setError("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    try {
      parsePrUrl(inputUrl);
    } catch {
      setError("请输入有效的 GitHub Pull Request 链接");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      await onAnalyze(inputUrl, selectedReviewerIds);
    } finally {
      setIsLoading(false);
    }
  }

  function toggleReviewer(reviewerId: string) {
    setSelectedReviewerIds((current) =>
      current.includes(reviewerId)
        ? current.filter((id) => id !== reviewerId)
        : [...current, reviewerId]
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl mx-auto space-y-4">
      <div
        className={[
          "flex overflow-hidden rounded-lg border shadow-lg transition-all duration-200",
          "focus-within:border-[#58a6ff]/50 focus-within:shadow-[#58a6ff]/10",
          error
            ? "border-[#f85149]/50 shadow-[#f85149]/10"
            : "border-[#30363d] shadow-slate-900/50",
        ].join(" ")}
      >
        <input
          className="min-h-11 flex-1 border-0 bg-[#0d1117] px-4 text-sm text-[#c9d1d9] outline-none placeholder:text-[#57606a] disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="https://github.com/owner/repo/pull/123"
          type="text"
          value={inputUrl}
          disabled={isLoading}
          onChange={(e) => handleInput(e.target.value)}
          aria-label="GitHub Pull Request 链接"
        />
        <button
          className="min-h-11 shrink-0 bg-[#238636] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#2ea043] disabled:cursor-not-allowed disabled:bg-[#21262d] disabled:text-[#57606a]"
          type="submit"
          disabled={isLoading || inputUrl.trim() === ""}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              分析中...
            </span>
          ) : (
            "分析"
          )}
        </button>
      </div>

      {error && (
        <p className="mt-2 text-xs text-[#f85149]" role="alert">
          {error}
        </p>
      )}

      {reviewers.length > 0 && (
        <fieldset className="rounded-lg border border-[#30363d] bg-[#0d1117] p-3">
          <legend className="px-1 text-xs font-semibold text-[#c9d1d9]">
            选择 AI reviewer
          </legend>
          <p className="mb-3 text-xs leading-relaxed text-[#8b949e]">
            不选择时使用自动策略；选择后只运行指定 reviewer。
          </p>
          <div className="grid gap-2">
            {reviewers.map((reviewer) => {
              const checked = selectedReviewerIds.includes(reviewer.id);
              return (
                <label
                  key={reviewer.id}
                  className={[
                    "flex cursor-pointer items-start gap-3 rounded-md border p-3 transition",
                    checked
                      ? "border-[#58a6ff]/60 bg-[#58a6ff]/10"
                      : "border-[#30363d] bg-[#161b22] hover:border-[#8c959f]"
                  ].join(" ")}
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-[#238636]"
                    checked={checked}
                    disabled={isLoading}
                    onChange={() => toggleReviewer(reviewer.id)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-[#c9d1d9]">
                      {reviewer.name}
                    </span>
                    <span className="mt-1 flex flex-wrap gap-1.5">
                      <ReviewerChip>{reviewer.role}</ReviewerChip>
                      <ReviewerChip>{reviewer.trigger}</ReviewerChip>
                      <ReviewerChip>{reviewer.model}</ReviewerChip>
                    </span>
                    {reviewer.focus.length > 0 && (
                      <span className="mt-1 block text-xs leading-relaxed text-[#8b949e]">
                        {reviewer.focus.join("、")}
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}
    </form>
  );
}

function ReviewerChip({ children }: { children: string }) {
  return (
    <span className="rounded border border-[#30363d] bg-[#0d1117] px-1.5 py-0.5 font-mono text-[11px] text-[#8b949e]">
      {children}
    </span>
  );
}
