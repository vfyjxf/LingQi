# StatsPanel 图表重新设计 — 玫瑰图 + 雷达图

**日期:** 2026-05-31
**范围:** `components/StatsPanel.tsx`
**依赖:** 新增 `recharts` 依赖

## 目标

将 StatsPanel 中的严重度环形图（手写 SVG）和类别横向进度条替换为 Recharts 图表，提升竞赛 demo 的视觉冲击力和交互体验。

## 不做什么

- 评级徽章列完全不动
- 不改 `StatsData` / `FilterState` 类型
- 不改 `handleFilterChange` 接口
- 不改 3 列响应式布局

## 实现方案

### 依赖

```bash
pnpm add recharts
```

### 严重度统计 — RadialBarChart（南丁格尔玫瑰图）

**选型理由：** 扇区半径代表严重度权重，比环形图多一个信息维度。阻断级延伸到最外层，视觉上更突出高危项。

**数据结构：**

```ts
const severityRadialData = severitySegments.map(seg => ({
  name: seg.label,        // "阻断" | "严重" | "轻微" | "建议"
  value: sevCounts[seg.key],  // 各等级风险数
  fill: seg.color,        // 保持现有颜色: #dc2626 / #ea580c / #2563eb / #6b7280
}));
```

**图表参数：**

| 参数 | 值 | 说明 |
|------|-----|------|
| `innerRadius` | `"30%"` | 中心留空放数字 |
| `outerRadius` | `"90%"` | 扇区外边界 |
| `barSize` | `14` | 扇区粗细 |
| `startAngle` | `90` | 从顶部开始 |
| `endAngle` | `-270` | 顺时针 360° |
| `cx` / `cy` | `"50%"` | 居中 |

**中心内容：** 绝对定位的 `<div>`，显示风险总数 + "风险项" 标签，与当前 donut 中心样式一致。

**动画：** 使用 Recharts 默认的 `animationBegin` / `animationDuration` (800ms) 逐扇区展开。

**交互：** `onClick` 调用 `onFilterChange?.("severity", seg.key)`，`activeFilter` 匹配时扇区 opacity 提升、描边加亮。

**Tooltip：** Recharts `<Tooltip>` 组件，显示 `{label}: {count} 项 ({percent}%)`。

### 类别分布 — RadarChart（雷达图）

**选型理由：** 4 轴围成的多边形直观展示"风险轮廓"。多边形的形状一眼就能判断哪个类别最突出——例如安全漏洞方向明显外凸时，审查者立即知道这是安全为重点的 PR。

**数据结构：**

```ts
const radarData = categoryDefs.map(cat => ({
  category: cat.label,      // "安全漏洞" | "性能瓶颈" | "编码逻辑" | "代码规范"
  count: catCounts[cat.key] ?? 0,
  fullMark: maxCat,         // 所有类别中的最大值，统一刻度
}));
```

**图表参数：**

| 参数 | 值 | 说明 |
|------|-----|------|
| `width` | 响应式（`<ResponsiveContainer>`） | 跟随卡片宽度 |
| `height` | `280` | 固定高度 |
| `cx` / `cy` | `"50%"` / `"45%"` | 略偏上，为底部标签留空间 |
| `dataKey` | `"count"` | 数值字段 |

**样式：**

- Polygon `stroke="#58a6ff"` (GitHub 蓝)，`strokeWidth={2}`
- Polygon `fill="#58a6ff"`，`fillOpacity={0.15}`
- Dot `r={4}`，`fill="#58a6ff"`，`stroke="#0d1117"`
- `<PolarGrid stroke="#30363d" />`
- `<PolarAngleAxis tick={{ fill: "#8b949e", fontSize: 12 }} />`
- `<PolarRadiusAxis tick={false} axisLine={false} />` — 隐藏径向刻度

**交互：** 点击 `<Dot>` 或轴标签调用 `onFilterChange?.("category", cat.key)`。`activeFilter` 匹配时对应轴标签高亮为 `#58a6ff`。

**Tooltip：** Recharts `<Tooltip>` 组件，显示 `{category}: {count} 项`。

### 筛选联动状态

与现有逻辑完全兼容：

```
activeFilter.type === "severity" && activeFilter.value === "blocker"
  → 玫瑰图 "阻断" segment 高亮 + 风险列表只显示 blocker 风险

activeFilter.type === "category" && activeFilter.value === "security"
  → 雷达图 "安全漏洞" vertex 高亮 + 风险列表只显示 security 类别
```

点击已高亮的项调用 `onFilterChange?.("clear", null)` 取消筛选。

### 零风险状态

当 `stats.riskCount === 0` 时，两个图表区显示与当前一致的绿色空态：“零高危隐患，代码状态极为优秀！”

## 文件改动

| 文件 | 操作 | 说明 |
|------|------|------|
| `components/StatsPanel.tsx` | 修改 | 替换 SVG donut + 横向 bar → RadialBarChart + RadarChart |
| `package.json` | 修改 | 新增 `recharts` 依赖 |

## 验证

- [ ] `pnpm add recharts` 成功安装
- [ ] `npx next build` 编译通过
- [ ] `npx vitest run` 无新增失败
- [ ] 浏览器中 hero 页点击 demo PR → done 状态，玫瑰图和雷达图正确渲染
- [ ] 点击玫瑰图扇区/雷达图顶点 → RiskCard 列表筛选联动
- [ ] 再次点击已选中项 → 清除筛选
- [ ] 零风险数据 → 显示空态而非报错
- [ ] 3 列网格在 375px / 768px / 1440px 断点下布局正确
