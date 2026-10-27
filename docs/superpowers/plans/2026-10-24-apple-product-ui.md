# Apple Product UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the salary calculator homepage into a restrained Apple product page style with a light gray canvas, white work surfaces, dark neutral typography, and blue actions while preserving all calculator behavior.

**Architecture:** Keep the existing Next.js page structure, React components, CSS Modules, and static export. Use global CSS tokens for page chrome and editorial sections, then replace calculator module colors and responsive rules in one focused stylesheet; only adjust page class structure if the current markup cannot express the new hierarchy.

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS Modules, static export, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-24-apple-product-ui-design.md`

## Global Constraints

- Do not modify salary formulas, policy configuration, field names, validation logic, routes, SEO copy, policy content, or ad integration.
- Use existing React components and CSS Modules; do not add a UI dependency.
- Preserve semantic labels, focus styles, error messages, table scrolling, and accessibility attributes.
- Keep 360px layouts free of horizontal overflow and keep the salary input, calculation range, and action visible.
- Record the existing Next.js security check failure separately if static build still exits non-zero after producing output.

## Review Focus

- Mobile hero must retain a short scope prompt and expose the calculator entry point without horizontal overflow; verify with generated CSS and a 360px browser viewport if available.
- Focus-visible states must remain obvious on controls, radio cards, switches, headings, and tables; run the existing component tests and inspect the selectors.
- Error, readonly, and selected states must retain their semantic contrast after the palette change; run existing form/error tests.
- Result summary and monthly table must keep their existing responsive grids and horizontal table scroll; run tests and inspect the module media queries.
- Static pages must still render after CSS-only changes; run lint, typecheck, tests, and the static build command.

---

### Task 1: Establish the plan workspace and visual token contract

**Files:**
- Create: `docs/superpowers/plans/2026-10-24-apple-product-ui.md`
- Create: `.superpowers/sdd/2026-10-24-apple-product-ui/progress.md`

**Interfaces:**
- Consumes: approved design spec at `docs/superpowers/specs/2026-10-24-apple-product-ui-design.md`.
- Produces: a tracked execution plan and ledger that later tasks use to record decisions and verification.

- [ ] **Step 1: Create the SDD workspace and ledger**  
Run the `sdd-workspace` helper for this plan, then create `progress.md` with the plan path as its first line and a pre-flight note that the global CSS task and calculator CSS task share the token contract but have no runtime API interface.

- [ ] **Step 2: Record the implementation baseline**  
Run `git status --short --branch` and record the branch plus the pre-existing modified/untracked files in the ledger so the UI work does not overwrite unrelated artifacts.

- [ ] **Step 3: Mark Task 1 complete**  
Record that the approved spec is reachable and the plan/ledger are ready for implementation.

---

### Task 2: Redesign global product-page surfaces

**Files:**
- Modify: `src/app/globals.css`
- Test: existing `npm run lint`, `npm run typecheck`, `npm run test` suite

**Interfaces:**
- Consumes: global class names already emitted by `src/app/page.tsx` and shared layout pages.
- Produces: neutral Apple-inspired tokens and responsive page chrome used by the calculator and editorial sections.

- [ ] **Step 1: Run the existing verification baseline**  
Run `npm run lint`, `npm run typecheck`, and `npm run test`; capture the result before changing CSS.

- [ ] **Step 2: Implement the global visual contract**  
Replace green and warm brand tokens with `#f5f5f7` canvas, white panels, near-black text, neutral gray secondary text, low-contrast gray borders, and restrained blue links/actions. Update header, hero, note, section, editorial, footer, and primary-link surfaces with larger product-page spacing, lighter borders, and soft shadows while preserving class names and semantic structure.

- [ ] **Step 3: Implement responsive rules**  
Keep the hero hierarchy compact at 550px and retain a concise `.hero-note` scope card; remove only nonessential point chips on narrow screens. Preserve the existing container widths and ensure the calculator section remains reachable without horizontal overflow.

- [ ] **Step 4: Verify global changes**  
Run `npm run lint`, `npm run typecheck`, and `npm run test`; expected result is the same passing baseline with no TypeScript or test regression.

- [ ] **Step 5: Record Task 2 completion**  
Append the commands and observed results to the ledger.

---

### Task 3: Restyle calculator and result work surfaces

**Files:**
- Modify: `src/components/SalaryCalculator.module.css`
- Test: existing SalaryCalculator tests under `src/**/*.test.*`

**Interfaces:**
- Consumes: existing calculator markup and state classes from `SalaryCalculator.tsx` and `SalaryResults.tsx`.
- Produces: neutral input panels, blue primary action, explicit focus/error/selected states, and responsive result cards/table surfaces without changing component logic.

- [ ] **Step 1: Add a CSS contract check before implementation**  
Create a focused test or deterministic stylesheet check that fails while the current calculator module still contains the green primary action color and passes once the module uses the approved blue action token and neutral selected/result surfaces. If the repository has no CSS test harness, use a PowerShell assertion script under the plan workspace and run it before editing to observe the expected failure.

- [ ] **Step 2: Replace calculator palette and surfaces**  
Update panel/result borders, text, field controls, radio cards, readonly fields, detail blocks, result badges, summary cards, month summaries, table headers, notes, export button, and submit button to use the approved neutral/blue palette. Keep all existing class names, dimensions, transitions, focus-visible outlines, error colors, and semantic state selectors.

- [ ] **Step 3: Preserve mobile calculator behavior**  
Keep the existing 760px and 520px layout breakpoints, including stacked fields, two-column summary cards, full-width submit button, month header stacking, and horizontally scrollable tables.

- [ ] **Step 4: Run the contract check and full verification**  
Run the focused stylesheet check, then `npm run lint`, `npm run typecheck`, and `npm run test`; expected result is the contract check and all project checks passing.

- [ ] **Step 5: Record Task 3 completion**  
Append the commands and observed results to the ledger.

---

### Task 4: Build and refresh the local preview

**Files:**
- Modify: generated `out/` files only if produced by the repository build; do not hand-edit generated output.
- Test: static preview at `http://127.0.0.1:3000/`

**Interfaces:**
- Consumes: completed global and calculator CSS changes.
- Produces: refreshed static homepage and calculator preview for visual inspection.

- [ ] **Step 1: Run the static build**  
Run `npm run build`. Confirm whether pages are generated and record any Next.js 16.4.0 security check failure exactly as observed.

- [ ] **Step 2: Verify preview responses**  
Request `http://127.0.0.1:3000/`, `/calculator/`, `/methodology/`, and `/policy-sources/` with `Invoke-WebRequest`; expect HTTP 200 and the refreshed output to contain the new neutral/blue stylesheet references.

- [ ] **Step 3: Refresh the Codex preview tab**  
Open `http://127.0.0.1:3000/` in the Codex panel so the user can inspect the redesigned homepage.

- [ ] **Step 4: Record Task 4 completion**  
Append build and HTTP verification results to the ledger.

---

### Task 5: Final verification and review

**Files:**
- Review: `src/app/globals.css`, `src/components/SalaryCalculator.module.css`, `docs/superpowers/specs/2026-10-24-apple-product-ui-design.md`

- [ ] **Step 1: Inspect the final diff**  
Run `git diff --check` and `git diff --stat`; confirm only intended visual files plus the plan/ledger changed.

- [ ] **Step 2: Run the complete verification set**  
Run `npm run lint`, `npm run typecheck`, `npm run test`, and `git diff --check`; record output in the ledger. Build status remains documented from Task 4.

- [ ] **Step 3: Complete the ledger**  
Record acceptance against the spec, including the static preview URL and any build caveat.

---

