"use client";

import PrInput from "@/components/PrInput";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-16">
        <p className="mb-3 text-sm font-medium uppercase tracking-wide text-cyan-300">
          LingQi
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight md:text-6xl">
          AI Pull Request review reports for GitHub PRs.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
          Enter a GitHub Pull Request URL, fetch the code changes, and generate
          a structured report with summaries, risk findings, review suggestions,
          and context notes.
        </p>

        <div className="mt-10">
          <PrInput onAnalyze={() => {}} />
        </div>
      </section>
    </main>
  );
}
