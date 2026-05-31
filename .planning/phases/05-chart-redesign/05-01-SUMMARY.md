---
phase: 05-chart-redesign
plan: "01"
subsystem: StatsPanel charts
tags: [recharts, RadialBarChart, RadarChart, chart-redesign, StatsPanel]
requires: []
provides: [recharts-charts, severity-radial-bar, category-radar-chart]
affects: [StatsPanel.tsx, stats-panel.test.tsx]
tech-stack:
  added: [recharts@3.8.1]
  patterns: [Recharts RadialBarChart nightingale rose, Recharts RadarChart, custom dot click handling, zero-risk branch pattern]
key-files:
  created: []
  modified:
    - package.json (added recharts dependency)
    - components/StatsPanel.tsx (Recharts RadialBarChart + RadarChart replacement)
    - tests/stats-panel.test.tsx (updated for Recharts rendering)
decisions:
  - "使用 custom dot renderer 函数处理 RadarChart 顶点点击，而非 activeDot onClick 对象（兼容性更好）"
  - "测试中使用 .recharts-responsive-container 而非 .recharts-surface 验证图表容器（jsdom 0x0 尺寸不渲染 SVG）"
  - "Tooltip formatter 使用 Number(value) 安全转换以兼容 Recharts 的 ValueType 类型"
metrics:
  duration: ""
  completed_date: "2026-05-31"
  tasks: 3
  commits: 4
---

# Phase 05 Plan 01: Chart Redesign Summary

**One-liner:** Replaced hand-rolled SVG donut and horizontal progress bars in StatsPanel with Recharts RadialBarChart (nightingale rose) and RadarChart (spider chart) for enhanced visual impact.

## Tasks Completed

| # | Name | Type | Commit | Status |
|---|------|------|--------|--------|
| 1 | Install recharts + replace severity SVG donut with RadialBarChart | auto | 021aa19 | Complete |
| 2 | Replace category horizontal bars with RadarChart | auto | 00b4f56 | Complete |
| 3 | Update stats-panel tests for Recharts rendering | auto (tdd) | 7fba89b (RED), 1d4de89 (GREEN) | Complete |

## What Was Built

### Task 1: RadialBarChart for Severity Distribution
- Added `recharts` dependency (v3.8.1) via `pnpm add recharts`
- Replaced the hand-rolled SVG `<circle>` donut chart with Recharts `<RadialBarChart>`
- 4 colored fan-shaped segments: blocker (#dc2626), major (#ea580c), minor (#2563eb), nit (#6b7280)
- Chart parameters: `innerRadius="30%"`, `outerRadius="90%"`, `barSize={14}`, `startAngle={90}`, `endAngle={-270}`
- Center overlays show risk count + "风险项" label via absolute-positioned div
- Click on radial segment triggers `onFilterChange("severity", key)`, double-click clears filter
- Active filter dims non-matching segments (opacity 0.35)
- Recharts `<Tooltip>` displays `{label}: {count} 项 ({percent}%)`
- Removed hand-rolled donut calculation logic (`radius`, `circumference`, `donutSegments`)
- Removed legend sidebar (info now available via Tooltip)
- Grade badge column completely preserved

### Task 2: RadarChart for Category Distribution
- Extended Recharts imports with `RadarChart`, `Radar`, `PolarGrid`, `PolarAngleAxis`, `PolarRadiusAxis`
- Built `radarData` from existing `categoryDefs` and `catCounts`
- Replaced horizontal progress bars with `<RadarChart>` displaying 4-axis radar chart
- Axes: 安全漏洞 / 性能瓶颈 / 编码逻辑 / 代码规范
- `PolarGrid` with `#30363d` stroke for dark theme grid lines
- Custom `PolarAngleAxis` tick: highlights active filter axis in blue (#58a6ff), clickable for filter toggle
- `PolarRadiusAxis` hidden (`tick={false} axisLine={false}`)
- `Radar` polygon: semi-transparent fill (#58a6ff, fillOpacity=0.15), stroke width 2
- Custom dot renderer with click handling for vertex-based category filtering
- `activeDot` with enlarged radius (r=6) for hover feedback
- `<Tooltip>` shows `{count} 项`

### Task 3: Updated Test Suite
- 6 tests covering: grade badge, severity section header + center overlay, zero-risk state, category section header, dual zero-risk empty states, Recharts container elements
- Removed test for English severity labels (Blocker/Major/Minor/Nit) -- now Recharts Tooltip content
- Added "零风险时两个图表区均显示空态" test verifying both chart areas show empty state when riskCount=0
- Added "渲染 Recharts 图表容器" test verifying `.recharts-responsive-container` elements exist

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Tooltip formatter TypeScript type error**
- **Found during:** Task 1 build verification
- **Issue:** `(value: number)` parameter type incompatible with Recharts `ValueType | undefined`
- **Fix:** Removed explicit type annotation, used `Number(value)` for safe numeric conversion
- **Files modified:** components/StatsPanel.tsx

**2. [Rule 2 - Missing Critical Functionality] Added zero-risk empty state to RadarChart category section**
- **Found during:** Task 3 test execution (TDD GREEN phase)
- **Issue:** When riskCount=0, only the severity section showed the green empty state. The category section rendered the RadarChart with zero data instead. Plan explicitly requires "both chart areas display the existing green empty state"
- **Fix:** Wrapped RadarChart in `{!hasRisks ? ... : ...}` conditional matching the severity section pattern, displaying CheckCircle + "零高危隐患，代码状态极为优秀！"
- **Files modified:** components/StatsPanel.tsx

**3. [Rule 1 - Bug] Fixed "零风险时显示优秀状态" test: `getByText` now finds multiple elements**
- **Found during:** Task 3 test execution
- **Issue:** After adding zero-risk branch to category section, `screen.getByText("零高危隐患...")` finds 2 instances (one per chart area), causing `getByText` to throw
- **Fix:** Changed to `screen.getAllByText(...).length).toBeGreaterThanOrEqual(1)` 
- **Files modified:** tests/stats-panel.test.tsx

## Pre-existing Issues (Out of Scope)

- **Build error:** `scripts/smoke-ai.ts:1:31` -- `Cannot find module '@next/env'`. Pre-existing on base commit (91000e3), unrelated to StatsPanel or recharts changes.

## Verification

| Check | Result |
|-------|--------|
| `grep -c '"recharts"' package.json` >= 1 | 1 |
| `grep -c 'RadialBarChart' StatsPanel.tsx` >= 1 | 4 |
| `grep -c 'RadarChart' StatsPanel.tsx` >= 1 | 4 |
| `grep -c '风险项' StatsPanel.tsx` >= 1 | 1 |
| `grep -c 'PR 综合质量评级' StatsPanel.tsx` >= 1 | 1 |
| Donut calc removed (radius=35) | 0 |
| Donut calc removed (circumference) | 0 |
| Category bars removed (h-1.5 bg-[#21262d]) | 0 |
| No English severity labels in test | 0 |
| `npx next build` StatsPanel compiles | Yes |
| `npx vitest run tests/stats-panel.test.tsx` | 6/6 passed |
