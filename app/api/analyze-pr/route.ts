import { NextResponse } from "next/server";
import {
  analyzePullRequest,
  AnalyzePrConfigError,
  AnalyzePrInputError,
  AnalyzePrUpstreamError
} from "@/lib/api/analyze-pr";

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    const result = await analyzePullRequest({
      prUrl: body?.prUrl,
      userPrompt: body?.userPrompt,
      reviewerIds: body?.reviewerIds,
      env: process.env
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "PR 分析失败"
      },
      { status: getStatusCode(error) }
    );
  }
}

async function readJsonBody(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new AnalyzePrInputError("请求体不是有效 JSON");
  }
}

function getStatusCode(error: unknown): number {
  if (error instanceof AnalyzePrInputError) {
    return 400;
  }

  if (error instanceof AnalyzePrUpstreamError) {
    return 502;
  }

  if (error instanceof AnalyzePrConfigError) {
    return 500;
  }

  return 500;
}
