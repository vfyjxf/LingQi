"use client";

import { Award, AlertTriangle, ShieldCheck, Zap, Code2, CheckCircle } from "lucide-react";
import { RadialBarChart, RadialBar, Cell, ResponsiveContainer, Tooltip, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Dot } from "recharts";

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
  if (score >= 90) return { grade: "A", color: "border-[#3fb950] text-[#3fb950] bg-[#3fb950]/10", label: "高质量", motto: "代码非常干净，无关键隐患。" };
  if (score >= 75) return { grade: "B", color: "border-[#58a6ff] text-[#58a6ff] bg-[#58a6ff]/10", label: "良好品质", motto: "整体结构扎实，有少量改进空间。" };
  if (score >= 60) return { grade: "C", color: "border-[#8957e5] text-[#8957e5] bg-[#8957e5]/10", label: "中等质量", motto: "有轻微问题需修复后可合并。" };
  if (score >= 40) return { grade: "D", color: "border-[#d29922] text-[#d29922] bg-[#d29922]/10", label: "中高风险", motto: "包含较多中度风险，务必重点审查。" };
  return { grade: "F", color: "border-[#f85149] text-[#f85149] bg-[#f85149]/10", label: "禁止合并", motto: "存在严重漏洞或致命逻辑错误，建议打回。" };
}

/* ---- Donut segments ---- */
const severitySegments = [
  { key: "blocker", label: "阻断", color: "#dc2626" },
  { key: "major", label: "严重", color: "#ea580c" },
  { key: "minor", label: "轻微", color: "#2563eb" },
  { key: "nit", label: "建议", color: "#6b7280" },
];

