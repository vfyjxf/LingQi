import { loadEnvConfig } from "@next/env";
import { createAiProviderFromConfig } from "@/lib/ai/provider-factory";
import { analyzePrContext } from "@/lib/analysis/analyzer";
import type { PrAnalysisContext } from "@/lib/analysis/context-builder";
import { analyzePullRequest } from "@/lib/api/analyze-pr";
import { loadLingQiConfig } from "@/lib/config/load-config";
import { buildReviewDraft } from "@/lib/review-draft/build-review-draft";
import { formatSmokeOutput } from "@/lib/smoke/smoke-output";

loadEnvConfig(process.cwd());

const mockContext: PrAnalysisContext = {
  pr: {
    title: "Add checkout webhook validation",
    body: "Validate incoming checkout webhook signature before processing.",
    author: "demo-user",
    avatarUrl: "https://avatars.githubusercontent.com/u/583231?v=4",
    url: "https://github.com/acme/shop/pull/42",
    baseRef: "main",
    headRef: "feature/webhook-validation",
    state: "open"
  },
  files: [
    {
      filename: "app/api/checkout/route.ts",
      status: "modified",
      additions: 18,
      deletions: 2,
      changes: 20,
      patch: [
        "@@ -1,5 +1,12 @@",
        " export async function POST(request: Request) {",
        "+  const signature = request.headers.get('x-webhook-signature');",
        "+  if (!signature) {",
        "+    return new Response('missing signature', { status: 401 });",
        "+  }",
        "   const payload = await request.json();",
        "   await processCheckout(payload);",
        " }"
      ].join("\n"),
      riskHints: ["api", "security"]
    }
  ],
  commits: [
    {
      sha: "abc1234",
      message: "feat: validate checkout webhook signature"
    }
  ],
  stats: {
    changedFiles: 1,
    additions: 18,
    deletions: 2,
    changes: 20
  }
};

async function main() {
  const config = loadLingQiConfig();
  const prUrl = getPrUrlArg(process.argv.slice(2)) ?? process.env.SMOKE_PR_URL;

  if (prUrl) {
    const result = await analyzePullRequest({
      prUrl,
      env: process.env
    });

    console.log(
      formatSmokeOutput({
        mode: "real-pr",
        model: config.ai.model,
        prUrl: result.context.prUrl,
        author: result.context.author,
        changedFiles: result.context.changedFiles,
        additions: result.context.additions,
        deletions: result.context.deletions,
        report: result.report,
        reviewDraft: result.reviewDraft
      })
    );
    return;
  }

  const provider = createAiProviderFromConfig({
    ai: config.ai,
    env: process.env
  });
  const report = await analyzePrContext(mockContext, provider);
  const reviewDraft = buildReviewDraft(report, mockContext);

  console.log(
    formatSmokeOutput({
      mode: "mock",
      model: config.ai.model,
      prUrl: mockContext.pr.url,
      author: mockContext.pr.author,
      changedFiles: mockContext.stats.changedFiles,
      additions: mockContext.stats.additions,
      deletions: mockContext.stats.deletions,
      report,
      reviewDraft
    })
  );
}

function getPrUrlArg(args: string[]): string | undefined {
  const prFlagIndex = args.indexOf("--pr");
  if (prFlagIndex >= 0) {
    return args[prFlagIndex + 1]?.trim() || undefined;
  }

  return undefined;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
