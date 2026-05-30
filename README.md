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

## 当前技术方案

- **Next.js**：前后端一体，负责本地页面和 API Route。
- **React**：页面组件渲染。
- **TypeScript**：类型约束，提升可维护性。
- **Tailwind CSS**：快速构建清晰的报告页。
- **Zod**：校验结构化 AI Review 报告。
- **Vitest**：测试核心解析和分析逻辑。
- **GitHub REST API**：获取 PR 数据。
- **Vercel AI SDK**：统一模型调用入口，负责结构化输出调用。
- **@ai-sdk/openai**：默认 OpenAI-compatible provider，后续可替换为其他模型服务。

所有运行时依赖和开发依赖均列在 `package.json` 中，并通过 `package-lock.json` 锁定版本。

## 项目边界

当前 MVP 聚焦核心闭环：

- 输入 GitHub Pull Request URL。
- 获取 PR 元信息、文件变更、提交记录和 diff。
- 构建 PR 分析上下文。
- 生成结构化 Review 报告。
- 提供 demo/mock 模式，保证本地演示稳定。

暂不做 GitHub App、PR 机器人、Webhook、OAuth、云部署和企业规则中心。这些能力可以作为后续扩展，但不进入当前最小可用版本。

## 原创实现

第三方框架只提供基础设施。本项目的原创实现集中在：

- PR URL 解析和 GitHub PR 数据归一化。
- 面向代码审查的上下文构建。
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
