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
          "你是 LingQi 的 AI PR Review 助手。你要帮助 reviewer 快速理解 Pull Request，优先输出低噪音、高置信、有证据的审查建议。不要输出推理过程或自然语言说明，只输出 JSON 对象。",
        prompt: buildReviewPrompt(context)
      });

      return AiReviewReportSchema.parse(result.object);
    }
  };
}

export function buildReviewPrompt(context: PrAnalysisContext): string {
  const promptContext = context.contextBundle ?? context;
  const contextLabel = context.contextBundle
    ? "PR 分组上下文 JSON："
    : "PR 上下文 JSON：";

  const basePrompt = [
    "请基于下面的 GitHub Pull Request 上下文生成 AI Review 报告。",
    "只返回符合 schema 的结构化 Review 报告，不要输出 Markdown 解释。",
    "",
    "分析要求：",
    "- 总结 PR 的主要目的、影响范围和测试情况。",
    "- 如果提供了 groups，请按项目自定义分组理解变更，并优先审查 high priority 分组。",
    "- 如果提供了 groups，必须输出 groupAnalyses；每个输入 group 必须有且仅有一个对应的 groupAnalyses 项，即使该组没有发现风险也要输出空 keyRisks 和空 reviewSuggestions。",
    "- groupAnalyses 的 groupId、groupName 和 priority 必须来自输入 group，不能自造 groupId、groupName 或 priority。",
    "- groupAnalyses.changedFiles、keyRisks 和 reviewSuggestions 只能引用该 group.files 中的文件，不能跨组引用其他文件。",
    "- groupAnalyses 的 summary 应描述该项目分组内的变更目的、风险判断和上下文限制。",
    "- 全局 risks 和 suggestions 应从分组结果中挑选最高价值项，避免重复输出低价值问题。",
    "- 使用每个分组的 reviewPrompts 作为该组审查重点。",
    "- 标出 reviewer 应优先查看的文件，并说明原因。",
    "- 识别安全、数据、稳定性、性能、API、测试和可维护性风险。",
    "- Review 建议必须包含证据、影响和可执行建议。",
    "- 如果上下文里声明文件被截断、省略或存在 limitations，请写入对应分组的 limitations，不要编造未提供的上下文。",
    "- 不确定时降低 confidence，避免编造不存在的上下文。"
  ];

  const scoringPrompt = [
    "",
    "## 维度评分规则（0-100 分，7 个维度必须全部评分）",
    "",
    "对以下 7 个维度各给出 0-100 分，评分必须有具体证据支撑：",
    "security, data, stability, performance, api, testing, maintainability",
    "",
    "使用完整的 0-100 范围，不要所有分数集中在 50-80 之间。",
    "",
    "### 评分锚点（所有维度通用框架）",
    "- 90-100: 该维度无已知风险，代码达到最佳实践标准",
    "- 70-89:  存在少量轻微改进空间，不影响合并决策",
    "- 40-69:  存在多个中度问题，建议修复后合并",
    "- 10-39:  存在严重风险，需要在合并前解决",
    "- 0-9:    存在阻断性问题，代码不可合并",
    "",
    "### 证据要求（必须满足，否则评分无效）",
    "- 每个维度的 evidence 字段必须引用具体文件名和行号",
    "- 必须从 PR diff 中直接引用代码片段作为证据",
    "- 如果未发现该维度的风险，evidence 填写 '未在变更中发现该维度相关风险'",
    "- reasoning 字段先逐条分析发现的问题，再给出综合评分",
    "",
    "### 严重程度映射指引",
    "- score 0-25: severity 通常为 blocker",
    "- score 26-50: severity 通常为 major",
    "- score 51-75: severity 通常为 minor",
    "- score 76-100: severity 通常为 nit",
    "",
    "### 维度检查重点",
    "- security: 认证/授权绕过、注入攻击、密钥泄露、不安全的依赖",
    "- data: 数据一致性、SQL 注入、隐私数据泄露、Schema 迁移风险",
    "- stability: 未处理异常、空指针、资源泄漏、死锁、竞态条件",
    "- performance: N+1 查询、不必要对象创建、同步阻塞、内存泄漏",
    "- api: 接口契约变更、向后兼容、错误响应格式、限流缺失",
    "- testing: 新增代码的测试覆盖、边界条件、mock 合理性",
    "- maintainability: 命名规范、函数复杂度、重复代码、模块耦合",
    "",
    "输出 JSON 中 dimensionScores 字段包含 7 个对象，每个对象包含：",
    "dimension, score, severity, reasoning, evidence"
  ];

  const closing = [
    "",
    contextLabel,
    JSON.stringify(promptContext, null, 2)
  ];

  return [...basePrompt, ...scoringPrompt, ...closing].join("\n");
}
