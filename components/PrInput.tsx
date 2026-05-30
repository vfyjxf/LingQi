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
    <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-5">
      <label
        className="mb-2 block text-sm font-medium text-slate-200"
        htmlFor="pr-url"
      >
        GitHub Pull Request URL
      </label>

      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            className="min-h-11 flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 text-slate-100 outline-none transition focus:border-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            id="pr-url"
            placeholder="https://github.com/owner/repo/pull/123"
            type="text"
            value={inputUrl}
            disabled={isLoading}
            onChange={(e) => handleInput(e.target.value)}
          />
          <button
            className="min-h-11 rounded-md bg-cyan-300 px-5 font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={isLoading || inputUrl.trim() === ""}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                Analyzing...
              </span>
            ) : (
              "Analyze"
            )}
          </button>
        </div>
      </form>

      {error && (
        <p className="mt-3 text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      {!error && (
        <p className="mt-3 text-sm text-slate-400">
          PR analysis will be added in follow-up changes.
        </p>
      )}
    </div>
  );
}
