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
    <form onSubmit={handleSubmit} className="w-full max-w-[560px] mx-auto">
      <div
        className={[
          "flex overflow-hidden rounded-lg border shadow-lg transition-all duration-200",
          "focus-within:border-cyan-300/50 focus-within:shadow-cyan-300/10",
          error
            ? "border-red-500/50 shadow-red-500/10"
            : "border-slate-700 shadow-slate-900/50",
        ].join(" ")}
      >
        <input
          className="min-h-11 flex-1 border-0 bg-slate-900 px-4 text-sm text-slate-100 outline-none placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="https://github.com/owner/repo/pull/123"
          type="text"
          value={inputUrl}
          disabled={isLoading}
          onChange={(e) => handleInput(e.target.value)}
        />
        <button
          className="min-h-11 shrink-0 bg-cyan-300 px-5 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
          type="submit"
          disabled={isLoading || inputUrl.trim() === ""}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
              分析中...
            </span>
          ) : (
            "分析"
          )}
        </button>
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
