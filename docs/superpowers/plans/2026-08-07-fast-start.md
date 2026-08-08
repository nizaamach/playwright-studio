# Fast Start Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce project-to-export time by adding URL validation, hostname naming, templates, locator recommendations, recording summaries, and guarded keyboard shortcuts.

**Architecture:** Keep the existing Step model, generator, and recorder IPC stable. Add pure utilities for templates, URL/name handling, and locator quality; wire them into the React builder with small UI surfaces and keyboard guards.

**Tech Stack:** React, TypeScript, Electron IPC, native CSS, Node test runner, Vite.

## Global Constraints

- Project creation flow remains unchanged.
- A new project opens an empty selected `New Test` with `Record` visible.
- Recording URL is mandatory and has no default value.
- Recording steps append immediately after Stop; summary is informational only.
- Locator recommendations are applied only after explicit user action.
- Templates return ordinary `Step[]` values and use the existing generator/save path.
- Shortcuts are ignored inside input, textarea, select, or contenteditable elements.
- Existing generator, project management, and recorder tests must continue to pass.
- Do not add Test Runner, API testing, cloud execution, or advanced recorder events.

---

### Task 1: Add pure Fast Start utilities

**Files:**
- Create: `src/templates.ts`
- Create: `src/fast-start.ts`
- Create: `src/locator-quality.ts`
- Test: `tests/fast-start.test.mjs`

**Interfaces:**
- `templates.ts` exports `templateDefinitions` and `createTemplateSteps(templateId: TemplateId): Step[]`.
- `fast-start.ts` exports `validateRecordUrl(value: string): string`, `suggestTestName(value: string): string`, and `isEditableTarget(target: EventTarget | null): boolean`.
- `locator-quality.ts` exports `getLocatorQuality(step: Step): { level: 'stable' | 'acceptable' | 'fragile'; label: string; recommendation?: { locatorType: LocatorType; selector: string } }`.

- [x] **Step 1: Write failing utility tests** for four templates, empty/invalid/valid URLs, hostname naming, editable target detection, and semantic-over-CSS locator quality.
- [x] **Step 2: Run the focused test** with `node --test tests/fast-start.test.mjs`; confirm failure because the utilities do not exist.
- [x] **Step 3: Implement deterministic templates** using `crypto.randomUUID()` for step IDs and existing Step fields only.
- [x] **Step 4: Implement URL/name helpers** so URL validation accepts only `http:` and `https:` URLs, rejects blank/invalid values, and naming strips unsafe hostname characters with a readable fallback.
- [x] **Step 5: Implement locator quality** with stable semantic strategies (`role`, `label`, `testId`, `placeholder`), acceptable `text`, and fragile `css`/`xpath`/missing locator; include a recommendation only when a stronger existing field is available.
- [x] **Step 6: Run focused tests** and confirm all utility tests pass.

### Task 2: Add Fast Start UI wiring

**Files:**
- Modify: `src/main.tsx`
- Modify: `src/types.ts`
- Test: `tests/fast-start.test.mjs`

**Interfaces:**
- The renderer imports the utilities from Task 1 and keeps template application as `Step[]` state updates.
- Existing `window.studio.startRecorder`, `stopRecorder`, `saveTest`, and `exportCode` contracts remain unchanged.

- [x] **Step 1: Add URL validation state** and render an inline message; keep Record disabled until the URL is valid.
- [x] **Step 2: Use hostname naming** when starting a new recording only if the active test still has the default untitled name.
- [x] **Step 3: Add template picker state** with `Use template`, four template choices, and explicit replacement confirmation when unsaved steps exist.
- [x] **Step 4: Add recording summary feedback** after Stop using captured action labels and count, without delaying append.
- [x] **Step 5: Add locator quality badges** to target step cards and an `Apply` action when a recommendation is available; update only that step.
- [x] **Step 6: Add guarded keyboard shortcuts** for New, Record, Save, and Export; ignore events from editable targets and prevent browser defaults only when Studio handles the shortcut.
- [x] **Step 7: Build** with `npm run build` and manually verify the existing recorder and save flows still render.

### Task 3: Style Fast Start surfaces

**Files:**
- Modify: `src/styles.css`

- [x] **Step 1: Add styles** for URL validation, template picker, quality badges, recommendation affordance, recording summary, and shortcut hints using existing design tokens.
- [x] **Step 2: Preserve accessibility** with visible focus states, non-color-only status labels, and readable contrast.
- [x] **Step 3: Verify responsive layout** with `npm run build` and inspect the browser UI at desktop and narrow widths.

### Task 4: Update product documentation and regression verification

**Files:**
- Modify: `docs/PRD.md`
- Modify: `docs/DESIGN-SYSTEM.md`
- Modify: `docs/superpowers/specs/2026-08-07-fast-start-design.md`
- Test: `tests/*.test.mjs`

- [x] **Step 1: Document** the two-minute benchmark, template picker, URL-required behavior, quality levels, Apply confirmation, recording summary, and shortcuts.
- [x] **Step 2: Run the complete suite** with `npm test`; expect all generator, recorder, project-management, and Fast Start tests to pass.
- [x] **Step 3: Run production build** with `npm run build`; expect TypeScript and Vite to complete successfully.
- [x] **Step 4: Confirm** no files under `sources/` were modified.
