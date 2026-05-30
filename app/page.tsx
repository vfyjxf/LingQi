"use client";

import { useState, useCallback, useEffect } from "react";
import PrInput from "@/components/PrInput";
import ReviewProgress from "@/components/ReviewProgress";
import type { ReviewStatus } from "@/components/ReviewProgress";
import StatsPanel from "@/components/StatsPanel";
import type { StatsData } from "@/components/StatsPanel";
import FileTree from "@/components/FileTree";
import type { FileEntry } from "@/components/FileTree";
import RiskCard from "@/components/RiskCard";
import type { RiskFinding, Suggestion } from "@/components/RiskCard";
import DiffViewer from "@/components/DiffViewer";
import ReviewSummary from "@/components/ReviewSummary";
import type { ReviewSummaryData, ReviewSummaryMeta } from "@/components/ReviewSummary";
import {
  GitPullRequest,
  Sparkles,
  Shield,
  Zap,
  Code2,
  Layers,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  BarChart3,
  ShieldAlert,
} from "lucide-react";
import type { AiReviewReport } from "@/lib/report/schema";

/* ------------------------------------------------------------------ */
/* Types & mappings                                                     */
/* ------------------------------------------------------------------ */

type ReviewMode = "full" | "security" | "performance" | "logic";

type ApiResult = {
  report: AiReviewReport;
  context: { prUrl: string; changedFiles: number; additions: number; deletions: number };
};

function buildStats(report: AiReviewReport, ctx: ApiResult["context"]): StatsData {
  const risks = report.risks;
  const categoryCounts: Record<string, number> = {};
  for (const r of risks) {
    categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1;
  }
  return {
    filesChanged: ctx.changedFiles,
    linesAdded: ctx.additions,
    linesDeleted: ctx.deletions,
    riskCount: risks.length,
    blockerCount: risks.filter((r) => r.severity === "blocker").length,
    majorCount: risks.filter((r) => r.severity === "major").length,
    minorCount: risks.filter((r) => r.severity === "minor").length,
    nitCount: risks.filter((r) => r.severity === "nit").length,
    categoryCounts,
  };
}

function buildRiskFindings(report: AiReviewReport): { risks: RiskFinding[]; suggestions: Record<number, Suggestion> } {
  const risks: RiskFinding[] = report.risks.map((r) => ({
    severity: r.severity,
    category: r.category,
    file: r.file,
    line: r.line,
    title: r.title,
    evidence: r.evidence,
    impact: r.impact,
  }));
  const suggestions: Record<number, Suggestion> = {};
  report.suggestions.forEach((s, i) => {
    suggestions[i] = { problem: s.problem, recommendation: s.recommendation, rationale: s.rationale };
  });
  return { risks, suggestions };
}

function buildFilesFromRisks(risks: RiskFinding[]): FileEntry[] {
  const seen = new Set<string>();
  return risks
    .filter((r) => {
      if (seen.has(r.file)) return false;
      seen.add(r.file);
      return true;
    })
    .map((r) => ({ filename: r.file, status: "modified" as const }));
}

function buildRiskCounts(risks: RiskFinding[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const r of risks) counts[r.file] = (counts[r.file] || 0) + 1;
  return counts;
}

function buildSummary(report: AiReviewReport, ctx: ApiResult["context"]): ReviewSummaryData {
  return {
    title: report.summary.title,
    overview: report.summary.overview,
    changedModules: report.summary.changedModules,
    testSummary: report.summary.testSummary,
  };
}

function buildMeta(ctx: ApiResult["context"]): ReviewSummaryMeta {
  return {
    owner: "",
    repo: "",
    pullNumber: 0,
    filesCount: ctx.changedFiles,
    totalAdditions: ctx.additions,
    totalDeletions: ctx.deletions,
    author: "",
  };
}

/* ------------------------------------------------------------------ */
/* UI constants                                                         */
/* ------------------------------------------------------------------ */

const loadingSteps = [
  "正在解析 GitHub 拉取请求 URL...",
  "正在安全获取远程 PR 提交日志和代码 Diff...",
  "正在初始化 AI 代码特征识别引擎...",
  "正在并联审查代码安全漏洞、逻辑陷阱及性能瓶颈...",
  "正在对多级审查数据模型输出流进行编译和排版...",
];

const modeCards = [
  { key: "full" as ReviewMode, label: "全息总览", desc: "综合全面诊断", icon: Layers, color: "border-cyan-400 text-cyan-400 bg-cyan-400/10" },
  { key: "security" as ReviewMode, label: "安全强化", desc: "审计漏洞与溢出", icon: Shield, color: "border-red-400 text-red-400 bg-red-400/10" },
  { key: "performance" as ReviewMode, label: "效能吞吐", desc: "检测并发与延迟", icon: Zap, color: "border-yellow-400 text-yellow-400 bg-yellow-400/10" },
  { key: "logic" as ReviewMode, label: "逻辑漏洞", desc: "严审死锁与崩溃", icon: Code2, color: "border-purple-400 text-purple-400 bg-purple-400/10" },
];

