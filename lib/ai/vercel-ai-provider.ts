import { createDeepSeek, deepseek } from "@ai-sdk/deepseek";
import {
  generateObject as defaultGenerateObject,
  zodSchema,
  type LanguageModel
} from "ai";
import type { PrAnalysisContext } from "@/lib/analysis/context-builder";
import type { AiProvider } from "@/lib/ai/provider";
import {
  AiReviewReportSchema,
  type AiReviewReport
} from "@/lib/report/schema";

type GenerateObject = (options: {
  model: LanguageModel;
  schema: ReturnType<typeof zodSchema<AiReviewReport>>;
  system: string;
  prompt: string;
}) => Promise<{ object: unknown }>;

export type VercelAiProviderOptions = {
  apiKey?: string;
  model?: LanguageModel;
  modelId?: string;
  generateObject?: GenerateObject;
};

export function createVercelAiProvider(
  options: VercelAiProviderOptions = {}
): AiProvider {
  const model =
    options.model ??
    (options.apiKey
      ? createDeepSeek({ apiKey: options.apiKey })(
          options.modelId ?? "deepseek-v4-flash"
        )
      : deepseek(options.modelId ?? "deepseek-v4-flash"));
  const generateObject = options.generateObject ?? defaultGenerateObject;

  return {
    async analyze(context: PrAnalysisContext): Promise<AiReviewReport> {
      const result = await generateObject({
        model,
        schema: zodSchema(AiReviewReportSchema),
        system:
          "你是 LingQi 的 AI PR Review 助手。你要帮助 reviewer 快速理解 Pull Request，优先输出低噪音、高置信、有证据的审查建议。",
        prompt: buildReviewPrompt(context)
      });

      return AiReviewReportSchema.parse(result.object);
    }
  };
}

export function buildReviewPrompt(context: PrAnalysisContext): string {
  return [
    "请基于下面的 GitHub Pull Request 上下文生成 AI Review 报告。",
    "只返回符合 schema 的结构化 Review 报告，不要输出 Markdown 解释。",
    "",
    "分析要求：",
    "- 总结 PR 的主要目的、影响范围和测试情况。",
    "- 标出 reviewer 应优先查看的文件，并说明原因。",
    "- 识别安全、数据、稳定性、性能、API、测试和可维护性风险。",
    "- Review 建议必须包含证据、影响和可执行建议。",
    "- 不确定时降低 confidence，避免编造不存在的上下文。",
    "",
    "PR 上下文 JSON：",
    JSON.stringify(context, null, 2)
  ].join("\n");
}
