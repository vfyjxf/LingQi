"use client";

import { useState, useCallback, useEffect } from "react";
import PrInput from "@/components/PrInput";
import ReviewProgress from "@/components/ReviewProgress";
import type { ReviewStatus, ReviewStats, ReviewError } from "@/components/ReviewProgress";
import { GradeBadge, StatsCharts } from "@/components/StatsPanel";
import type { StatsData, FilterState } from "@/components/StatsPanel";
import FileTree from "@/components/FileTree";
import type { FileEntry } from "@/components/FileTree";
import RiskCard from "@/components/RiskCard";
import type { RiskFinding, Suggestion } from "@/components/RiskCard";
import DiffViewer from "@/components/DiffViewer";
import type { AnalyzePullRequestResult } from "@/lib/api/analyze-pr";
import type { ReviewSummaryData, ReviewSummaryMeta } from "@/components/ReviewSummary";
import { parsePrUrl } from "@/lib/github/parse-pr-url";
import {
  GitPullRequest,
  Shield,
  Zap,
  Code2,
  Layers,
  AlertCircle,
  RefreshCw,
  BarChart3,
  ShieldAlert,
  Sparkles,
  User,
  FileText,
  FolderOpen,
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
  categoryCounts: {
    security: 1,
    performance: 1,
    maintainability: 1,
  },
};

const demoError: ReviewError = {
  code: "GITHUB_API_ERROR",
  message: "GitHub API 请求失败。",
  suggestion: "该 PR 可能不存在或仓库为私有。请检查链接后重试。",
};

const loadingSteps = [
  "正在解析 GitHub 拉取请求 URL...",
  "正在安全获取远程 PR 提交日志和代码 Diff...",
  "正在初始化 AI 代码特征识别引擎...",
  "正在并联审查代码安全漏洞、逻辑陷阱及性能瓶颈...",
  "正在对多级审查数据模型输出流进行编译和排版...",
];

