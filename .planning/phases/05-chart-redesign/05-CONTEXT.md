---
phase: 05
name: chart-redesign
status: Ready for planning
source: PRD Express Path (.planning/specs/2026-05-31-chart-redesign.md)
---

# Phase 05: Chart Redesign — Context

**Gathered:** 2026-05-31
**Source:** PRD Express Path

<domain>
## Phase Boundary

替换 StatsPanel 中两个图表组件：风险严重度统计和风险类别分布。

- **风险严重度统计** — 手写 SVG 环形图 → Recharts `RadialBarChart`（南丁格尔玫瑰图）
- **风险类别分布** — 横向进度条 → Recharts `RadarChart`（雷达图）
- 评级徽章列完全不动
- 筛选联动逻辑与现有 `handleFilterChange` 完全兼容
- 3 列响应式网格布局保持不变

**不在此范围：**
- 不改 `StatsData` / `FilterState` 类型定义
- 不改 `handleFilterChange` 接口
- 不涉及其他组件

</domain>

<decisions>
## Implementation Decisions

### 依赖
- 新增 `recharts` 依赖（pnpm add recharts）

### 严重度统计 — RadialBarChart
- 扇区半径代表严重度权重：阻断级延伸到最外层，建议级最短
- `innerRadius="30%"` 留出中心空间放风险总数
- `startAngle={90}` 从顶部开始，顺时针 360°
- 4 个扇区颜色保持现有：`#dc2626` / `#ea580c` / `#2563eb` / `#6b7280`
- 中心绝对定位 `<div>` 显示风险总数 + "风险项"
- 点击扇区调用 `onFilterChange?.("severity", seg.key)`
- `activeFilter` 匹配时高亮
- Recharts `<Tooltip>` 显示 `{label}: {count} 项 ({percent}%)`
- 使用 `<ResponsiveContainer>` 响应式宽度

### 类别分布 — RadarChart
- 4 轴：安全漏洞 / 性能瓶颈 / 编码逻辑 / 代码规范
- Polygon 填充半透明 `#58a6ff`，`fillOpacity={0.15}`
- Polygon 描边 `#58a6ff`，`strokeWidth={2}`
- 顶点 dot `r={4}`，可点击
- `<PolarGrid stroke="#30363d" />` 网格线
- `<PolarAngleAxis tick={{ fill: "#8b949e", fontSize: 12 }} />` 轴标签
- 隐藏径向刻度（`PolarRadiusAxis tick={false}`）
- 点击顶点/轴标签调用 `onFilterChange?.("category", cat.key)`
- `activeFilter` 匹配时高亮轴标签
- 固定高度 280px

### 筛选联动
- 与现有 `activeFilter` / `onFilterChange` 接口完全兼容
- 点击已高亮项 → 调用 `onFilterChange?.("clear", null)` 取消筛选

### 零风险状态
- `riskCount === 0` 时两个图表区显示绿色空态（保持现有逻辑）

### Claude's Discretion
- Recharts 动画参数（duration/easing）
- RadialBar 的 `barSize` 微调
- RadarChart 的 padding/margin 值
</decisions>

<canonical_refs>
## Canonical References

- `components/StatsPanel.tsx` — 现有实现，包含全部类型定义、颜色常量、筛选逻辑

</canonical_refs>

<specifics>
## Specific Ideas

从 spec 提取的具体要求：

### RadialBarChart 参数
| 参数 | 值 |
|------|-----|
| innerRadius | "30%" |
| outerRadius | "90%" |
| barSize | 14 |
| startAngle | 90 |
| endAngle | -270 |

### RadarChart 参数
| 参数 | 值 |
|------|-----|
| height | 280 |
| dataKey | "count" |
| cx | "50%" |
| cy | "45%" |

### 验证清单
- [ ] `pnpm add recharts` 成功
- [ ] `npx next build` 编译通过
- [ ] `npx vitest run` 无新增失败
- [ ] 玫瑰图和雷达图正确渲染
- [ ] 点击扇区/顶点 → 筛选联动
- [ ] 二次点击 → 清除筛选
- [ ] 零风险 → 空态正常
- [ ] 375px / 768px / 1440px 响应式正常
</specifics>

<deferred>
## Deferred Ideas

None — spec covers complete phase scope.
</deferred>

---

*Phase: 05-chart-redesign*
*Context gathered: 2026-05-31 via PRD Express Path*
