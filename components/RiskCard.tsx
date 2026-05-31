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
};

const severityConfig: Record<Severity, { label: string; icon: typeof Shield; iconBg: string; badge: string }> = {
  blocker: { label: "阻断", icon: Shield, iconBg: "bg-red-500 text-white", badge: "bg-red-400/10 border-red-400/30 text-red-400" },
  major: { label: "严重", icon: AlertTriangle, iconBg: "bg-orange-500 text-white", badge: "bg-orange-400/10 border-orange-400/30 text-orange-400" },
  minor: { label: "轻微", icon: AlertCircle, iconBg: "bg-blue-500 text-white", badge: "bg-blue-400/10 border-blue-400/30 text-blue-400" },
  nit: { label: "建议", icon: Info, iconBg: "bg-slate-500 text-white", badge: "bg-slate-400/10 border-slate-400/30 text-slate-400" },
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
}: RiskCardProps) {
  const [expanded, setExpanded] = useState(true);
  const sev = severityConfig[risk.severity];

  return (
    <div
      className={`rounded-md border shadow-sm overflow-hidden transition-all duration-200 ${
        highlighted
          ? "border-[#58a6ff]/50 shadow-[#58a6ff]/10"
          : "border-[#30363d] bg-[#161b22] hover:border-[#8c959f]"
      }`}
    >
      {/* Card header — clickable */}
      <button
        type="button"
        className="flex w-full items-start gap-4 p-5 text-left cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-label={risk.title}
      >
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${sev.iconBg}`}>
          <sev.icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${sev.badge}`}>
              {sev.label}
            </span>
            <span className="rounded-full border border-[#30363d] bg-[#21262d] px-2 py-0.5 text-[10px] font-semibold text-[#8b949e]">
              {categoryLabel[risk.category]}
            </span>
            <span className="rounded border border-[#58a6ff]/30 bg-[#58a6ff]/10 px-2 py-0.5 font-mono text-[10px] text-[#58a6ff]">
              {risk.file}{risk.line ? `:${risk.line}` : ""}
            </span>
          </div>

          <h4 className="text-sm font-bold leading-snug text-[#c9d1d9]">{risk.title}</h4>
        </div>

        <div className="p-1 text-[#8b949e]">
          {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="space-y-4 border-t border-[#30363d] px-5 pb-5 pt-1 text-xs">
          {/* Impact */}
          <p className="leading-relaxed text-[#8b949e]">{risk.impact}</p>

          {/* Evidence */}
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#8b949e]">证据</span>
            <p className="leading-relaxed text-[#8b949e]">{risk.evidence}</p>
          </div>

          {/* Suggestion */}
          {suggestion && (
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#8b949e]">修复建议</span>
              <p className="leading-relaxed text-[#c9d1d9]">{suggestion.recommendation}</p>
              <p className="text-[10px] leading-relaxed text-[#8b949e]">{suggestion.rationale}</p>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
