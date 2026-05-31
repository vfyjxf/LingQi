"use client";

import { useState, useCallback, useEffect } from "react";
import PrInput from "@/components/PrInput";
import ReviewProgress from "@/components/ReviewProgress";
import type { ReviewStatus, ReviewStats, ReviewError } from "@/components/ReviewProgress";
import StatsPanel from "@/components/StatsPanel";
import type { StatsData, FilterState } from "@/components/StatsPanel";
import FileTree from "@/components/FileTree";
import type { FileEntry } from "@/components/FileTree";
import RiskCard from "@/components/RiskCard";
import type { RiskFinding, Suggestion } from "@/components/RiskCard";
import DiffViewer from "@/components/DiffViewer";
import type { AnalyzePullRequestResult } from "@/lib/api/analyze-pr";
import ReviewSummary from "@/components/ReviewSummary";
import type { ReviewSummaryData, ReviewSummaryMeta } from "@/components/ReviewSummary";
import { parsePrUrl } from "@/lib/github/parse-pr-url";
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

/* ------------------------------------------------------------------ */
/* Demo data                                                            */
/* ------------------------------------------------------------------ */

type ReviewMode = "full" | "security" | "performance" | "logic";

type AnalyzeResponse = AnalyzePullRequestResult;

const demoDiff = `diff --git a/src/auth/login.ts b/src/auth/login.ts
--- a/src/auth/login.ts
+++ b/src/auth/login.ts
@@ -10,6 +10,8 @@ export function login() {
 function login() {
   const token = await api.login(user);
-  setSession(token);
-  window.location.href = '/dashboard';
+  if (token) {
+    setSession(token);
+    window.location.href = '/dashboard';
+  }
diff --git a/src/api/routes.ts b/src/api/routes.ts
--- a/src/api/routes.ts
+++ b/src/api/routes.ts
@@ -25,3 +25,15 @@ router.get("/users", async (req, res) => {
   const users = await db.users.findAll();
   res.json(users);
 });
+
+router.get("/users/:id", async (req, res) => {
+  const user = await db.users.findById(req.params.id);
+  res.json(user);
+});`;

const demoFiles: FileEntry[] = [
  { filename: "src/auth/login.ts", status: "modified" },
  { filename: "src/api/routes.ts", status: "modified" },
  { filename: "src/utils/helper.ts", status: "added" },
  { filename: "docs/README.md", status: "modified" },
];

const demoRiskCounts: Record<string, number> = {
  "src/auth/login.ts": 3,
  "src/api/routes.ts": 1,
};

const demoRisks: RiskFinding[] = [
  {
    severity: "blocker",
    category: "security",
    file: "src/auth/login.ts",
    line: 12,
    title: "token 刷新前需确认用户状态",
    evidence: "diff 修改了 refreshSession 分支，未检查用户状态。",
    impact: "已禁用用户可能继续获得 token。",
  },
  {
    severity: "major",
    category: "performance",
    file: "src/api/routes.ts",
    line: 30,
    title: "N+1 查询问题",
    evidence: "循环内调用 findById，每次请求产生多次数据库查询。",
    impact: "高并发时数据库压力大。",
  },
  {
    severity: "minor",
    category: "maintainability",
    file: "src/utils/helper.ts",
    title: "缺少类型声明",
    evidence: "新增的 helper 函数无 JSDoc 注释和类型签名。",
    impact: "降低代码可维护性。",
  },
];

const demoSuggestions: Record<number, Suggestion> = {
  0: {
    problem: "缺少 N+1 查询优化",
    recommendation: "使用 batchFindByIds 批量查询替代逐条 findById。",
    rationale: "批量查询可减少数据库往返次数，在高并发下性能提升显著。",
  },
  1: {
    problem: "token 刷新前需确认用户状态",
    recommendation: "刷新 token 前先查询用户状态，拒绝 disabled 用户。",
    rationale: "确保已禁用的账号无法获得新的有效 token。",
  },
};