const demoPrExamples = [
  { name: "Guava [逻辑修正]", owner: "google", repo: "guava", no: "8446", url: "https://github.com/google/guava/pull/8446" },
  { name: "Axios [类型重构]", owner: "axios", repo: "axios", no: "6231", url: "https://github.com/axios/axios/pull/6231" },
  { name: "React [API扩展]", owner: "facebook", repo: "react", no: "31333", url: "https://github.com/facebook/react/pull/31333" },
];

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

export default function HomePage() {
  const [step, setStep] = useState<"hero" | "live" | "done" | "error">("hero");
  const [status, setStatus] = useState<ReviewStatus>("idle");
  const [mode, setMode] = useState<ReviewMode>("full");
  const [activeTab, setActiveTab] = useState<"stats" | "risks">("stats");
  const [loadingStep, setLoadingStep] = useState(0);

  // API results
  const [stats, setStats] = useState<StatsData | null>(null);
  const [risks, setRisks] = useState<RiskFinding[]>([]);
  const [suggestions, setSuggestions] = useState<Record<number, Suggestion>>({});
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [riskCounts, setRiskCounts] = useState<Record<string, number>>({});
  const [summary, setSummary] = useState<ReviewSummaryData | null>(null);
  const [meta, setMeta] = useState<ReviewSummaryMeta | null>(null);
  const [generalSuggestions, setGeneralSuggestions] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  useEffect(() => {
    if (step !== "live" || status === "done" || status === "error") return;
    setLoadingStep(0);
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
    }, 2200);
    return () => clearInterval(interval);
  }, [step, status]);

  const handleAnalyze = useCallback(async (url: string) => {
    setStep("live");
    setStatus("fetching");
    setErrorMsg("");

    try {
      const res = await fetch("/api/analyze-pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prUrl: url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Server error (${res.status})`);

      const result = data as ApiResult;
      const { risks: rf, suggestions: sg } = buildRiskFindings(result.report);

      setStats(buildStats(result.report, result.context));
      setRisks(rf);
      setSuggestions(sg);
      setFiles(buildFilesFromRisks(rf));
      setRiskCounts(buildRiskCounts(rf));
      setSummary(buildSummary(result.report, result.context));
      setMeta(buildMeta(result.context));
      setGeneralSuggestions(result.report.suggestions.map((s) => s.recommendation));
      setStatus("done");
      setStep("done");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "PR 分析失败");
      setStatus("error");
      setStep("error");
    }
  }, []);

  function handleReset() {
    setStep("hero");
    setStatus("idle");
    setSelectedFile(null);
    setActiveTab("stats");
    setStats(null);
    setRisks([]);
    setSuggestions({});
    setFiles([]);
    setRiskCounts({});
    setSummary(null);
    setMeta(null);
    setGeneralSuggestions([]);
    setErrorMsg("");
  }

  const header = (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/80 backdrop-blur py-3 px-6">
      <div className="mx-auto flex max-w-7xl items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-cyan-400 text-slate-950">
            <GitPullRequest className="h-5 w-5" />
          </div>
          <div>
            <h1 className="flex items-center gap-1.5 text-lg font-extrabold tracking-tight text-slate-100">
              LingQi
              <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-cyan-400">AI</span>
            </h1>
            <p className="text-xs font-medium text-slate-500">智能 Pull Request 代码评审辅助系统</p>
          </div>
        </div>
      </div>
    </header>
  );

  /* ========================== Hero ========================== */
  if (step === "hero") {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100">
        {header}
        <div className="mx-auto max-w-3xl space-y-8 px-6 py-8">
          <div className="space-y-3 py-4 text-center">
            <div className="inline-flex items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-400">
              <Sparkles className="h-3.5 w-3.5" />AI 深度赋能
            </div>
            <h2 className="text-3xl font-black leading-tight tracking-tight text-slate-100">让您的 PR 代码评审更高能、更健全</h2>
            <p className="mx-auto max-w-lg text-sm leading-relaxed text-slate-400">
              输入 GitHub 公开仓库的项目 PR 页面链接，自动提取变更增量，并由 AI 深度评估代码缺陷、潜在高危漏洞、并发冲突与重构建议。
            </p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-6 shadow-sm md:p-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">1. 设定代码分析侧重维度</label>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {modeCards.map((item) => {
                    const isSelected = mode === item.key;
                    return (
                      <button key={item.key} type="button" onClick={() => setMode(item.key)}
                        className={`flex h-24 w-full select-none flex-col justify-between rounded-md border p-3.5 text-left transition-all ${
                          isSelected ? `${item.color} border-2 font-semibold ring-1 ring-current ring-inset`
                            : "border-slate-700 bg-slate-950 text-slate-500 hover:border-slate-500 hover:bg-slate-900"}`}>
                        <item.icon className="h-5 w-5 shrink-0" />
                        <div>
                          <p className="mt-1 text-xs font-semibold leading-tight">{item.label}</p>
                          <p className="mt-0.5 block text-[10px] font-normal leading-tight text-slate-500">{item.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">2. 提供 Pull Request 页面链接</label>
                <PrInput onAnalyze={handleAnalyze} />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-center text-xs font-semibold text-slate-500">或者，一键点击测试精选公开 PR</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {demoPrExamples.map((demo) => (
                <button key={demo.no} onClick={() => handleAnalyze(demo.url)}
                  className="group rounded-md border border-slate-800 bg-slate-900/60 p-3 text-left shadow-sm transition-all hover:border-cyan-400/50 hover:shadow-md">
                  <p className="flex items-center justify-between text-xs font-semibold leading-tight text-cyan-400">
                    {demo.name}<ExternalLink className="h-3 w-3 text-slate-600 group-hover:text-cyan-400" />
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-slate-500">{demo.owner}/{demo.repo} #{demo.no}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  /* ========================== Error ========================== */
  if (step === "error") {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100">
        {header}
        <div className="mx-auto max-w-2xl px-6 pt-8">
          <div className="rounded-md border border-slate-800 border-l-4 border-l-red-500 bg-slate-900/60 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
              <div>
                <h4 className="text-sm font-semibold text-red-400">评审流启动失败</h4>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">{errorMsg}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-4 border-t border-slate-800 pt-3">
              <p className="text-[10px] text-slate-500">请确认您已正确设置 API Key。</p>
              <button onClick={handleReset} className="rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-[10px] font-semibold text-slate-300 transition hover:bg-slate-800">返回</button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  /* ========================== Loading / Done ========================== */
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {header}

      {step === "live" && status !== "done" && status !== "error" && (
        <div className="mx-auto max-w-xl space-y-6 px-6 py-16 text-center">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full border border-slate-800 bg-slate-900">
            <RefreshCw className="h-8 w-8 animate-spin text-cyan-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold tracking-tight text-slate-100">正为您在云端执行自动化审查</h3>
            <p className="mx-auto max-w-sm text-sm text-slate-500">AI 引擎正在获取源码 Diff、拆解修改意图、并针对安全性与执行效能出具详细审查意见。</p>
          </div>
          <div className="mx-auto max-w-sm rounded-md border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-cyan-400 transition-all duration-300" style={{ width: `${((loadingStep + 1) / loadingSteps.length) * 100}%` }} />
              </div>
              <span className="shrink-0 select-none font-mono text-[10px] font-semibold text-slate-500">{loadingStep + 1} / {loadingSteps.length}</span>
            </div>
            <p className="mt-3 text-left text-xs font-semibold text-slate-300">{loadingSteps[loadingStep]}</p>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="mx-auto max-w-7xl space-y-6 px-6 py-4">
          <div className="flex flex-col gap-4 border-b border-slate-800 pb-2 sm:flex-row sm:items-center sm:justify-between">
            <button onClick={handleReset} className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800">
              <RefreshCw className="h-3.5 w-3.5" />重新评审其他 PR
            </button>
            <div className="flex items-center space-x-1 select-none">
              {[
                { key: "stats", label: "效能与统计", icon: BarChart3 },
                { key: "risks", label: "核心隐患审计", icon: ShieldAlert },
              ].map((tab) => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key as typeof activeTab)}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === tab.key ? "bg-cyan-400 text-slate-950 shadow-sm" : "text-slate-500 hover:bg-slate-900 hover:text-slate-300"}`}>
                  <tab.icon className="h-3.5 w-3.5 shrink-0" />{tab.label}
                </button>
              ))}
            </div>
          </div>

          {activeTab === "stats" && (
            <div className="space-y-6">
              {summary && meta && <ReviewSummary summary={summary} generalSuggestions={generalSuggestions} meta={meta} />}
              {stats && <StatsPanel stats={stats} />}
            </div>
          )}

          {activeTab === "risks" && risks.length > 0 && (
            <div className="flex gap-4 items-start min-h-[calc(100vh-12rem)]">
              <aside className="w-[220px] shrink-0 sticky top-[73px] max-h-[calc(100vh-6rem)] overflow-y-auto rounded-lg border border-slate-800 bg-slate-900/60">
                <FileTree files={files} riskCounts={riskCounts} onFileSelect={setSelectedFile} />
              </aside>
              <main className="flex-[3] min-w-0">
                <DiffViewer diffText="" />
              </main>
              <aside className="flex-[2] min-w-[320px] max-h-[calc(100vh-6rem)] overflow-y-auto sticky top-[73px] flex flex-col gap-4">
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-slate-200">
                    Risk Findings<span className="ml-1 font-normal text-slate-500">({risks.length})</span>
                  </h2>
                  {risks.map((risk, i) => (
                    <RiskCard key={`${risk.file}-${i}`} risk={risk} suggestion={suggestions[i]} highlighted={selectedFile === risk.file} />
                  ))}
                </div>
              </aside>
            </div>
          )}

          {activeTab === "risks" && risks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <AlertCircle className="mb-3 h-10 w-10" />
              <p className="text-sm">未发现风险项</p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
