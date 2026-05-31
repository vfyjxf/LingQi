# LingQi

LingQi 是一个面向 GitHub Pull Request 的 AI Review 助手。

它不会替代 reviewer，也不会在 PR 里制造一堆低价值评论。它的目标是先把 PR 讲清楚：这次改了什么、哪些文件最值得看、哪里可能有风险、reviewer 可以从哪里开始。

当前版本定位为一个本地运行的 Web 工具：输入 GitHub PR 链接，生成一份结构化 Review 报告。

## 它要做什么

- **总结 PR**：提炼改动目的、影响范围和关键文件。
- **标出审查重点**：告诉 reviewer 哪些文件和改动应该优先看。
- **识别风险代码**：关注安全、数据、稳定性、API、测试缺口等高风险变更。
- **生成 Review 建议**：输出带严重级别、置信度和证据的建议。
- **说明上下文限制**：明确本次分析用了哪些上下文，哪些地方需要人工判断。

## 当前后端能力

- `POST /api/analyze-pr`：输入 GitHub PR 链接，返回结构化报告、PR diff、Review 草稿、Review 提交 dry-run payload 和上下文审计摘要。
- `GET /api/health/config`：检查配置文件、AI 模型密钥、GitHub Token 和 Review Profile 状态，便于本地演示前排查运行环境。
- Review 草稿只生成预览和 dry-run payload，不会自动写回 GitHub。
- 上下文构建会按 `reviewProfile` 分组，并记录文件省略、patch 截断和大 PR 限制。
- 分组分析结果会校验是否覆盖配置中的分组，避免模型编造分组或跨组引用文件。

## 当前技术方案

- **Next.js**：前后端一体，负责本地页面和 API Route。
- **React**：页面组件渲染。
- **TypeScript**：类型约束，提升可维护性。
- **Tailwind CSS**：快速构建清晰的报告页。
- **Zod**：校验结构化 AI Review 报告。
- **Vitest**：测试核心解析和分析逻辑。
- **GitHub REST API**：获取 PR 数据。
- **Vercel AI SDK**：统一模型调用入口，负责结构化输出调用。
- **@ai-sdk/deepseek**：默认 DeepSeek provider，用于本地真实模型验证。
- **minimatch**：用于 Review Profile 的路径 glob 匹配。
- **Recharts**：用于效能统计面板中的图表展示。
- **tsx**：运行本地 TypeScript smoke 脚本。

所有运行时依赖和开发依赖均列在 `package.json` 中，并通过 `package-lock.json` 锁定版本。

## 项目边界

当前 MVP 聚焦核心闭环：

- 输入 GitHub Pull Request URL。
- 获取 PR 元信息、文件变更、提交记录和 diff。
- 构建 PR 分析上下文。
- 生成结构化 Review 报告。
- 提供 demo/mock 模式，保证本地演示稳定。

暂不做 GitHub App、PR 机器人、Webhook、OAuth、云部署和企业规则中心。这些能力可以作为后续扩展，但不进入当前最小可用版本。

## 设计取舍

LingQi 的核心不是把模型回答直接贴到 PR 里，而是围绕代码评审场景做一层约束：先拿到可信上下文，再让模型输出结构化结论，最后把高价值建议展示给 reviewer。

### 模型选择

当前默认使用 DeepSeek。它的响应速度较快，具备 1M 级长上下文能力，适合处理大 PR、长 diff 和分组上下文这类需要一次性阅读较多材料的分析任务。对本地演示来说，DeepSeek 也更容易在速度和成本之间取得平衡。

系统没有把模型写死在业务流程里。配置中可以声明 provider、model 和密钥环境变量，AI 调用通过 provider 抽象进入分析编排，因此同一套 Review 流程可以把不同 provider/model 配成不同 reviewer 角色。当前默认 reviewer 使用 DeepSeek 完成 PR 总览、风险初筛和建议草稿；在设计上也可以接入 GPT-5.5 或同级强推理模型作为专家 reviewer，让它针对 blocker、major 或低置信度问题做更深推理，用更高强度的思考换取准确性。

### 上下文获取方式

系统通过 GitHub REST API 获取 PR 元信息、变更文件、提交记录和 patch，再由上下文构建层整理成适合模型阅读的结构：

- 保留 PR 标题、描述、作者、分支和变更统计，帮助模型理解修改目的。
- 汇总文件 diff、增删行数和提交信息，作为风险识别的主要证据。
- 使用 `reviewProfile` 按项目自定义规则把文件分组，让模型按模块理解变更，而不是只看一段扁平 diff。
- 对大 PR 做上下文预算控制，记录被省略文件、patch 截断和大 PR 限制，避免模型假装看过没有提供的内容。
- 为 diff 解析可评论行号和带 `RIGHT` 行号的 `numberedPatch`，减少 Review 建议行号与 GitHub inline comment 位置不一致的问题。

