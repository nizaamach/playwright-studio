# Authoring Acceleration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add local variables, configurable templates, undo/redo, draft recovery, locator diagnostics, step organization, search, and stronger project context without breaking existing Playwright Studio flows.

**Architecture:** Preserve the existing `Step` model and generator contract where possible. Add pure TypeScript modules for variables, history, drafts, grouping, and search; keep renderer orchestration in `main.tsx`; use narrow Electron IPC only for project metadata and active-page locator diagnostics.

**Tech Stack:** React, TypeScript, Electron IPC, Playwright, native CSS, Node test runner, Vite.

## Global Constraints

- Local variables use `{{name}}` syntax; CSV and JSON data sources are out of scope.
- Template configuration collects `baseUrl`, email, and password before Apply.
- Undo/redo uses immutable editor snapshots and a new edit clears redo history.
- Drafts use versioned localStorage and never write project files automatically.
- Locator diagnostics are advisory and never block save.
- Existing `.spec.ts` files remain read-only.
- Browser mode explains that recording and diagnostics require the desktop app.
- Existing generator, recorder, project-management, and Fast Start tests must remain green.
- `sources/` is read-only and must not be modified.

---

### Task 1: Variables and configurable templates

**Files:**
- Create: `src/variables.ts`
- Modify: `src/templates.ts`
- Modify: `src/generator.ts`
- Modify: `src/types.ts`
- Test: `tests/variables.test.mjs`

**Interfaces:**
- `VariableMap = Record<string, string>`.
- `extractVariables(value: string): string[]` returns unique token names in source order.
- `replaceVariables(value: string, variables: VariableMap): string` replaces known tokens and preserves unknown tokens.
- `templateDefinitions` adds required configuration fields and `createTemplateSteps(templateId, variables)` returns ordinary `Step[]`.
- `generateCode(name, steps, variables?)` emits a `testData` object when variables are present and uses `testData.name` references in generated values and URLs.

- [ ] Write failing tests for token extraction, replacement, unresolved token preservation, template configuration, and generated variable declarations.
- [ ] Run `node --test tests/variables.test.mjs` and confirm the new tests fail.
- [ ] Implement the pure variable helpers and update template generation with `baseUrl`, `email`, and `password` values.
- [ ] Update generator output deterministically while keeping existing calls valid when no variables are passed.
- [ ] Run focused tests and existing generator tests.

### Task 2: Undo/redo and draft recovery

**Files:**
- Create: `src/history.ts`
- Create: `src/drafts.ts`
- Modify: `src/main.tsx`
- Test: `tests/editor-state.test.mjs`

**Interfaces:**
- `History<T>` supports `push`, `undo`, `redo`, `canUndo`, and `canRedo` with immutable values.
- `DraftEnvelope` contains `version`, `savedAt`, `projectPath`, and `test`.
- `saveDraft`, `readDraft`, and `clearDraft` use a versioned localStorage-compatible adapter.

- [ ] Write failing tests for history boundaries, redo clearing, draft serialization, unsupported versions, and malformed drafts.
- [ ] Implement pure history operations and draft parsing without browser globals.
- [ ] Add renderer history updates around test edits, recorder append, template Apply, duplicate, move, delete, and clear.
- [ ] Add Undo/Redo controls and keyboard shortcuts while preserving existing shortcuts.
- [ ] Save draft after meaningful edits and show Restore/Discard on startup; never call Electron save automatically.
- [ ] Run focused tests, `npm test`, and `npm run build`.

### Task 3: Step grouping and action search

**Files:**
- Create: `src/step-organizer.ts`
- Modify: `src/types.ts`
- Modify: `src/main.tsx`
- Modify: `src/styles.css`
- Test: `tests/step-organizer.test.mjs`

**Interfaces:**
- `StepGroup = 'Setup' | 'Login' | 'Action' | 'Assertion' | 'Cleanup'`.
- `getStepGroup(step)` returns a deterministic default group.
- `matchesStepQuery(step, query)` searches type, locator, value, assertion, and group.

- [ ] Write failing tests for default grouping and case-insensitive multi-field search.
- [ ] Implement pure organizer helpers.
- [ ] Add group selector to each editable step and persist group metadata compatibly.
- [ ] Add search input and filter the visible step list without changing generated order or saved steps.
- [ ] Add empty search result feedback and styles.
- [ ] Run focused tests and production build.

### Task 4: Locator diagnostics and browser-mode guidance

**Files:**
- Modify: `electron/main.cjs`
- Modify: `electron/preload.cjs`
- Modify: `src/types.ts`
- Modify: `src/main.tsx`
- Modify: `src/styles.css`
- Test: `tests/locator-diagnostics.test.mjs`

**Interfaces:**
- `window.studio.countLocator(locatorType, selector, role?)` returns `{ ok: boolean; count?: number; message?: string }`.
- Renderer maps count `0` to error, `1` to stable, and `2+` to warning.
- If no Electron API exists, UI shows `Requires Playwright Studio Desktop` and does not throw.

- [ ] Write failing tests for IPC input validation and unavailable-session results.
- [ ] Add a main-process handler that queries the active recorder page only and returns a safe count.
- [ ] Expose the narrow method through preload and its TypeScript type.
- [ ] Add a Check locator action to target steps with visible status and no save blocking.
- [ ] Add browser-mode recorder/diagnostic guidance where the Record area is unavailable.
- [ ] Run focused tests, recorder integration tests, and build.

### Task 5: Project context import

**Files:**
- Modify: `electron/project.cjs`
- Modify: `electron/main.cjs`
- Modify: `src/types.ts`
- Modify: `src/main.tsx`
- Modify: `src/styles.css`
- Test: `tests/project-management.test.mjs`

**Interfaces:**
- `discoverProjectContext(projectPath)` returns `baseURL?: string`, `testDir`, and `projects?: string[]`.
- Existing project discovery remains read-only and keeps existing test identities stable.

- [ ] Extend fixture config with `use.baseURL` and named projects and write failing context assertions.
- [ ] Parse only static string config values safely; fall back without crashing on dynamic configs.
- [ ] Return context through `read-project` and display it in the project header/sidebar.
- [ ] Add a browser-mode message when project context is unavailable.
- [ ] Run project-management tests and build.

### Task 6: Documentation and full verification

**Files:**
- Modify: `docs/PRD.md`
- Modify: `docs/DESIGN-SYSTEM.md`
- Modify: `docs/superpowers/specs/2026-08-08-authoring-acceleration-design.md`
- Test: `tests/*.test.mjs`

- [x] Document local variables, template configuration, undo/redo, draft recovery, grouping, search, locator diagnostics, and project context.
- [x] Run `npm test` and confirm all unit, project, generator, and recorder tests pass.
- [x] Run the Electron Playwright smoke flow for template configuration, undo/redo, draft recovery, search, and browser-mode guidance.
- [x] Run `npm run build`.
- [x] Confirm no files under `sources/` changed.
