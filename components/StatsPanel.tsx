"use client";

import { Award, AlertTriangle, ShieldCheck, Zap, Code2, CheckCircle } from "lucide-react";

export type StatsData = {
  filesChanged: number;
  linesAdded: number;
  linesDeleted: number;
  riskCount: number;
  blockerCount: number;
  majorCount: number;
  minorCount: number;
  nitCount: number;
  categoryCounts?: Record<string, number>;
};

export type FilterState = {
  type: "category" | "severity" | null;
  value: string | null;
};

type StatsPanelProps = {
  stats: StatsData;
  activeFilter?: FilterState;
  onFilterChange?: (type: "category" | "severity" | "clear", value: string | null) => void;
};

/* ---- Quality score ---- */
function calcQualityScore(stats: StatsData) {
  const deductions =
    stats.blockerCount * 20 +
    stats.majorCount * 12 +
    stats.minorCount * 5 +
    stats.nitCount * 2;
  return Math.max(0, 100 - deductions);
}

function gradeInfo(score: number) {
  if (score >= 90) return { grade: "A", color: "border-green-400 text-green-400 bg-green-400/10", label: "高质量", motto: "代码非常干净，无关键隐患。" };
  if (score >= 75) return { grade: "B", color: "border-cyan-400 text-cyan-400 bg-cyan-400/10", label: "良好品质", motto: "整体结构扎实，有少量改进空间。" };
  if (score >= 60) return { grade: "C", color: "border-purple-400 text-purple-400 bg-purple-400/10", label: "中等质量", motto: "有轻微问题需修复后可合并。" };
  if (score >= 40) return { grade: "D", color: "border-yellow-400 text-yellow-400 bg-yellow-400/10", label: "中高风险", motto: "包含较多中度风险，务必重点审查。" };
  return { grade: "F", color: "border-red-400 text-red-400 bg-red-400/10", label: "禁止合并", motto: "存在严重漏洞或致命逻辑错误，建议打回。" };
}

/* ---- Donut segments ---- */
const severitySegments = [
  { key: "blocker", label: "Blocker", color: "#dc2626" },
  { key: "major", label: "Major", color: "#ea580c" },
  { key: "minor", label: "Minor", color: "#2563eb" },
  { key: "nit", label: "Nit", color: "#6b7280" },
];

const categoryDefs = [
  { key: "security", label: "安全漏洞", icon: ShieldCheck, color: "#dc2626", textColor: "text-red-400" },
  { key: "performance", label: "性能瓶颈", icon: Zap, color: "#ca8a04", textColor: "text-yellow-400" },
  { key: "logic", label: "编码逻辑", icon: AlertTriangle, color: "#7c3aed", textColor: "text-purple-400" },
  { key: "style", label: "代码规范", icon: Code2, color: "#6b7280", textColor: "text-slate-400" },
];

