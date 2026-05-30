import { loadEnvConfig } from "@next/env";
import { analyzePrContext } from "@/lib/analysis/analyzer";
import type { PrAnalysisContext } from "@/lib/analysis/context-builder";
import { getDeepSeekConfig } from "@/lib/ai/config";
import { createVercelAiProvider } from "@/lib/ai/vercel-ai-provider";

loadEnvConfig(process.cwd());

const context: PrAnalysisContext = {
  pr: {
    title: "Add checkout webhook validation",
    body: "Validate incoming checkout webhook signature before processing.",
    author: "demo-user",
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
  const config = getDeepSeekConfig();
  const provider = createVercelAiProvider(config);
  const report = await analyzePrContext(context, provider);

  console.log("AI smoke 调用成功");
  console.log(`模型: ${config.modelId}`);
  console.log(`标题: ${report.summary.title}`);
  console.log(`风险数: ${report.risks.length}`);
  console.log(`建议数: ${report.suggestions.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
