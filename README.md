# LingQi

LingQi 是一个面向 GitHub Pull Request 的 AI Review 助手。

它不会替代 reviewer，也不会在 PR 里制造一堆低价值评论。它的目标是先把 PR 讲清楚：这次改了什么、哪些文件最值得看、哪里可能有风险、reviewer 可以从哪里开始。

当前版本定位为一个本地运行的 Web 工具：输入 GitHub PR 链接，选择 reviewer，生成一份结构化 Review 报告，并在 diff 视图中预览可写回 GitHub Review 的评论草稿。

## 演示视频

- 文件：`Timeline 1.mp4`
- 链接：https://pan.baidu.com/s/1t09OntnMqArndyzdtREmqg?pwd=ttsq
- 提取码：`ttsq`

## 它要做什么

- **总结 PR**：提炼改动目的、影响范围和关键文件。
- **标出审查重点**：告诉 reviewer 哪些文件和改动应该优先看。
- **识别风险代码**：关注安全、数据、稳定性、API、测试缺口等高风险变更。
- **生成 Review 建议**：输出带严重级别、置信度和证据的建议。
- **辅助写 Review comment**：把高价值风险和建议转换成可定位到代码行的评论草稿。
- **说明上下文限制**：明确本次分析用了哪些上下文，哪些地方需要人工判断。

## 当前完整功能

### PR 分析流程

- 输入 GitHub Pull Request URL 后，系统会解析 owner、repo 和 pull number，并通过 GitHub REST API 获取 PR 元信息、文件变更、提交记录和 diff。
- 支持公开仓库直接分析；配置 `GITHUB_TOKEN` 后可访问授权范围内的私有仓库，并降低 GitHub API 限流风险。
- GitHub 请求会同时拉取 PR 基本信息、最多 100 个变更文件和最多 100 条提交记录，并保留作者、头像、base/head 分支、PR 状态和提交 message。
- 支持用户选择 AI reviewer；不选择时使用自动策略：默认执行 `always` reviewer，并在已有分析出现 `blocker`、`major` 或低置信结果后触发 `high-risk` reviewer。
- 支持 `userPrompt` 补充审查要求，作为本次 Review 的额外关注点进入模型上下文。
- 请求输入会做前置校验：PR URL 必须合法，`reviewerIds` 必须是字符串数组，`userPrompt` 最多 1000 个字符。
- 分析结果会返回结构化报告、上下文审计摘要、Review 草稿和 GitHub Review dry-run payload。

### 多 reviewer 分析

- reviewer 可在 `lingqi.config.json` 中配置名称、角色、模型、触发方式和关注点。
- 支持 `fast`、`expert`、`custom` 三类 reviewer 角色。
- 支持 `always`、`high-risk`、`manual` 三种触发方式。
- 请求传入 `reviewerIds` 时，只执行用户选中的 reviewer；未传时按自动策略执行。
- `manual` reviewer 默认不会自动执行，只有用户显式选择时才参与分析。
- reviewer 执行时会把自己的名称、角色和关注点注入分析上下文，让不同 reviewer 的审查侧重点可区分。
- 多个 reviewer 的风险、建议和上下文说明会合并去重，最终形成一份统一报告。

### 上下文和风险提示

- 系统会为每个变更文件计算风险提示，包括 `security`、`api`、`database`、`config`、`testing` 和 `large-change`。
- diff 会被解析成带行号的 `numberedPatch`，同时记录新侧可评论行 `commentableLines` 和旧侧行号 `oldLines`。
- `reviewProfile` 支持按路径和关键词把文件分组，并为不同分组配置审查提示和上下文预算。
- 上下文审计会统计每个分组纳入了多少文件、省略了多少文件、截断了多少 patch，并把限制原因返回给前端。
- 分组分析会校验 groupId、文件引用和分组覆盖，避免模型编造分组或跨组引用文件。

### 报告与审计界面

- 统计页展示 PR 信息、作者头像、测试摘要、变更模块、风险数量、增删行和风险分布图。
- 统计页会根据 blocker、major、minor、nit 数量计算 PR 综合质量评级，用图表展示严重度和风险类别分布。
- 审计页采用左右 50/50 布局：左侧是文件树和 diff，右侧是风险卡片列表。
- 文件树支持“全部文件”默认视图和单文件筛选；点击文件后，diff 与风险卡片同步切换到该文件。
- 文件树支持搜索文件名，并在每个文件旁展示风险数；右侧筛选标签可以一键清除当前文件筛选。
- 风险卡片支持定位到 diff 中的相关行，便于 reviewer 从问题描述跳回代码上下文。
- 风险卡片会展示严重级别、风险分类、文件位置、证据、影响和修复建议，并支持展开/折叠。
- diff 视图会在代码行下方展示 inline review 草稿，并支持展开、折叠、补充 comment 和 dry-run 写入提示。
- 全局滚动条和页面布局按 GitHub Dark 风格做了收敛，减少审计页三列拥挤和滚动条干扰。

