"use client";

import { useState, type FormEvent } from "react";
import { parsePrUrl } from "@/lib/github/parse-pr-url";

type PrInputProps = {
  onAnalyze: (url: string) => void | Promise<void>;
};

export default function PrInput({ onAnalyze }: PrInputProps) {
  const [inputUrl, setInputUrl] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
      await onAnalyze(inputUrl);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl mx-auto">
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
    </form>
  );
}
