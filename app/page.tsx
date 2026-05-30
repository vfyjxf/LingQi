"use client";

import { useState, useCallback } from "react";
import PrInput from "@/components/PrInput";
import ReviewProgress from "@/components/ReviewProgress";
import type { ReviewStatus, ReviewStats, ReviewError } from "@/components/ReviewProgress";
import StatsPanel from "@/components/StatsPanel";
import type { StatsData } from "@/components/StatsPanel";
import FileTree from "@/components/FileTree";
import type { FileEntry } from "@/components/FileTree";
import RiskCard from "@/components/RiskCard";
import type { RiskFinding, Suggestion } from "@/components/RiskCard";
import DiffViewer from "@/components/DiffViewer";

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

export default function HomePage() {
  const [step, setStep] = useState<"hero" | "live" | "done" | "error">("hero");
  const [status, setStatus] = useState<ReviewStatus>("idle");
  const [progressMessage, setProgressMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const handleAnalyze = useCallback(async (_url: string) => {
    setStep("live");

    // ---- fetching ----
    setStatus("fetching");
    setProgressMessage("正在从 GitHub 获取 PR 数据...");
    await delay(1200);

    // ---- analyzing ----
    setStatus("analyzing");
    setProgressMessage("正在分析代码变更...");
    await delay(1800);

    // ---- done ----
    setStatus("done");
    setStep("done");
  }, []);

  function handleDemoError() {
    setStep("live");
    setStatus("fetching");
    setProgressMessage("正在从 GitHub 获取 PR 数据...");
    delay(800).then(() => {
      setStatus("error");
      setStep("error");
    });
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto w-full max-w-5xl px-6 py-12">
        {/* ---- Header ---- */}
        <div className="mb-8 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
            LingQi
          </p>
          <h1 className="text-2xl font-semibold text-slate-50 md:text-3xl">
            AI 驱动的代码审查
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            面向 GitHub Pull Requests
          </p>
        </div>

        {/* ---- PrInput ---- */}
        {step === "hero" && (
          <div className="flex flex-col items-center gap-3">
            <PrInput onAnalyze={handleAnalyze} />
            <button
              className="text-xs text-slate-600 underline hover:text-cyan-300 transition-colors"
              onClick={handleDemoError}
            >
              模拟错误状态
            </button>
          </div>
        )}

        {/* ---- ReviewProgress ---- */}
        {step !== "hero" && (
          <ReviewProgress
            status={status}
            progressMessage={progressMessage}
            stats={
              status === "done"
                ? {
                    filesChanged: demoStats.filesChanged,
                    linesAdded: demoStats.linesAdded,
                    linesDeleted: demoStats.linesDeleted,
                    riskCount: demoStats.riskCount,
                  }
                : undefined
            }
            error={status === "error" ? demoError : undefined}
          />
        )}

        {/* ---- Results ---- */}
        {step === "done" && (
          <div className="mt-8 space-y-6">
            {/* Stats + FileTree row */}
            <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
              <div className="space-y-4">
                <StatsPanel stats={demoStats} />
                <FileTree
                  files={demoFiles}
                  riskCounts={demoRiskCounts}
                  onFileSelect={setSelectedFile}
                />
              </div>

              {/* Risk cards */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-200">
                  Risk Findings ({demoRisks.length})
                </h3>
                {demoRisks.map((risk, i) => (
                  <RiskCard
                    key={`${risk.file}-${i}`}
                    risk={risk}
                    suggestion={demoSuggestions[i]}
                    highlighted={selectedFile === risk.file}
                    onExpandContext={
                      i === 0 ? () => {} : undefined
                    }
                  />
                ))}
              </div>
            </div>

            {/* Diff viewer */}
            <div>
              <h3 className="mb-3 text-sm font-semibold text-slate-200">
                Diff View
              </h3>
              <DiffViewer diffText={demoDiff} />
            </div>

            {/* Reset button */}
            <div className="text-center">
              <button
                className="rounded-md border border-slate-700 px-4 py-2 text-xs text-slate-400 hover:border-cyan-300/50 hover:text-cyan-300 transition-colors"
                onClick={() => {
                  setStep("hero");
                  setStatus("idle");
                  setSelectedFile(null);
                }}
              >
                重新分析
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