### Review 草稿与写回预案

- 系统会把高价值风险和建议转换为 Review 草稿评论。
- 草稿生成时会检查文件是否属于本次 PR、行号是否在 GitHub 可评论的新侧行号中、置信度是否足够。
- 可发布评论会进入 GitHub Review payload；缺少行号、低置信度或不属于本次 diff 的评论会被拦截并保留原因。
- 当前只生成 dry-run payload 和前端预览，不会自动写回 GitHub，避免 AI 在用户确认前发布评论。

### 配置和健康检查

- `GET /api/health/config` 会检查配置文件、AI 模型密钥、GitHub Token 和 Review Profile 状态，便于本地演示前排查运行环境。
- `GET /api/reviewers` 会返回可选 reviewer 的公开元数据，前端据此展示 reviewer 选择项，不暴露密钥环境变量。
- `lingqi.config.json` 管理模型、reviewer、Review Profile、上下文预算、GitHub API 参数等可提交配置。
- `lingqi.config.local.json` 和 `.env.local` 用于本地覆盖和密钥配置，不应提交到仓库。

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
- 提供 smoke 脚本，用 mock PR 或真实公开 PR 验证模型链路和结构化输出。

暂不做 GitHub App、PR 机器人、Webhook、OAuth、云部署和企业规则中心。这些能力可以作为后续扩展，但不进入当前最小可用版本。

## 设计取舍

LingQi 的核心不是把模型回答直接贴到 PR 里，而是围绕代码评审场景做一层约束：先拿到可信上下文，再让模型输出结构化结论，最后把高价值建议展示给 reviewer。

### 模型选择

当前默认使用 DeepSeek。这个选择主要考虑三点：第一，它响应速度比较快，适合本地演示和开发者临时分析 PR；第二，它支持 1M 级长上下文，更适合阅读长 diff、分组上下文和多文件变更；第三，它的中文表达相对稳定，不容易把 Review 写成过度夸张或营销式语气，生成的建议更接近正常 reviewer 会写出来的评论。

LingQi 没有把模型直接写死在业务流程里。配置中可以声明 provider、model 和密钥环境变量，AI 调用通过 provider 抽象进入分析编排。当前默认 reviewer 使用 DeepSeek 完成 PR 总览、风险初筛和建议草稿，保证速度和可用性；同时系统支持配置多个 reviewer，每个 reviewer 可以有自己的角色、触发方式、模型和关注点。

多 reviewer 设计是为了把“快”和“准”拆开处理。比如可以让 DeepSeek 负责快速阅读上下文和生成基础报告，再接入 GPT-5.5 或同级强推理模型作为专家 reviewer，只在高风险、低置信度或用户手动选择时参与审查。这样既不会让每次 PR 分析都变慢，也保留了在关键代码上使用更强模型进行严格 Review 的空间。

### 上下文获取方式

系统通过 GitHub REST API 获取 PR 元信息、文件变更、提交记录和 patch，再由上下文构建层整理成适合模型阅读的结构。这里的重点不是把所有内容粗暴塞给模型，而是让模型看到“足够判断、可追溯、带边界”的上下文。

当前上下文主要包含：

- **PR 元信息**：标题、描述、作者头像、base/head 分支、状态和 PR 链接，用来理解本次修改的目的和背景。
- **变更统计**：变更文件数、增加行、删除行和总变更量，用来判断 PR 规模和是否需要触发大 PR 限制。
- **文件级 diff**：每个文件的路径、状态、增删行数、patch 和风险提示，是风险识别与 Review 建议的主要证据。
- **提交记录**：提交 sha 和 message，帮助模型从开发者提交意图侧面理解变更。
- **用户补充要求**：如果请求传入 `userPrompt`，会进入分析上下文，作为本次 Review 的额外关注点，但不能覆盖安全规则、schema 约束和上下文限制。

