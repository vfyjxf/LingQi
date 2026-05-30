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
          AI 驱动的代码审查
        </h1>
        <p className="mt-2 text-base font-semibold text-slate-200">
          面向 GitHub Pull Requests
        </p>
        <p className="mt-5 max-w-md text-sm leading-relaxed text-slate-400">
          粘贴 GitHub PR 链接，即时获取 AI 分析 ——
          风险检测、变更摘要、可操作的改进建议。
        </p>

        <div className="mt-8 w-full">
          <PrInput onAnalyze={() => {}} />
        </div>
      </section>
    </main>
  );
}
