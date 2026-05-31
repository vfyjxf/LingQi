"use client";

import { Sparkles, FolderOpen, Code, User, FileText } from "lucide-react";

export type ReviewSummaryMeta = {
  owner: string;
  repo: string;
  pullNumber: number;
  filesCount: number;
  totalAdditions: number;
  totalDeletions: number;
  author: string;
  avatarUrl?: string;
};

export type ReviewSummaryData = {
  title: string;
  overview: string;
  changedModules: string[];
  testSummary: string;
};

type ReviewSummaryProps = {
  summary: ReviewSummaryData;
  generalSuggestions: string[];
  meta: ReviewSummaryMeta;
};

export default function ReviewSummary({ summary, generalSuggestions, meta }: ReviewSummaryProps) {
  return (
    <div className="space-y-6">
      {/* Meta header */}
      <div className="flex flex-col gap-4 rounded-md border border-slate-800 bg-slate-900/60 p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          {meta.avatarUrl ? (
            <img src={meta.avatarUrl} alt={meta.author} className="h-12 w-12 rounded-full border border-slate-700" referrerPolicy="no-referrer" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-slate-800">
              <User className="h-6 w-6 text-slate-500" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-400">#{meta.pullNumber}</span>
              <span className="text-sm font-semibold text-slate-200">@{meta.author}</span>
            </div>
            <h2 className="mt-1 text-lg font-bold text-slate-100">{summary.title}</h2>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <span className="font-mono">{meta.owner}/{meta.repo}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 border-t border-slate-800 pt-4 md:border-t-0 md:pt-0 font-mono text-xs text-slate-500">
          <div className="text-center">
            <p className="font-sans text-[10px] font-semibold uppercase tracking-wider text-slate-500">Files</p>
            <p className="mt-1 text-sm font-semibold text-slate-200">{meta.filesCount}</p>
          </div>
          <div className="text-center">
            <p className="font-sans text-[10px] font-semibold uppercase tracking-wider text-green-400">Added</p>
            <p className="mt-1 text-sm font-bold text-green-400">+{meta.totalAdditions}</p>
          </div>
          <div className="text-center">
            <p className="font-sans text-[10px] font-semibold uppercase tracking-wider text-red-400">Deleted</p>
            <p className="mt-1 text-sm font-bold text-red-400">-{meta.totalDeletions}</p>
          </div>
        </div>
      </div>

      {/* Description + modules grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="space-y-4 rounded-md border border-slate-800 bg-slate-900/60 p-6 shadow-sm md:col-span-2">
          <h3 className="flex items-center gap-2 border-b border-slate-800 pb-3 text-sm font-semibold text-slate-200">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            PR 变更总结与主要目标
          </h3>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-300">
            {summary.overview || "无 PR 变更描述。"}
          </p>
        </div>

        <div className="space-y-4 rounded-md border border-slate-800 bg-slate-900/60 p-6 shadow-sm">
          <h3 className="flex items-center gap-2 border-b border-slate-800 pb-3 text-sm font-semibold text-slate-200">
            <Code className="h-4 w-4 text-cyan-400" />
            变更模块
          </h3>
          <div className="space-y-2">
            {summary.changedModules.length > 0 ? (
              summary.changedModules.map((mod, i) => (
                <div key={i} className="flex items-center gap-2 rounded border border-slate-800 bg-slate-800/50 px-3 py-2">
                  <FileText className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
                  <span className="font-mono text-xs text-slate-300">{mod}</span>
                </div>
              ))
            ) : (
              <p className="text-xs italic text-slate-500">无模块信息。</p>
            )}
          </div>
        </div>
      </div>

      {/* Test summary */}
      {summary.testSummary && (
        <div className="rounded-md border border-slate-800 bg-slate-900/60 p-6 shadow-sm space-y-4">
          <h3 className="flex items-center gap-2 border-b border-slate-800 pb-3 text-sm font-semibold text-slate-200">
            <FileText className="h-4 w-4 text-purple-400" />
            测试摘要
          </h3>
          <p className="text-sm leading-relaxed text-slate-300">{summary.testSummary}</p>
        </div>
      )}

      {/* General suggestions */}
      {generalSuggestions.length > 0 && (
        <div className="rounded-md border border-slate-800 bg-slate-900/60 p-6 shadow-sm space-y-4">
          <h3 className="flex items-center gap-2 border-b border-slate-800 pb-3 text-sm font-semibold text-slate-200">
            <FolderOpen className="h-4 w-4 text-green-400" />
            架构与质量改进建议
          </h3>
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {generalSuggestions.map((suggestion, idx) => (
              <li key={idx} className="group flex items-start gap-3 rounded-md border border-slate-800 bg-slate-800/30 p-3 transition-all hover:border-cyan-400/50 hover:bg-slate-800/50">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-xs font-bold text-cyan-400 group-hover:bg-cyan-400 group-hover:text-slate-950 transition-all">
                  {idx + 1}
                </div>
                <p className="text-sm leading-relaxed text-slate-300">{suggestion}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
