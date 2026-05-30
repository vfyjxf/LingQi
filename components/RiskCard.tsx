"use client";

import { useState } from "react";
import { Shield, AlertTriangle, AlertCircle, Info, ChevronUp, ChevronDown } from "lucide-react";
import type { Severity, RiskCategory } from "@/lib/report/schema";

export type RiskFinding = {
  severity: Severity;
  category: RiskCategory;
  file: string;
  line?: number;
  title: string;
  evidence: string;
  impact: string;
};

export type Suggestion = {
  problem: string;
  recommendation: string;
  rationale: string;
};

type RiskCardProps = {
  risk: RiskFinding;
  suggestion?: Suggestion;
  highlighted?: boolean;
  onExpandContext?: () => void;
  isExpanding?: boolean;
  contextExpanded?: boolean;
};

const severityConfig: Record<Severity, { label: string; icon: typeof Shield; iconBg: string; badge: string }> = {
  blocker: { label: "Blocker", icon: Shield, iconBg: "bg-red-500 text-white", badge: "bg-red-400/10 border-red-400/30 text-red-400" },
  major: { label: "Major", icon: AlertTriangle, iconBg: "bg-orange-500 text-white", badge: "bg-orange-400/10 border-orange-400/30 text-orange-400" },
  minor: { label: "Minor", icon: AlertCircle, iconBg: "bg-blue-500 text-white", badge: "bg-blue-400/10 border-blue-400/30 text-blue-400" },
  nit: { label: "Nit", icon: Info, iconBg: "bg-slate-500 text-white", badge: "bg-slate-400/10 border-slate-400/30 text-slate-400" },
};

const categoryLabel: Record<RiskCategory, string> = {
  security: "安全相关",
  data: "数据问题",
  stability: "稳定性",
  performance: "性能隐患",
  api: "API 设计",
  testing: "测试覆盖",
  maintainability: "代码规范",
};

export default function RiskCard({
  risk,
  suggestion,
  highlighted,
  onExpandContext,
  isExpanding,
  contextExpanded,
}: RiskCardProps) {
  const [expanded, setExpanded] = useState(true);
  const sev = severityConfig[risk.severity];

  return (
    <div
      className={`rounded-md border shadow-sm overflow-hidden transition-all duration-200 ${
        highlighted
          ? "border-cyan-400/50 shadow-cyan-300/10"
          : "border-slate-800 bg-slate-900/60 hover:border-slate-600"
      }`}
    >
      {/* Card header — clickable */}
      <button
        type="button"
        className="flex w-full items-start gap-4 p-5 text-left cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${sev.iconBg}`}>
          <sev.icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${sev.badge}`}>
              {sev.label}
            </span>
            <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
              {categoryLabel[risk.category]}
            </span>
            <span className="rounded border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 font-mono text-[10px] text-cyan-400">
              {risk.file}{risk.line ? `:${risk.line}` : ""}
            </span>
          </div>

          <h4 className="text-sm font-bold leading-snug text-slate-100">{risk.title}</h4>
        </div>

        <div className="p-1 text-slate-500">
          {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="space-y-4 border-t border-slate-800 px-5 pb-5 pt-1 text-xs">
          {/* Impact */}
          <p className="leading-relaxed text-slate-400">{risk.impact}</p>

          {/* Evidence */}
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">证据</span>
            <p className="leading-relaxed text-slate-400">{risk.evidence}</p>
          </div>

          {/* Suggestion */}
          {suggestion && (
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">修复建议</span>
              <p className="leading-relaxed text-slate-300">{suggestion.recommendation}</p>
              <p className="text-[10px] leading-relaxed text-slate-500">{suggestion.rationale}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4">
            {onExpandContext && !contextExpanded && (
              <button
                type="button"
                className="w-full rounded-md border border-slate-700 py-2 text-center text-xs font-bold text-cyan-400 transition-colors hover:border-cyan-400/50 disabled:opacity-50"
                disabled={isExpanding}
                onClick={(e) => {
                  e.stopPropagation();
                  onExpandContext();
                }}
              >
                {isExpanding ? "展开中..." : "展开上下文"}
              </button>
            )}

            {contextExpanded && (
              <span className="text-[10px] font-bold text-emerald-400">上下文已展开</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
