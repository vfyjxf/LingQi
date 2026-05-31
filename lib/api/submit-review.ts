import { z } from "zod";
import { submitGitHubReview } from "@/lib/github/github-client";
import type { SubmittedGitHubReview } from "@/lib/github/github-types";

type EnvLike = Record<string, string | undefined>;

const ReviewCommentSchema = z.object({
  path: z.string().min(1),
  line: z.number().int().positive(),
  side: z.literal("RIGHT"),
  body: z.string().min(1)
});

const SubmitReviewInputSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  pullNumber: z.number().int().positive(),
  body: z.string().min(1),
  comments: z.array(ReviewCommentSchema).min(1),
  dryRun: z.boolean().default(true)
});

export type SubmitReviewInput = z.infer<typeof SubmitReviewInputSchema>;

export type SubmitReviewResult = {
  dryRun: boolean;
  submitted: boolean;
  review?: SubmittedGitHubReview;
  payload: {
    event: "COMMENT";
    body: string;
    comments: SubmitReviewInput["comments"];
  };
};

export class SubmitReviewInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SubmitReviewInputError";
  }
}

export class SubmitReviewConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SubmitReviewConfigError";
  }
}

export class SubmitReviewUpstreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SubmitReviewUpstreamError";
  }
}

export async function submitReview({
  input,
  env = process.env
}: {
  input: unknown;
  env?: EnvLike;
}): Promise<SubmitReviewResult> {
  const parsed = parseInput(input);
  const payload = {
    event: "COMMENT" as const,
    body: parsed.body,
    comments: parsed.comments
  };

  if (parsed.dryRun) {
    return {
      dryRun: true,
      submitted: false,
      payload
    };
  }

  const token = env.GITHUB_TOKEN?.trim();
  if (!token) {
    throw new SubmitReviewConfigError("缺少 GITHUB_TOKEN，无法写入 GitHub Review");
  }

  try {
    const review = await submitGitHubReview(
      {
        owner: parsed.owner,
        repo: parsed.repo,
        pullNumber: parsed.pullNumber,
        ...payload
      },
      { token }
    );

    return {
      dryRun: false,
      submitted: true,
      review,
      payload
    };
  } catch (error) {
    throw new SubmitReviewUpstreamError(
      error instanceof Error ? error.message : "GitHub Review 写入失败"
    );
  }
}

function parseInput(input: unknown): SubmitReviewInput {
  const parsed = SubmitReviewInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new SubmitReviewInputError("Review 提交请求无效");
  }

  return parsed.data;
}
