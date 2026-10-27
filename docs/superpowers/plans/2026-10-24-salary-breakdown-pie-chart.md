# Annual Salary Breakdown Pie Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an accessible SVG doughnut chart to the result summary that explains annual gross salary as contributions, tax, and take-home pay.

**Architecture:** Keep salary calculation and existing result markup intact. Add a focused `SalaryBreakdownChart` component that aggregates the existing monthly contribution fields, renders SVG ring segments, and exposes a text legend; add its styles to the existing calculator CSS module.

**Tech Stack:** React 19, TypeScript, SVG, CSS Modules, Vitest and Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-24-salary-breakdown-pie-chart.md`

## Global Constraints

- Do not change calculation formulas, validation, policy data, input defaults, routes, or table behavior.
- Do not add a chart dependency.
- Keep the current Apple-inspired palette and responsive layout.
- Preserve the explicit tax-only warning and show zero contributions in that mode.
- Keep accessible text values available even if SVG rendering is unsupported.

## Review Focus

- Detailed Shanghai results must sum all four monthly contribution types into the chart.
- Tax-only mode must show zero contribution values and retain its warning.
- Zero gross totals must render 0.0% without NaN or invalid SVG attributes.
- Mobile chart layout must stack without horizontal overflow.
- Existing result heading focus and monthly table must remain unchanged.

---

### Task 1: Add data aggregation and rendering tests

**Files:**
- Create: `tests/integration/SalaryBreakdownChart.test.tsx`
- Modify: `src/components/SalaryResults.tsx` only after tests are red
- Test: `tests/integration/SalaryBreakdownChart.test.tsx`

**Interfaces:**
- Consumes: `SalaryResult`, `mode`, and `regionName`.
- Produces: accessible chart text with annual category values and percentages.

- [ ] **Step 1: Write failing tests**  
Render `SalaryResults` with a detailed result fixture and assert that the chart region exposes the labels “养老”, “医疗”, “失业”, “公积金”, “预扣个税”, and “估算实发”, including their formatted amounts; render a tax-only fixture and assert the five-insurance labels show 0.00; render a zero-total fixture and assert no legend text contains “NaN”.

- [ ] **Step 2: Run the focused tests**  
Run `npx vitest run tests/integration/SalaryBreakdownChart.test.tsx --reporter=verbose`. Expected: FAIL because the chart region and labels do not exist.

- [ ] **Step 3: Record the red result**  
Append the failing test command and reason to the plan ledger.

---

### Task 2: Implement the accessible SVG chart

**Files:**
- Create: `src/components/SalaryBreakdownChart.tsx`
- Modify: `src/components/SalaryResults.tsx`
- Test: `tests/integration/SalaryBreakdownChart.test.tsx`

**Interfaces:**
- `SalaryBreakdownChart({ result, mode }: { result: SalaryResult; mode: SalaryInput["mode"] })) renders a `figure` with `aria-label="全年收入构成"`.
- The component aggregates `result.months[*].contributionsByType` with Decimal-safe numeric parsing for display; it does not mutate `SalaryResult`.

- [ ] **Step 1: Implement aggregation and safe percentages**  
Create a local category list for pension, medical, unemployment, housing, tax, and take-home. Sum contribution strings across months, use gross total as the denominator, clamp invalid negative display values to zero, and use 0 when gross total is zero.

- [ ] **Step 2: Implement SVG ring and legend**  
Render a base ring plus one SVG circle per non-zero category using `pathLength="100"`, `strokeDasharray`, and cumulative offsets. Render a text legend for every category with formatted yuan and one-decimal percentages. Give the SVG an aria label and keep the legend as regular text.

- [ ] **Step 3: Insert the chart into SalaryResults**  
Place `<SalaryBreakdownChart result={result} mode={mode} />` after the annual equation and before the month summary. Keep existing result focus behavior and headings unchanged.

- [ ] **Step 4: Run focused tests**  
Run the focused Vitest command. Expected: all chart tests pass, including zero-total and tax-only cases.

- [ ] **Step 5: Run the full test suite**  
Run `npm run test`. Expected: all existing tests plus new chart tests pass.

---

### Task 3: Style and verify the chart

**Files:**
- Modify: `src/components/SalaryCalculator.module.css`
- Modify: `docs/superpowers/specs/2026-10-24-salary-breakdown-pie-chart.md`

- [ ] **Step 1: Add responsive Apple-style chart layout**  
Add chart shell, SVG ring, center label, legend rows, swatches, and zero-state styles using the existing blue/neutral palette plus distinct accessible colors. At 760px stack the chart and legend; at 520px reduce spacing while retaining readable values.

- [ ] **Step 2: Run project verification**  
Run `npm run lint`, `npm run typecheck`, `npm run test`, and `git diff --check`. Expected: all commands exit 0.

- [ ] **Step 3: Refresh static preview**  
Run `npm run build`, then verify `http://127.0.0.1:3000/` and `/salary-calculator/` return 200. Record the known Next.js security gate if build exits 1 after static generation.

- [ ] **Step 4: Record completion**  
Update the plan ledger with test output, route status, and any build caveat.

