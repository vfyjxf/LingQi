"use client";

import PrInput from "@/components/PrInput";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex min-h-screen w-full max-w-[640px] flex-col items-center justify-center px-6 py-16 text-center">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
          LingQi
        </p>
        <h1 className="text-[28px] font-semibold leading-tight text-slate-50 md:text-[32px]">
          AI-Powered Code Review
        </h1>
        <p className="mt-2 text-base font-semibold text-slate-200">
          for Pull Requests
        </p>
        <p className="mt-5 max-w-md text-sm leading-relaxed text-slate-400">
          Paste any GitHub PR URL to get instant AI analysis — risk detection,
          change summary, and actionable suggestions.
        </p>

        <div className="mt-8 w-full">
          <PrInput onAnalyze={() => {}} />
        </div>
      </section>
    </main>
  );
}