export default function StatsPanel({ stats, activeFilter, onFilterChange }: StatsPanelProps) {
  const score = calcQualityScore(stats);
  const grade = gradeInfo(score);

  const sevCounts: Record<string, number> = {
    blocker: stats.blockerCount,
    major: stats.majorCount,
    minor: stats.minorCount,
    nit: stats.nitCount,
  };
  const totalSev = stats.riskCount || 1;
  const hasRisks = stats.riskCount > 0;

  /* ---- Donut ---- */
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  let accumulated = 0;
  const donutSegments = severitySegments.map((seg) => {
    const pct = sevCounts[seg.key] / totalSev;
    const dash = pct * circumference;
    const offset = -accumulated * circumference;
    accumulated += pct;
    return { ...seg, dash, offset, pct };
  });

  /* ---- Category bars ---- */
  const catCounts = stats.categoryCounts ?? {};
  const maxCat = Math.max(1, ...Object.values(catCounts));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Grade badge */}
      <div className="relative flex flex-col items-center justify-between overflow-hidden rounded-lg border border-slate-800 bg-slate-900/60 p-6 text-center shadow-sm">
        <Award className="pointer-events-none absolute right-4 top-4 h-24 w-24 text-slate-800 opacity-20" />
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">PR 综合质量评级</span>
        <div className={`my-4 flex h-28 w-28 flex-col items-center justify-center rounded-full border-4 font-mono select-none ${grade.color}`}>
          <span className="text-5xl font-black">{grade.grade}</span>
          <span className="mt-0.5 text-[10px] font-extrabold uppercase tracking-widest">{score} / 100</span>
        </div>
        <div className="z-10 space-y-1.5">
          <h4 className="text-base font-bold text-slate-100">{grade.label}</h4>
          <p className="max-w-xs text-xs text-slate-500">{grade.motto}</p>
        </div>
      </div>

      {/* Severity donut */}
      <div className="flex flex-col justify-between rounded-lg border border-slate-800 bg-slate-900/60 p-6 shadow-sm">
        <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-2">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <AlertTriangle className="h-3.5 w-3.5 text-red-400" />风险严重度统计
          </h3>
          {activeFilter?.type === "severity" && (
            <button onClick={() => onFilterChange?.("clear", null)} className="text-[10px] font-bold text-cyan-400 hover:underline">[清除筛选]</button>
          )}
        </div>

        {!hasRisks ? (
          <div className="flex flex-1 flex-col items-center justify-center space-y-2 py-6 text-slate-500">
            <CheckCircle className="h-10 w-10 text-green-400" />
            <p className="text-xs font-semibold">零高危隐患，代码状态极为优秀！</p>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-around gap-2">
            <div className="relative h-28 w-28 shrink-0">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#1e293b" strokeWidth="12" />
                {donutSegments.map((seg) => (
                  <circle
                    key={seg.key}
                    cx="50" cy="50" r={radius}
                    fill="transparent"
                    stroke={seg.color}
                    strokeWidth="12"
                    strokeDasharray={`${seg.dash} ${circumference}`}
                    strokeDashoffset={seg.offset}
                    strokeLinecap="round"
                    className="cursor-pointer transition-all duration-500 hover:stroke-[14px]"
                    onClick={() => onFilterChange?.("severity", seg.key)}
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
                <span className="text-lg font-black text-slate-100">{stats.riskCount}</span>
                <span className="text-[8px] font-bold uppercase tracking-widest text-slate-500">风险项</span>
              </div>
            </div>

            <div className="w-28 space-y-2 text-xs">
              {donutSegments.map((seg) => {
                const isActive = activeFilter?.type === "severity" && activeFilter?.value === seg.key;
                return (
                  <button
                    key={seg.key}
                    onClick={() => onFilterChange?.("severity", seg.key)}
                    className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left transition-all ${
                      isActive ? "bg-slate-800 font-bold" : "hover:bg-slate-800/50"
                    }`}
                    style={{ borderLeft: isActive ? `2px solid ${seg.color}` : "2px solid transparent" }}
                  >
                    <span className="flex items-center gap-1.5 font-medium text-slate-300">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: seg.color }} />
                      {seg.label}
                    </span>
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">{sevCounts[seg.key]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Category bars */}
      <div className="flex flex-col justify-between rounded-lg border border-slate-800 bg-slate-900/60 p-6 shadow-sm">
        <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-2">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Zap className="h-3.5 w-3.5 text-yellow-400" />风险类别分布
          </h3>
          {activeFilter?.type === "category" && (
            <button onClick={() => onFilterChange?.("clear", null)} className="text-[10px] font-bold text-cyan-400 hover:underline">[清除筛选]</button>
          )}
        </div>

        <div className="flex flex-1 flex-col justify-center space-y-2.5">
          {categoryDefs.map((cat) => {
            const count = catCounts[cat.key] ?? 0;
            const pct = (count / maxCat) * 100;
            const isActive = activeFilter?.type === "category" && activeFilter?.value === cat.key;
            return (
              <div
                key={cat.key}
                onClick={() => onFilterChange?.("category", cat.key)}
                className={`cursor-pointer rounded px-2 py-1 border border-transparent transition ${
                  isActive ? "border-cyan-400/50 bg-slate-800" : "hover:bg-slate-800/50"
                }`}
              >
                <div className="mb-1 flex items-center justify-between text-[10px]">
                  <span className="flex items-center gap-1 font-semibold text-slate-300">
                    <cat.icon className={`h-3.5 w-3.5 ${cat.textColor}`} />
                    {cat.label}
                  </span>
                  <span className="font-mono font-bold text-slate-500">{count} 项</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: cat.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