为了让 AI 建议能落到 GitHub Review 的具体位置，LingQi 会解析 diff，生成 `numberedPatch`、`commentableLines` 和 `oldLines`。其中 `numberedPatch` 会显式标记 `RIGHT` 行号，提示模型只能把 inline comment 放到 GitHub 可评论的新侧行号上；如果问题只能定位到文件、删除行或上下文不足，系统会保留问题但不强行生成可发布 inline comment。

上下文还会经过 `reviewProfile` 做项目化分组。配置可以按路径和关键词把文件分到不同模块，并为每个分组设置优先级、审查提示、最大文件数和单文件 patch 字符预算。模型拿到的不是一段扁平 diff，而是带有模块名称、审查重点、匹配规则和预算信息的分组上下文。

对大 PR 或超长 patch，系统会记录哪些文件被省略、哪些 patch 被截断、为什么截断，以及当前分析有哪些 limitations。这些限制会进入最终报告，避免模型假装看过没有提供的代码，也方便 reviewer 判断哪些结论需要人工复核。

### 准确性与误报控制

AI 输出必须通过 Zod schema 校验，分组分析还会校验 groupId、文件引用和分组覆盖情况。Review 草稿生成阶段会再次检查文件是否属于本次 PR、行号是否可评论、置信度是否足够。对无法定位到具体行的风险，系统会保留提示但不强行生成 inline comment，避免把错误行号写进 GitHub Review。

设计上更偏向低噪音：优先输出 blocker、major、minor 级别的高价值建议，要求每条建议包含证据、影响和可执行修复方向。上下文不足时要求模型降低 confidence 或写入 limitations，而不是补全不存在的调用链。

### 响应速度与使用体验

MVP 采用本地 Next.js 应用，省去登录系统、Webhook 和部署流程，用户输入 PR URL 后即可分析。后端会把 GitHub 数据获取、上下文构建、AI 分析和 Review 草稿生成串成一个请求，前端用进度状态、统计面板、风险卡片和 diff 视图帮助 reviewer 快速定位重点。

为了兼顾速度和可读性，系统先做分组与上下文预算，减少模型无差别阅读所有文件的成本；报告中同时展示上下文限制，方便 reviewer 判断哪些结论需要人工复核。

### 未来扩展方向

当前版本优先保证本地可运行和核心 Review 闭环完整。后续扩展不会简单追求“自动评论更多”，而是围绕真实代码评审流程继续增强：更容易接入团队工作流、更准确地管理上下文、更细粒度地生成评论，并把最终控制权留给 reviewer。

**部署与运行形态**：当前是本地 Web 工具，后续可以扩展成团队可访问的服务版本，补充环境变量管理、访问控制、任务队列和结果缓存。这样大 PR 可以异步分析，重复打开同一个 PR 时也不需要每次重新拉取和推理，响应速度和演示稳定性都会更好。再往后也可以支持私有化部署，满足团队对代码、密钥和模型调用链路的隔离要求。

**GitHub 集成形态**：可以继续做成 GitHub App 或轻量 PR 机器人。GitHub App 适合自动监听 PR opened、synchronize、ready_for_review 等事件，并把高置信度建议写回 GitHub Review；轻量机器人则可以先支持评论命令，例如 `/lingqi review security` 或 `/lingqi review backend`，让开发者按需触发某个 reviewer。浏览器插件也是一个更轻的方向，它可以在 GitHub PR 页面旁边展示 LingQi 报告，不要求用户离开当前 Review 页面。

**上下文管理**：现在主要基于 PR diff、提交记录和 Review Profile 分组，未来可以补充仓库文件检索、相关调用链、测试文件、配置文件、历史相似 PR、CODEOWNERS 和项目规范。上下文选择也可以从固定预算升级为可交互模式：用户手动勾选关键文件、排除无关生成物、指定某个模块让专家 reviewer 深挖。对于大型仓库，还可以按目录、语言、owner、风险类型建立索引，让模型少读无关内容，多看真正影响判断的上下文。

**Review comment 生成**：当前系统已经能生成 Review 草稿和 dry-run payload，后续可以让用户在每条建议旁继续输入自己的要求，例如“语气更委婉”“补充线上影响”“给出更短的 GitHub comment”“只保留可执行修改建议”。系统再基于原始 AI 建议、用户要求和代码行上下文生成可编辑 comment，最后由用户选择单条提交、批量提交或合并成一次 GitHub Review。评论也可以按团队偏好提供不同模板，例如阻塞型 comment、建议型 comment、提问型 comment 和总结型 comment。