### 准确性与误报控制

AI 输出必须通过 Zod schema 校验，分组分析还会校验 groupId、文件引用和分组覆盖情况。Review 草稿生成阶段会再次检查文件是否属于本次 PR、行号是否可评论、置信度是否足够。对无法定位到具体行的风险，系统会保留提示但不强行生成 inline comment，避免把错误行号写进 GitHub Review。

设计上更偏向低噪音：优先输出 blocker、major、minor 级别的高价值建议，要求每条建议包含证据、影响和可执行修复方向。上下文不足时要求模型降低 confidence 或写入 limitations，而不是补全不存在的调用链。

### 响应速度与使用体验

MVP 采用本地 Next.js 应用，省去登录系统、Webhook 和部署流程，用户输入 PR URL 后即可分析。后端会把 GitHub 数据获取、上下文构建、AI 分析和 Review 草稿生成串成一个请求，前端用进度状态、统计面板、风险卡片和 diff 视图帮助 reviewer 快速定位重点。

为了兼顾速度和可读性，系统先做分组与上下文预算，减少模型无差别阅读所有文件的成本；报告中同时展示上下文限制，方便 reviewer 判断哪些结论需要人工复核。

## 原创实现

第三方框架只提供基础设施。本项目的原创实现集中在：

- PR URL 解析和 GitHub PR 数据归一化。
- 面向代码审查的上下文构建。
- 项目自定义 Review Profile、变更分组和上下文预算管理。
- 风险分类、审查重点和 Review 建议的数据结构。
- AI Provider 抽象、Review 编排流程和结构化结果校验。
- Review 报告页面的信息组织和交互呈现。
- 本地 demo/mock 分析模式。

Vercel AI SDK 和模型 provider 只负责模型调用能力；PR 上下文如何组织、Review 报告如何分层、风险与建议如何约束，都是 LingQi 自己实现的部分。

本项目围绕所选议题“AI PR Review 助手”自主开发。当前初始化框架没有复用个人过去项目代码。

如果后续开发中确实需要复用任何既有代码片段，会在对应 Pull Request 描述中明确注明来源和复用范围，避免把复用内容混同为本项目原创实现。

## 运行项目

安装依赖：

```bash
npm install
```

启动开发服务器：

```bash
npm run dev
```

打开 `http://localhost:3000`。

## 模型配置

LingQi 使用 `lingqi.config.json` 保存可提交的项目配置，例如模型、Review 输出策略、上下文限制和 GitHub API 参数。默认配置已经放在仓库根目录。

如果需要本地覆盖配置，可以创建 `lingqi.config.local.json`。这个文件已被 `.gitignore` 忽略，适合调整本机的模型参数或建议数量：

```json
{
  "review": {
    "maxSuggestions": 5
  },
  "context": {
    "maxFiles": 20
  }
}
```

密钥不要写进 JSON 配置文件。真实模型调用需要在 `.env.local` 中配置：

```bash
DEEPSEEK_API_KEY=sk-...
GITHUB_TOKEN=ghp_...
```

`lingqi.config.json` 里的 `ai.apiKeyEnv` 决定从哪个环境变量读取模型密钥，默认是 `DEEPSEEK_API_KEY`。如果本地想换成别的变量名，可以在 `lingqi.config.local.json` 覆盖：

```json
{
  "ai": {
    "apiKeyEnv": "CUSTOM_AI_KEY"
  }
}
```

`GITHUB_TOKEN` 可选。公开 PR 可以先不配置，私有仓库或需要提高 GitHub API 限流时再配置。

## Review Profile

`reviewProfile` 用来描述当前项目希望如何审查 PR。它支持按路径和关键词把文件分到项目自定义分组，并为每个分组设置优先级、上下文预算和审查提示。

这些分组会进入 AI 分析上下文，帮助模型按项目模块理解变更。未匹配文件会进入 `fallbackGroup`，避免被遗漏。

本地 smoke 验证：

```bash
npm run smoke:ai
```

这个命令会读取 `lingqi.config.json`、`lingqi.config.local.json` 和 `.env.local`，使用一份很小的 mock PR 上下文调用 DeepSeek，并检查返回结果能否通过 LingQi 的结构化 Review schema。

如果要用真实公开 PR 验证完整链路，可以传入 PR 链接：

```bash
npm run smoke:ai -- --pr https://github.com/owner/repo/pull/123
```

脚本会输出 PR 摘要、风险数、建议数、Review 草稿数量、分组分析数量和上下文限制，方便演示前快速判断后端是否跑通。后续 `/api/analyze-pr` 也会复用同一套配置入口。
