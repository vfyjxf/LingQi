import { NextResponse } from "next/server";
import { buildReviewerOptions } from "@/lib/config/reviewer-options";

export function GET() {
  try {
    return NextResponse.json({
      reviewers: buildReviewerOptions()
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "读取 reviewer 配置失败"
      },
      { status: 500 }
    );
  }
}