const demoStats: StatsData = {
  filesChanged: 4,
  linesAdded: 12,
  linesDeleted: 12,
  riskCount: 3,
  blockerCount: 1,
  majorCount: 1,
  minorCount: 1,
  nitCount: 0,
};

const demoError: ReviewError = {
  code: "GITHUB_API_ERROR",
  message: "GitHub API 请求失败。",
  suggestion: "该 PR 可能不存在或仓库为私有。请检查链接后重试。",
};

const demoPrExamples = [
  { name: "Guava [逻辑修正]", owner: "google", repo: "guava", no: "8446", url: "https://github.com/google/guava/pull/8446" },
  { name: "Axios [类型重构]", owner: "axios", repo: "axios", no: "6231", url: "https://github.com/axios/axios/pull/6231" },
  { name: "React [API扩展]", owner: "facebook", repo: "react", no: "31333", url: "https://github.com/facebook/react/pull/31333" },
];

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

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

export default function HomePage() {
  const [step, setStep] = useState<"hero" | "live" | "done" | "error">("hero");
  const [status, setStatus] = useState<ReviewStatus>("idle");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [mode, setMode] = useState<ReviewMode>("full");
  const [activeTab, setActiveTab] = useState<"stats" | "risks">("stats");
  const [loadingStep, setLoadingStep] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponse | null>(
    null
  );
  const [activeFilter, setActiveFilter] = useState<FilterState>({ type: null, value: null });

  function handleFilterChange(type: "category" | "severity" | "clear", value: string | null) {
    if (type === "clear") {
      setActiveFilter({ type: null, value: null });
    } else {
      setActiveFilter({ type, value });
      setActiveTab("risks");
    }
  }

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
    setAnalysisResult(null);

    try {
      const response = await fetch("/api/analyze-pr", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prUrl: url })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "PR 分析失败");
      }

      setStatus("analyzing");
      setAnalysisResult(payload as AnalyzeResponse);
      setStatus("done");
      setStep("done");
    } catch (error) {
      setStatus("error");
      setStep("error");
    }
  }, []);

  function handleDemoError() {
    setStep("live");
    setStatus("fetching");
    delay(800).then(() => {
      setStatus("error");
      setStep("error");
    });
  }

  function handleReset() {
    setStep("hero");
    setStatus("idle");
    setSelectedFile(null);
    setActiveTab("stats");
    setAnalysisResult(null);
    setActiveFilter({ type: null, value: null });
  }

  const displayStats = buildStatsData(analysisResult) ?? demoStats;
  const displayFiles = buildFileEntries(analysisResult) ?? demoFiles;
  const displayRiskCounts = buildRiskCounts(analysisResult) ?? demoRiskCounts;
  const displayRisks = buildRiskFindings(analysisResult) ?? demoRisks;
  const displaySuggestions =
    buildSuggestions(analysisResult) ?? demoSuggestions;
  const filteredRisks = displayRisks.filter((r) => {
    if (!activeFilter.type || !activeFilter.value) return true;
    if (activeFilter.type === "severity") return r.severity === activeFilter.value;
    if (activeFilter.type === "category") return r.category === activeFilter.value;
    return true;
  });
  const displayDiff = analysisResult?.context.diffText || demoDiff;
  const displaySummary = buildSummaryData(analysisResult);
  const displayMeta = buildSummaryMeta(analysisResult);
  const displayGeneralSuggestions =
    buildGeneralSuggestions(analysisResult) ?? [];

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
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setMode(item.key)}
                        className={`flex h-24 w-full select-none flex-col justify-between rounded-md border p-3.5 text-left transition-all ${
                          isSelected
                            ? `${item.color} border-2 font-semibold ring-1 ring-current ring-inset`
                            : "border-slate-700 bg-slate-950 text-slate-500 hover:border-slate-500 hover:bg-slate-900"
                        }`}
                      >
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
                <button
                  key={demo.no}
                  onClick={() => handleAnalyze(demo.url)}
                  className="group rounded-md border border-slate-800 bg-slate-900/60 p-3 text-left shadow-sm transition-all hover:border-cyan-400/50 hover:shadow-md"
                >
                  <p className="flex items-center justify-between text-xs font-semibold leading-tight text-cyan-400">
                    {demo.name}
                    <ExternalLink className="h-3 w-3 text-slate-600 group-hover:text-cyan-400" />
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-slate-500">{demo.owner}/{demo.repo} #{demo.no}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="text-center">
            <button className="text-xs text-slate-600 underline transition-colors hover:text-red-400" onClick={handleDemoError}>模拟错误状态</button>
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
                <p className="mt-1 text-xs leading-relaxed text-slate-300">{demoError.message}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-4 border-t border-slate-800 pt-3">
              <p className="text-[10px] text-slate-500">请确认您已正确设置 <strong>GEMINI_API_KEY</strong>。</p>
              <button onClick={handleReset} className="rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-[10px] font-semibold text-slate-300 transition hover:bg-slate-800">返回配置页面</button>
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
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as typeof activeTab)}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === tab.key ? "bg-cyan-400 text-slate-950 shadow-sm" : "text-slate-500 hover:bg-slate-900 hover:text-slate-300"
                  }`}
                >
                  <tab.icon className="h-3.5 w-3.5 shrink-0" />{tab.label}
                </button>
              ))}
            </div>
          </div>

          {activeTab === "stats" && (
            <div className="space-y-6">
              {displaySummary && displayMeta && (
                <ReviewSummary
                  summary={displaySummary}
                  generalSuggestions={displayGeneralSuggestions}
                  meta={displayMeta}
                />
              )}
              <StatsPanel stats={displayStats} activeFilter={activeFilter} onFilterChange={handleFilterChange} />
            </div>
          )}

          {activeTab === "risks" && (
            <div className="flex gap-4 items-start min-h-[calc(100vh-12rem)]">
              <aside className="w-[220px] shrink-0 sticky top-[73px] max-h-[calc(100vh-6rem)] overflow-y-auto rounded-lg border border-slate-800 bg-slate-900/60">
                <FileTree files={displayFiles} riskCounts={displayRiskCounts} onFileSelect={setSelectedFile} />
              </aside>
              <main className="flex-[3] min-w-0">
                <DiffViewer diffText={displayDiff} />
              </main>
              <aside className="flex-[2] min-w-[320px] max-h-[calc(100vh-6rem)] overflow-y-auto sticky top-[73px] flex flex-col gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-slate-200">
                      发现代码安全及架构隐患
                      <span className="ml-1 font-normal text-slate-500">
                        ({filteredRisks.length}{filteredRisks.length !== displayRisks.length ? ` / ${displayRisks.length}` : ""})
                      </span>
                    </h2>
                    {activeFilter.type && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-medium text-cyan-400">
                        筛选: {activeFilter.type === "severity" ? "级别" : "类别"}={activeFilter.value}
                        <button onClick={() => handleFilterChange("clear", null)} className="ml-0.5 font-extrabold hover:text-cyan-300">&times;</button>
                      </span>
                    )}
                  </div>
                  {filteredRisks.length > 0 ? (
                    filteredRisks.map((risk, i) => (
                      <RiskCard
                        key={`${risk.file}-${i}`}
                        risk={risk}
                        suggestion={displaySuggestions[i]}
                        highlighted={selectedFile === risk.file}
                      />
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-500 space-y-4">
                      <AlertCircle className="h-10 w-10" />
                      <div className="text-center">
                        <p className="text-sm font-semibold text-slate-400">没有匹配的隐患记录</p>
                        <p className="mt-1 text-xs text-slate-500">当前筛选条件下未找到风险反馈，请清除筛选重试。</p>
                      </div>
                      <button onClick={() => handleFilterChange("clear", null)} className="rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-cyan-400 transition hover:bg-slate-800">
                        清除所有筛选条件
                      </button>
                    </div>
                  )}
                </div>
              </aside>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildStatsData(result: AnalyzeResponse | null): StatsData | null {
  if (!result) return null;

  const blockerCount = result.report.risks.filter(
    (risk) => risk.severity === "blocker"
  ).length;
  const majorCount = result.report.risks.filter(
    (risk) => risk.severity === "major"
  ).length;
  const minorCount = result.report.risks.filter(
    (risk) => risk.severity === "minor"
  ).length;
  const nitCount = result.report.risks.filter(
    (risk) => risk.severity === "nit"
  ).length;
  const categoryCounts = result.report.risks.reduce<Record<string, number>>(
    (counts, risk) => {
      counts[risk.category] = (counts[risk.category] ?? 0) + 1;
      return counts;
    },
    {}
  );

  return {
    filesChanged: result.context.changedFiles,
    linesAdded: result.context.additions,
    linesDeleted: result.context.deletions,
    riskCount: result.report.risks.length,
    blockerCount,
    majorCount,
    minorCount,
    nitCount,
    categoryCounts
  };
}

function buildFileEntries(result: AnalyzeResponse | null): FileEntry[] | null {
  if (!result) return null;

  const filenames = new Set<string>();
  for (const focus of result.report.reviewFocus) filenames.add(focus.file);
  for (const risk of result.report.risks) filenames.add(risk.file);

  return Array.from(filenames).map((filename) => ({
    filename,
    status: "modified"
  }));
}

function buildRiskCounts(
  result: AnalyzeResponse | null
): Record<string, number> | null {
  if (!result) return null;

  return result.report.risks.reduce<Record<string, number>>((counts, risk) => {
    counts[risk.file] = (counts[risk.file] ?? 0) + 1;
    return counts;
  }, {});
}

function buildRiskFindings(
  result: AnalyzeResponse | null
): RiskFinding[] | null {
  if (!result) return null;

  return result.report.risks.map((risk) => ({
    severity: risk.severity,
    category: risk.category,
    file: risk.file,
    line: risk.line,
    title: risk.title,
    evidence: risk.evidence,
    impact: risk.impact
  }));
}

function buildSuggestions(
  result: AnalyzeResponse | null
): Record<number, Suggestion> | null {
  if (!result) return null;

  return result.report.suggestions.reduce<Record<number, Suggestion>>(
    (suggestions, suggestion, index) => {
      suggestions[index] = {
        problem: suggestion.problem,
        recommendation: suggestion.recommendation,
        rationale: suggestion.rationale
      };
      return suggestions;
    },
    {}
  );
}

function buildSummaryData(result: AnalyzeResponse | null): ReviewSummaryData | null {
  if (!result) return null;
  return {
    title: result.report.summary.title,
    overview: result.report.summary.overview,
    changedModules: result.report.summary.changedModules,
    testSummary: result.report.summary.testSummary,
  };
}

function buildSummaryMeta(result: AnalyzeResponse | null): ReviewSummaryMeta | null {
  if (!result) return null;
  const parsed = (() => {
    try {
      return parsePrUrl(result.context.prUrl);
    } catch {
      return null;
    }
  })();
  return {
    owner: parsed?.owner ?? "",
    repo: parsed?.repo ?? "",
    pullNumber: parsed?.pullNumber ?? 0,
    filesCount: result.context.changedFiles,
    totalAdditions: result.context.additions,
    totalDeletions: result.context.deletions,
    author: result.context.author,
    avatarUrl: result.context.avatarUrl || undefined,
  };
}

function buildGeneralSuggestions(result: AnalyzeResponse | null): string[] | null {
  if (!result) return null;
  return result.report.suggestions.map((s) => s.recommendation);
}
