import { NextResponse } from "next/server";
import { buildConfigHealthReport } from "@/lib/config/health-check";

export function GET() {
  const report = buildConfigHealthReport({
    env: process.env
  });

  return NextResponse.json(report, {
    status: report.status === "error" ? 500 : 200
  });
}