const categoryDefs = [
  { key: "security", label: "安全漏洞", icon: ShieldCheck, color: "#dc2626", textColor: "text-red-400" },
  { key: "data", label: "数据风险", icon: AlertTriangle, color: "#ea580c", textColor: "text-orange-400" },
  { key: "stability", label: "稳定性", icon: AlertTriangle, color: "#d29922", textColor: "text-yellow-400" },
  { key: "performance", label: "性能瓶颈", icon: Zap, color: "#ca8a04", textColor: "text-yellow-400" },
  { key: "api", label: "API 设计", icon: Code2, color: "#2563eb", textColor: "text-blue-400" },
  { key: "testing", label: "测试覆盖", icon: ShieldCheck, color: "#7c3aed", textColor: "text-purple-400" },
  { key: "maintainability", label: "可维护性", icon: Code2, color: "#6b7280", textColor: "text-slate-400" },
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
  const hasRisks = stats.riskCount > 0;

  /* ---- RadialBarChart data ---- */
  const severityRadialData = severitySegments.map((seg) => ({
    name: seg.label,
    value: sevCounts[seg.key],
    fill: seg.color,
    key: seg.key,
  }));

  /* ---- Category bars / RadarChart data ---- */
  const catCounts = stats.categoryCounts ?? {};
  const maxCat = Math.max(1, ...Object.values(catCounts));

  const radarData = categoryDefs.map((cat) => ({
    category: cat.label,
    count: catCounts[cat.key] ?? 0,
    fullMark: maxCat,
    key: cat.key,
  }));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Grade badge */}
      <div className="relative flex flex-col items-center justify-between overflow-hidden rounded-lg border border-[#30363d] bg-[#161b22] p-6 text-center shadow-sm">
        <Award className="pointer-events-none absolute right-4 top-4 h-24 w-24 text-[#21262d] opacity-20" />
        <span className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">PR 综合质量评级</span>
        <div className={`my-4 flex h-28 w-28 flex-col items-center justify-center rounded-full border-4 font-mono select-none ${grade.color}`}>
          <span className="text-5xl font-black">{grade.grade}</span>
          <span className="mt-0.5 text-xs font-black uppercase tracking-widest">{score} / 100</span>
        </div>
        <div className="z-10 space-y-1.5">
          <h4 className="text-base font-semibold text-[#c9d1d9]">{grade.label}</h4>
          <p className="max-w-xs text-xs text-[#8b949e]">{grade.motto}</p>
        </div>
      </div>

      {/* Severity donut */}
      <div className="flex flex-col justify-between rounded-lg border border-[#30363d] bg-[#161b22] p-6 shadow-sm">
        <div className="mb-3 flex items-center justify-between border-b border-[#30363d] pb-2">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#8b949e]">
            <AlertTriangle className="h-3.5 w-3.5 text-[#f85149]" />风险严重度统计
          </h3>
          {activeFilter?.type === "severity" && (
            <button onClick={() => onFilterChange?.("clear", null)} className="text-xs font-semibold text-[#58a6ff] hover:underline">[清除筛选]</button>
          )}
        </div>

        {!hasRisks ? (
          <div className="flex flex-1 flex-col items-center justify-center space-y-2 py-6 text-[#8b949e]">
            <CheckCircle className="h-10 w-10 text-[#3fb950]" />
            <p className="text-xs font-semibold">零高危隐患，代码状态极为优秀！</p>
          </div>
        ) : (
          <div className="relative flex items-center justify-center h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="30%"
                outerRadius="90%"
                barSize={14}
                startAngle={90}
                endAngle={-270}
                data={severityRadialData}
              >
                <RadialBar
                  dataKey="value"
                  background={{ fill: "#21262d" }}
                >
                  {severityRadialData.map((seg) => {
                    const isDimmed = activeFilter?.type === "severity" && activeFilter?.value !== seg.key;
                    return (
                      <Cell
                        key={seg.key}
                        fill={seg.fill}
                        opacity={isDimmed ? 0.35 : 1}
                      />
                    );
                  })}
                </RadialBar>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#21262d",
                    border: "1px solid #30363d",
                    borderRadius: "6px",
                    fontSize: "12px",
                    color: "#ffffff",
                  }}
                  formatter={(value, _name, props) => {
                    const total = severityRadialData.reduce((sum, d) => sum + d.value, 0) || 1;
                    const pct = ((Number(value) / total) * 100).toFixed(1);
                    const label = (props as any)?.payload?.name ?? "";
                    return [`${label}：${value} 项 (${pct}%)`, null];
                  }}
                />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none font-mono">
              <span className="text-lg font-black text-[#c9d1d9]">{stats.riskCount}</span>
              <span className="text-xs font-semibold uppercase tracking-widest text-[#8b949e]">风险项</span>
            </div>
          </div>
        )}
      </div>

      {/* Category bars */}
      <div className="flex flex-col justify-between rounded-lg border border-[#30363d] bg-[#161b22] p-6 shadow-sm">
        <div className="mb-3 flex items-center justify-between border-b border-[#30363d] pb-2">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#8b949e]">
            <Zap className="h-3.5 w-3.5 text-[#d29922]" />风险类别分布
          </h3>
          {activeFilter?.type === "category" && (
            <button onClick={() => onFilterChange?.("clear", null)} className="text-xs font-semibold text-[#58a6ff] hover:underline">[清除筛选]</button>
          )}
        </div>

        {!hasRisks ? (
          <div className="flex flex-1 flex-col items-center justify-center space-y-2 py-6 text-[#8b949e]">
            <CheckCircle className="h-10 w-10 text-[#3fb950]" />
            <p className="text-xs font-semibold">零高危隐患，代码状态极为优秀！</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart cx="50%" cy="50%" data={radarData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
              <PolarGrid stroke="#30363d" />
              <PolarAngleAxis
                dataKey="category"
                tick={(props: any) => {
                  const { x, y, payload } = props;
                  const cat = categoryDefs.find((d) => d.label === payload.value);
                  const isActive = cat && activeFilter?.type === "category" && activeFilter?.value === cat.key;
                  return (
                    <text
                      x={x}
                      y={y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={isActive ? "#58a6ff" : "#8b949e"}
                      fontSize={12}
                      fontWeight={isActive ? 700 : 400}
                      cursor="pointer"
                      onClick={() => {
                        if (cat) {
                          if (isActive) {
                            onFilterChange?.("clear", null);
                          } else {
                            onFilterChange?.("category", cat.key);
                          }
                        }
                      }}
                    >
                      {payload.value}
                    </text>
                  );
                }}
              />
              <PolarRadiusAxis tick={false} axisLine={false} />
              <Radar
                dataKey="count"
                stroke="#58a6ff"
                fill="#58a6ff"
                fillOpacity={0.15}
                strokeWidth={2}
                dot={({ cx, cy, index }: any) => {
                  if (cx == null || cy == null) return <></>;
                  const cat = categoryDefs[index];
                  const isActiveDot = cat && activeFilter?.type === "category" && activeFilter?.value === cat.key;
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill="#58a6ff"
                      stroke="#0d1117"
                      strokeWidth={1}
                      cursor="pointer"
                      onClick={(e: any) => {
                        e.stopPropagation();
                        if (cat) {
                          if (isActiveDot) {
                            onFilterChange?.("clear", null);
                          } else {
                            onFilterChange?.("category", cat.key);
                          }
                        }
                      }}
                    />
                  );
                }}
                activeDot={{ r: 6, fill: "#58a6ff", stroke: "#0d1117", strokeWidth: 2 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#21262d",
                  border: "1px solid #30363d",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "#c9d1d9",
                }}
                formatter={(value) => [String(value) + " 项", ""]}
              />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