**质量门禁与团队规则**：除了单次 PR 分析，后续可以支持团队级规则，例如必须有测试变更、数据库迁移必须包含回滚说明、鉴权模块必须触发安全 reviewer、低置信度建议默认不允许自动写回。这样 LingQi 不只是“看代码”，也能帮助团队把 Review 规范沉淀成可执行的检查流程。

**企业协作与治理**：面向团队使用时，可以增加组织、项目和仓库维度的配置继承。企业可以统一维护安全基线、代码规范、敏感目录策略和模型白名单，不同项目再覆盖自己的 Review Profile。还可以对接 SSO、团队成员权限、审计日志、审批流和报表，让管理者看到不同仓库的风险分布、平均 Review 响应时间、AI 建议采纳率和高风险问题闭环情况。

**反馈闭环**：真实使用中，reviewer 会接受、修改或丢弃 AI 建议。后续可以记录这些反馈，统计哪些 reviewer、哪些规则、哪些模型更容易产生有效建议，用来优化提示词、上下文选择和触发策略。这个反馈不需要训练模型本身，也能逐步降低噪音和误报。

**权限、隐私与审计**：如果进入团队或私有仓库场景，需要更明确地处理权限边界。后续可以补充 GitHub 权限最小化、密钥托管、分析日志脱敏、敏感文件跳过、模型调用审计和数据保留策略。对于不能出网的企业代码，也可以设计本地模型或企业内网模型 provider，避免把核心代码上下文发送到不受控环境。

**用户自主性**：未来的理想状态不是 AI 自动替人按下 Review，而是 reviewer 可以选择模型、选择 reviewer 角色、选择上下文范围、选择评论粒度，并在写回 GitHub 前看到每条 comment 的证据、置信度、可发布状态和风险来源。这样 AI 更像一个可控的审查助手，而不是不可解释的自动评论器。

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

LingQi 当前按本地演示和个人 PC 运行优先设计，不依赖云服务、数据库、登录系统或 GitHub App 安装流程。评审或演示时只需要拉取仓库、安装依赖、配置密钥并启动 Next.js 服务。

安装依赖：

```bash
npm install
```

启动开发服务器：

```bash
npm run dev
```

打开 `http://localhost:3000`。

生产模式本地启动：

```bash
npm run build
npm run start
```

`npm run dev` 适合开发和演示调试；`npm run build && npm run start` 更接近评审时的生产构建效果。

## 本地部署检查

在正式演示前，建议按下面顺序检查：

```bash
npm run typecheck
npm test
npm run build
```

启动服务后，可以先访问配置健康检查接口：

```text
http://localhost:3000/api/health/config
```

它会检查配置文件、模型密钥、GitHub Token 和 Review Profile 状态。如果这里返回错误，先处理环境变量或配置文件，再进行真实 PR 分析。

也可以访问 reviewer 列表接口，确认前端可选择的 reviewer 是否符合当前配置：

```text
http://localhost:3000/api/reviewers
```

### 环境变量

本地部署至少需要配置模型密钥。创建 `.env.local`：

```bash
DEEPSEEK_API_KEY=sk-...
GITHUB_TOKEN=ghp_...
```

`DEEPSEEK_API_KEY` 用于真实 AI 分析。`GITHUB_TOKEN` 可选，但建议配置；私有仓库分析和更高 GitHub API 限流都依赖它。

不要把 `.env.local`、`lingqi.config.local.json` 或任何 token 提交到仓库。

### 端口与访问

默认端口是 `3000`。如果本机端口冲突，可以用 Next.js 的端口参数启动：

```bash
npm run dev -- -p 3001
```

或生产模式：

```bash
npm run start -- -p 3001
```

### 部署边界

当前版本没有引入数据库和后台任务队列，分析请求在一次 API 调用中完成。这样部署简单，但也意味着非常大的 PR 可能受请求耗时、模型响应时间和本机网络影响。项目通过上下文预算、patch 截断和 limitations 说明来控制这类风险。

如果后续部署到团队服务器或云平台，需要重点补充三类能力：

- **密钥管理**：使用平台环境变量或密钥管理服务，不把模型 key 和 GitHub token 写入仓库。
- **访问控制**：限制谁可以访问分析页面和调用 API，避免内部 PR 链接被未授权用户分析。
- **异步任务**：把大 PR 分析放入队列，前端轮询结果或使用通知，避免长请求超时。

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
