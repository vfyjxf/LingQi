"use client";

import { useState } from "react";
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

const severityBadge: Record<Severity, { label: string; cls: string }> = {
  blocker: {
    label: "Blocker",
    cls: "bg-red-400/10 text-red-400 border-red-400/30",
  },
  major: {
    label: "Major",
    cls: "bg-orange-400/10 text-orange-400 border-orange-400/30",
  },
  minor: {
    label: "Minor",
    cls: "bg-blue-400/10 text-blue-400 border-blue-400/30",
  },
  nit: {
    label: "Nit",
    cls: "bg-slate-400/10 text-slate-400 border-slate-400/30",
  },
};

const categoryBadge: Record<RiskCategory, { label: string; cls: string }> = {
  security: {
    label: "Security",
    cls: "bg-red-400/10 text-red-400 border-red-400/30",
  },
  data: {
    label: "Data",
    cls: "bg-yellow-400/10 text-yellow-400 border-yellow-400/30",
  },
  stability: {
    label: "Stability",
    cls: "bg-orange-400/10 text-orange-400 border-orange-400/30",
  },
  performance: {
    label: "Performance",
    cls: "bg-purple-400/10 text-purple-400 border-purple-400/30",
  },
  api: {
    label: "API",
    cls: "bg-green-400/10 text-green-400 border-green-400/30",
  },
  testing: {
    label: "Testing",
    cls: "bg-cyan-400/10 text-cyan-400 border-cyan-400/30",
  },
  maintainability: {
    label: "Maintainability",
    cls: "bg-slate-400/10 text-slate-400 border-slate-400/30",
  },
};

export default function RiskCard({
  risk,
  suggestion,
  highlighted,
  onExpandContext,
  isExpanding,
  contextExpanded,
}: RiskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const sev = severityBadge[risk.severity];
  const cat = categoryBadge[risk.category];

  return (
    <div
      className={[
        "rounded-lg border p-4 shadow transition-all hover:shadow-lg",
        highlighted
          ? "border-cyan-300/50 shadow-cyan-300/10"
          : "border-slate-800 bg-slate-900/60 shadow-slate-900/50",
      ].join(" ")}
    >
      {/* Header: badges + title */}
      <div className="mb-2">
        <div className="mb-1 flex gap-2">
          <span
            className={[
              "inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold",
              sev.cls,
            ].join(" ")}
          >
            {sev.label}
          </span>
          <span
            className={[
              "inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium",
              cat.cls,
            ].join(" ")}
          >
            {cat.label}
          </span>
        </div>
        <h3 className="text-sm font-semibold leading-snug text-slate-100">
          {risk.title}
        </h3>
      </div>

      {/* File + line */}
      <p className="mb-2 text-xs font-mono text-cyan-400">
        {risk.file}
        {risk.line && `:${risk.line}`}
      </p>

      {/* Impact */}
      <p className="text-xs leading-relaxed text-slate-400">{risk.impact}</p>

      {/* Expand toggle */}
      <div className="mt-3 flex items-center gap-4">
        <button
          className="text-xs text-cyan-300 hover:text-cyan-200 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "收起详情" : "查看详情"}
        </button>

        {onExpandContext && !contextExpanded && (
          <button
            className="text-xs text-slate-500 hover:text-cyan-300 transition-colors disabled:text-slate-600"
            disabled={isExpanding}
            onClick={onExpandContext}
          >
            {isExpanding ? "展开中..." : "展开上下文"}
          </button>
        )}

        {contextExpanded && (
          <span className="text-[11px] text-green-400 font-medium">
            上下文已展开
          </span>
        )}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="mt-3 space-y-3 border-t border-slate-800 pt-3">
          {/* Evidence */}
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              证据
            </p>
            <p className="text-xs leading-relaxed text-slate-400">
              {risk.evidence}
            </p>
          </div>

          {/* Suggestion */}
          {suggestion && (
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                修复建议
              </p>
              <p className="text-xs leading-relaxed text-slate-300">
                {suggestion.recommendation}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                {suggestion.rationale}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
