import { NextResponse } from "next/server";
import {
  submitReview,
  SubmitReviewConfigError,
  SubmitReviewInputError,
  SubmitReviewUpstreamError
} from "@/lib/api/submit-review";

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    const result = await submitReview({
      input: body,
      env: process.env
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "GitHub Review 写入失败"
      },
      { status: getStatusCode(error) }
    );
  }
}

async function readJsonBody(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new SubmitReviewInputError("请求体不是有效 JSON");
  }
}

function getStatusCode(error: unknown): number {
  if (error instanceof SubmitReviewInputError) {
    return 400;
  }

  if (error instanceof SubmitReviewConfigError) {
    return 500;
  }

  if (error instanceof SubmitReviewUpstreamError) {
    return 502;
  }

  return 500;
}
