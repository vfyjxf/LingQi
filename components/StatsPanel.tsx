"use client";

export type StatsData = {
  filesChanged: number;
  linesAdded: number;
  linesDeleted: number;
  riskCount: number;
  blockerCount: number;
  majorCount: number;
  minorCount: number;
  nitCount: number;
};

type StatsPanelProps = {
  stats: StatsData;
};

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3">
      <span className={["text-lg font-bold", color].join(" ")}>{value}</span>
      <span className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-500">
        {label}
      </span>
    </div>
  );
}

export default function StatsPanel({ stats }: StatsPanelProps) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-5 shadow">
      {/* Overview row */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <StatCard
          label="Files"
          value={stats.filesChanged}
          color="text-slate-200"
        />
        <StatCard
          label="Added"
          value={stats.linesAdded}
          color="text-green-400"
        />
        <StatCard
          label="Deleted"
          value={stats.linesDeleted}
          color="text-red-400"
        />
      </div>

      {/* Risk breakdown */}
      <h4 className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        Risks by Severity
      </h4>
      <div className="grid grid-cols-4 gap-2">
        <StatCard
          label="Blocker"
          value={stats.blockerCount}
          color="text-red-400"
        />
        <StatCard
          label="Major"
          value={stats.majorCount}
          color="text-orange-400"
        />
        <StatCard
          label="Minor"
          value={stats.minorCount}
          color="text-blue-400"
        />
        <StatCard
          label="Nit"
          value={stats.nitCount}
          color="text-slate-400"
        />
      </div>
    </div>
  );
}