const modeCards = [
  { key: "full" as ReviewMode, label: "全息总览", desc: "综合全面诊断", icon: Layers, color: "border-[#58a6ff] text-[#58a6ff] bg-[#58a6ff]/10" },
  { key: "security" as ReviewMode, label: "安全强化", desc: "审计漏洞与溢出", icon: Shield, color: "border-[#f85149] text-[#f85149] bg-[#f85149]/10" },
  { key: "performance" as ReviewMode, label: "效能吞吐", desc: "检测并发与延迟", icon: Zap, color: "border-[#d29922] text-[#d29922] bg-[#d29922]/10" },
  { key: "logic" as ReviewMode, label: "逻辑漏洞", desc: "严审死锁与崩溃", icon: Code2, color: "border-[#8957e5] text-[#8957e5] bg-[#8957e5]/10" },
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      const msg = error instanceof Error ? error.message : "PR 分析失败";
      setErrorMessage(msg);
      setStatus("error");
      setStep("error");
    }
  }, []);

  function handleReset() {
    setStep("hero");
    setStatus("idle");
    setSelectedFile(null);
    setActiveTab("stats");
    setAnalysisResult(null);
    setActiveFilter({ type: null, value: null });
    setErrorMessage(null);
  }

  const displayStats = buildStatsData(analysisResult) ?? demoStats;
  const displayFiles = buildFileEntries(analysisResult) ?? demoFiles;
  const displayRiskCounts = buildRiskCounts(analysisResult) ?? demoRiskCounts;
  const displayRisks = buildRiskFindings(analysisResult) ?? demoRisks;
  const displaySuggestions =
    buildSuggestions(analysisResult) ?? demoSuggestions;
  const filteredRisks = displayRisks.filter((r) => {
    if (selectedFile && r.file !== selectedFile) return false;
    if (activeFilter.type === "severity") return r.severity === activeFilter.value;
    if (activeFilter.type === "category") return r.category === activeFilter.value;
    return true;
  });
  const displayDiff = extractFileDiff(analysisResult?.context.diffText || demoDiff, selectedFile);
  const displaySummary = buildSummaryData(analysisResult);
  const displayMeta = buildSummaryMeta(analysisResult);
  const displayGeneralSuggestions =
    buildGeneralSuggestions(analysisResult) ?? [];

  const header = (
    <header className="sticky top-0 z-40 border-b border-[#30363d] bg-[#161b22]/80 backdrop-blur py-3 px-6">
      <div className="mx-auto flex max-w-7xl items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#58a6ff]/20 text-[#58a6ff]">
            <GitPullRequest className="h-5 w-5" />
          </div>
          <div>
            <h1 className="flex items-center gap-1.5 text-lg font-extrabold tracking-tight text-[#c9d1d9]">
              LingQi
              <span className="rounded-full border border-[#58a6ff]/20 bg-[#58a6ff]/10 px-1.5 py-0.5 font-mono text-xs font-semibold uppercase text-[#58a6ff]">AI</span>
            </h1>
            <p className="text-xs font-medium text-[#8b949e]">智能 Pull Request 代码评审辅助系统</p>
          </div>
        </div>
      </div>
    </header>
  );

  /* ========================== Hero ========================== */
  if (step === "hero") {
    return (
      <main className="min-h-screen bg-[#0d1117] text-[#c9d1d9] flex flex-col">
        {header}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-3xl space-y-8 px-6 py-8">
          <div className="space-y-3 py-4 text-center">
            <h2 className="text-3xl font-black leading-tight tracking-tight text-[#c9d1d9]">让您的 PR 代码评审更高能、更健全</h2>
            <p className="mx-auto max-w-lg text-sm leading-relaxed text-[#8b949e]">
              输入 GitHub 公开仓库的项目 PR 页面链接，自动提取变更增量，并由 AI 深度评估代码缺陷、潜在高危漏洞、并发冲突与重构建议。
            </p>
          </div>

          <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-6 shadow-sm md:p-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#c9d1d9]">1. 设定代码分析侧重维度</label>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {modeCards.map((item) => {
                    const isSelected = mode === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        tabIndex={0}
                        onClick={() => setMode(item.key)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMode(item.key); } }}
                        className={`flex h-24 w-full select-none flex-col justify-between rounded-md border p-3.5 text-left transition-all ${
                          isSelected
                            ? `${item.color} border-2 font-semibold ring-1 ring-current ring-inset`
                            : "border-[#30363d] bg-[#0d1117] text-[#8b949e] hover:border-[#8c959f] hover:bg-[#161b22]"
                        }`}
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        <div>
                          <p className="mt-1 text-xs font-semibold leading-tight">{item.label}</p>
                          <p className="mt-0.5 block text-xs font-normal leading-tight text-[#8b949e]">{item.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#c9d1d9]">2. 提供 Pull Request 页面链接</label>
                <PrInput onAnalyze={handleAnalyze} />
              </div>
            </div>
          </div>

          </div>
        </div>
      </main>
    );
  }

  /* ========================== Error ========================== */
  if (step === "error") {
    return (
      <main className="min-h-screen bg-[#0d1117] text-[#c9d1d9]">
        {header}
        <div className="mx-auto max-w-2xl px-6 pt-8">
          <div className="rounded-md border border-[#30363d] border-l-4 border-l-[#f85149] bg-[#161b22] p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#f85149]" />
              <div>
                <h4 className="text-sm font-semibold text-[#f85149]">评审流启动失败</h4>
                <p className="mt-1 text-xs leading-relaxed text-[#c9d1d9]">{errorMessage ?? demoError.message}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-4 border-t border-[#30363d] pt-3">
              <p className="text-xs text-[#8b949e]">请确认您已正确配置 AI 模型密钥与 GitHub Token。</p>
              <button onClick={handleReset} className="rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-1.5 text-xs font-semibold text-[#c9d1d9] transition hover:bg-[#1c2128]">返回配置页面</button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  /* ========================== Loading / Done ========================== */
  return (
    <main className="min-h-screen bg-[#0d1117] text-[#c9d1d9] flex flex-col">
      {header}

      {step === "live" && status !== "done" && status !== "error" && (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-xl space-y-6 px-6 py-16 text-center">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full border border-[#30363d] bg-[#161b22]">
            <RefreshCw className="h-8 w-8 animate-spin text-[#58a6ff]" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold tracking-tight text-[#c9d1d9]">正为您在云端执行自动化审查</h3>
            <p className="mx-auto max-w-sm text-sm text-[#8b949e]">AI 引擎正在获取源码 Diff、拆解修改意图、并针对安全性与执行效能出具详细审查意见。</p>
          </div>
          <div className="mx-auto max-w-sm rounded-md border border-[#30363d] bg-[#161b22] p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#21262d]">
                <div className="h-full rounded-full bg-[#238636] transition-all duration-300" style={{ width: `${((loadingStep + 1) / loadingSteps.length) * 100}%` }} />
              </div>
              <span className="shrink-0 select-none font-mono text-xs font-semibold text-[#8b949e]">{loadingStep + 1} / {loadingSteps.length}</span>
            </div>
            <p className="mt-3 text-left text-xs font-semibold text-[#c9d1d9]">{loadingSteps[loadingStep]}</p>
          </div>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="mx-auto max-w-7xl space-y-6 px-6 py-4">
          <div className="flex flex-col gap-4 border-b border-[#30363d] pb-2 sm:flex-row sm:items-center sm:justify-between">
            <button onClick={handleReset} className="inline-flex items-center gap-1.5 rounded-md border border-[#30363d] bg-[#161b22] px-3.5 py-1.5 text-xs font-semibold text-[#c9d1d9] transition hover:bg-[#1c2128]">
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
                    activeTab === tab.key ? "bg-[#c9d1d9] text-[#0d1117] shadow-sm" : "text-[#8b949e] hover:bg-[#161b22] hover:text-[#c9d1d9]"
                  }`}
                >
                  <tab.icon className="h-3.5 w-3.5 shrink-0" />{tab.label}
                </button>
              ))}
            </div>
          </div>

          {activeTab === "stats" && (
            <div className="flex gap-6">
              {/* ===== 左栏 40% ===== */}
              <div className="flex-[4] flex flex-col gap-4">
                {/* ① 评级 Hero */}
                <GradeBadge stats={displayStats} />

                {/* ② PR 信息 + 测试摘要 */}
                {displayMeta && (
                  <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-4">
                    <div className="flex items-center gap-3">
                      {displayMeta.avatarUrl ? (
                        <img src={displayMeta.avatarUrl} alt={displayMeta.author} className="h-8 w-8 rounded-full border border-[#30363d]" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#30363d] bg-[#21262d]">
                          <User className="h-4 w-4 text-[#8b949e]" />
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-semibold text-[#c9d1d9]">{displayMeta.owner}/{displayMeta.repo} <span className="text-[#8b949e]">#{displayMeta.pullNumber}</span></div>
                        <div className="text-xs text-[#8b949e]">@{displayMeta.author}</div>
                      </div>
                    </div>
                    {displaySummary?.testSummary && (
                      <div className="mt-3 border-t border-[#30363d] pt-3">
                        <div className="text-xs font-semibold text-[#8957e5]">测试摘要</div>
                        <div className="mt-1 text-xs leading-relaxed text-[#8b949e]">{displaySummary.testSummary}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* ③ 变更模块 */}
                {displaySummary && displaySummary.changedModules.length > 0 && (
                  <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-4">
                    <div className="mb-2 text-xs font-semibold text-[#58a6ff]">变更模块</div>
                    <div className="flex flex-wrap gap-1.5">
                      {displaySummary.changedModules.map((mod, i) => (
                        <span key={i} className="inline-flex items-center gap-1 rounded border border-[#30363d] bg-[#21262d] px-2 py-1 font-mono text-xs text-[#c9d1d9]">
                          <FileText className="h-3 w-3 text-[#58a6ff]" />{mod}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* ④ KPI 数字 2x2 */}
                {displayMeta && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-3 text-center">
                      <div className="text-xs text-[#8b949e]">变更文件</div>
                      <div className="mt-1 text-xl font-black text-[#c9d1d9]">{displayMeta.filesCount}</div>
                    </div>
                    <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-3 text-center">
                      <div className="text-xs text-[#8b949e]">风险项</div>
                      <div className="mt-1 text-xl font-black text-[#f85149]">{displayStats.riskCount}</div>
                    </div>
                    <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-3 text-center">
                      <div className="text-xs text-[#8b949e]">新增行</div>
                      <div className="mt-1 text-xl font-black text-[#3fb950]">+{displayMeta.totalAdditions}</div>
                    </div>
                    <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-3 text-center">
                      <div className="text-xs text-[#8b949e]">删除行</div>
                      <div className="mt-1 text-xl font-black text-[#f85149]">-{displayMeta.totalDeletions}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* ===== 右栏 60% ===== */}
              <div className="flex-[6] flex flex-col gap-4">
                {/* 图表行：玫瑰图 + 雷达图 */}
                <StatsCharts stats={displayStats} activeFilter={activeFilter} onFilterChange={handleFilterChange} />

                {/* PR 变更总结 (flex:1 撑满) */}
                {displaySummary && (
                  <div className="flex-1 rounded-lg border border-[#30363d] bg-[#161b22] p-5">
                    <h3 className="flex items-center gap-2 border-b border-[#30363d] pb-3 text-sm font-semibold text-[#c9d1d9]">
                      <Sparkles className="h-4 w-4 text-[#58a6ff]" /> PR 变更总结与主要目标
                    </h3>
                    <p className="mt-4 text-sm leading-relaxed whitespace-pre-wrap text-[#c9d1d9]">
                      {displaySummary.overview || "无 PR 变更描述。"}
                    </p>
                  </div>
                )}

                {/* 架构与质量改进建议 */}
                {displayGeneralSuggestions && displayGeneralSuggestions.length > 0 && (
                  <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-4">
                    <h3 className="flex items-center gap-2 border-b border-[#30363d] pb-3 text-sm font-semibold text-[#c9d1d9]">
                      <FolderOpen className="h-4 w-4 text-[#3fb950]" /> 架构与质量改进建议
                    </h3>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      {displayGeneralSuggestions.map((suggestion, idx) => (
                        <div key={idx} className="flex items-start gap-2 rounded-md border border-[#30363d] bg-[#21262d] p-3">
                          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#58a6ff]/10 text-xs font-semibold text-[#58a6ff]">
                            {idx + 1}
                          </div>
                          <p className="text-xs leading-relaxed text-[#c9d1d9]">{suggestion}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "risks" && (
            <div className="flex gap-4 items-start min-h-[calc(100vh-12rem)]">
              {/* Left column: File tree + Diff viewer (50%) */}
              <aside className="flex-1 sticky top-[var(--header-height)] max-h-[calc(100vh-6rem)] overflow-y-auto flex flex-col gap-4">
                <div className="shrink-0">
                  <FileTree
                    files={displayFiles}
                    riskCounts={displayRiskCounts}
                    onFileSelect={setSelectedFile}
                    selectedFile={selectedFile}
                    onClearFileSelect={() => setSelectedFile(null)}
                  />
                </div>
                <div className="flex-1 min-h-0">
                  <DiffViewer diffText={displayDiff} maxHeight="none" />
                </div>
              </aside>

              {/* Right column: Risk cards (50%) */}
              <aside className="flex-1 sticky top-[var(--header-height)] max-h-[calc(100vh-6rem)] overflow-y-auto flex flex-col gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-semibold text-[#c9d1d9]">
                      发现代码安全及架构隐患
                      <span className="ml-1 font-normal text-[#8b949e]">
                        ({filteredRisks.length}{filteredRisks.length !== displayRisks.length ? ` / ${displayRisks.length}` : ""})
                      </span>
                    </h2>
                    {selectedFile && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-[#58a6ff]/30 bg-[#58a6ff]/10 px-2 py-0.5 text-xs font-medium text-[#58a6ff]">
                        {selectedFile}
                        <button onClick={() => setSelectedFile(null)} className="ml-0.5 font-semibold hover:text-[#58a6ff]" aria-label="清除文件筛选">&times;</button>
                      </span>
                    )}
                    {activeFilter.type && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-[#58a6ff]/30 bg-[#58a6ff]/10 px-2 py-0.5 text-xs font-medium text-[#58a6ff]">
                        筛选: {activeFilter.type === "severity" ? "级别" : "类别"}={activeFilter.value}
                        <button onClick={() => handleFilterChange("clear", null)} className="ml-0.5 font-semibold hover:text-[#58a6ff]">&times;</button>
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
                    <div className="flex flex-col items-center justify-center py-16 text-[#8b949e] space-y-4">
                      <AlertCircle className="h-10 w-10" />
                      <div className="text-center">
                        <p className="text-sm font-semibold text-[#8b949e]">没有匹配的隐患记录</p>
                        <p className="mt-1 text-xs text-[#8b949e]">当前筛选条件下未找到风险反馈，请清除筛选重试。</p>
                      </div>
                      <button onClick={() => { setSelectedFile(null); handleFilterChange("clear", null); }} className="rounded-md border border-[#30363d] bg-[#161b22] px-4 py-2 text-xs font-semibold text-[#58a6ff] transition hover:bg-[#1c2128]">
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

function extractFileDiff(diffText: string, filename: string | null): string {
  if (!filename) return "";
  const sections = diffText.split(/^(?=diff --git )/m).filter(Boolean);
  for (const section of sections) {
    const headerMatch = section.match(/^diff --git a\/(.+?) b\/(.+?)$/m);
    if (!headerMatch) continue;
    if (headerMatch[1] === filename || headerMatch[2] === filename) {
      return section;
    }
  }
  return "";
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

function parseFileStatusesFromDiff(diffText: string): Record<string, string> {
  const statuses: Record<string, string> = {};
  const sections = diffText.split(/^(?=diff --git )/m).filter(Boolean);

  for (const section of sections) {
    const headerMatch = section.match(/^diff --git a\/(.*?) b\/(.*?)$/m);
    if (!headerMatch) continue;
    const filename = headerMatch[1];

    const bodyLines = section.split("\n");
    let hasAdd = false;
    let hasDel = false;

    for (const line of bodyLines) {
      if (line.startsWith("+") && !line.startsWith("+++")) hasAdd = true;
      if (line.startsWith("-") && !line.startsWith("---")) hasDel = true;
      if (hasAdd && hasDel) break;
    }

    if (hasAdd && !hasDel) statuses[filename] = "added";
    else if (!hasAdd && hasDel) statuses[filename] = "removed";
    else statuses[filename] = "modified";
  }

  return statuses;
}

function buildFileEntries(result: AnalyzeResponse | null): FileEntry[] | null {
  if (!result) return null;

  const fileStatuses = parseFileStatusesFromDiff(result.context.diffText);
  const filenames = new Set<string>();
  for (const focus of result.report.reviewFocus) filenames.add(focus.file);
  for (const risk of result.report.risks) filenames.add(risk.file);

  return Array.from(filenames).map((filename) => ({
    filename,
    status: fileStatuses[filename] || "modified"
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
