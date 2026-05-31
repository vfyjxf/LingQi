# Phase 04: Color A11y Polish - Context (Audit Page Redesign)

**Gathered:** 2026-05-31
**Status:** Ready for planning
**Source:** PRD Express Path (docs/superpowers/specs/2026-05-31-audit-page-redesign-design.md)

<domain>
## Phase Boundary

Redesign the "核心隐患审计" (Core Risk Audit) page layout:
- Replace current 3-column layout (FileTree | Diff | RiskCards) with 2-column 50/50 layout
- Left: File tree (compact, top) + Diff viewer (below)
- Right: Risk cards (primary content, full height scrollable)
- Add thin scrollbar styles globally
- Add "全部文件" (All Files) default entry in FileTree for viewing all risks
- File click filters risks to that file + shows diff; click × or "全部文件" clears filter
- Risk cards remain primary visual focus

</domain>

<decisions>
## Implementation Decisions

### Layout
- Left/right 50/50 split using `flex-1` on each column
- Left column: FileTree (compact list, top) + DiffViewer (fills remaining space, bottom)
- Right column: Risk header (title + filter badge) + RiskCard list (scrollable)
- Both columns sticky-positioned with `max-height: calc(100vh - 6rem)`
- Both scroll independently (overflow-y-auto with thin scrollbar)

### Thin Scrollbar
- Add to `app/globals.css`
- Firefox: `scrollbar-width: thin; scrollbar-color: #30363d transparent;`
- Webkit: `::-webkit-scrollbar { width: 6px; }` with `#30363d` thumb, transparent track

### FileTree Changes
- Add "全部文件" entry at top of list, always present, selected by default
- Default state: "全部文件" selected → all risks shown, diff area shows placeholder
- Click file: file entry highlighted → diff loaded for that file, risks filtered to that file
- Click "全部文件" or × on filter badge → clear filter, show all risks again
- File entries show: filename, change count (+N/-N), risk count badge
- Preserve existing search functionality

### Risk Cards
- Keep existing RiskCard component unchanged
- Expand/collapse suggestions preserved
- Severity color coding preserved
- Highlight mechanism preserved (highlighted prop)

### Interactions
- File selection drives: diff content + risk filtering (both update together)
- Filter badge appears in right column header showing current file filter
- × button on filter badge clears filter, restores "全部文件" state
- No new API calls — all filtering is client-side via existing `filteredRisks` / `selectedFile`

### No Changes To
- Color scheme (GitHub Dark — already matches reference project)
- Tab switching (效能与统计 / 核心隐患审计)
- ReviewSummary component
- StatsPanel component
- Data fetching and state management
- Existing severity/category filter from StatsPanel

### Claude's Discretion
- Exact padding/margin values for the compact file tree
- Whether to add a transition animation on file selection
- Whether diff placeholder shows an icon or just text

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Specs
- `docs/superpowers/specs/2026-05-31-audit-page-redesign-design.md` — Complete redesign spec with layout diagrams, interaction table, and file list

### Existing Components
- `app/page.tsx` — Main page component (lines 447-494: current 3-column layout to be replaced)
- `app/globals.css` — Global styles (add scrollbar styles here)
- `components/FileTree.tsx` — File tree component (add "全部文件" entry)
- `components/RiskCard.tsx` — Risk card (no changes needed)
- `components/DiffViewer.tsx` — Diff viewer (no changes needed)

</canonical_refs>

<specifics>
## Specific Ideas

- Visual mockups reviewed and approved in browser companion (layout-c-final.html)
- Layout: 50/50 split, left = code context, right = risk findings
- Default state: "全部文件" active, all risks visible
- Filter state: specific file selected, risks filtered, diff shown
- Clear filter: × button or re-click "全部文件"
</specifics>

<deferred>
## Deferred Ideas

None — PRD covers full phase scope for this redesign.

</deferred>

---

*Phase: 04-color-a11y-polish*
*Context gathered: 2026-05-31 via PRD Express Path*
