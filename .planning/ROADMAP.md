# Roadmap: LingQi

## Phase 1: Foundation
**Goal:** 项目初始化 — Next.js + TypeScript + Tailwind 基础架构
**Status:** Complete

## Phase 2: Core Pipeline
**Goal:** PR 分析核心流水线 — GitHub API 集成 + DeepSeek AI 分析
**Status:** Complete

## Phase 3: Differentiators
**Goal:** 差异化功能 — 评分徽章、图表、风险展示
**Status:** Complete

## Phase 4: Color & A11y Polish
**Goal:** 无障碍与配色打磨
**Status:** Complete

## Phase 5: Chart Redesign
**Goal:** 图表重设计
**Status:** Complete

## Phase 6: Dimension Scoring
**Goal:** AI 按安全/数据/稳定性/性能/API/测试/可维护性 7 个维度独立打分（0-100）+ 严重程度，前端维度雷达图展示
**Requirements:** DIM-01
**Plans:** 3/3 plans complete
**Status:** Planned

Plans:
- [x] 06-01-PLAN.md — Backend Schema + Config: Define DimensionScoreSchema, extend AiReviewReportSchema, increase maxOutputTokens to 8000, create shared test fixture helper
- [x] 06-02-PLAN.md — Backend Prompt + Test Migration: Add rubric-anchored scoring section to buildReviewPrompt(), migrate 6 test files to shared fixtures
- [x] 06-03-PLAN.md — Frontend StatsPanel Rewire: Replace calcQualityScore() with AI-derived scoring, switch radar chart to quality scores, update component tests
