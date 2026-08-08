# Project Management Implementation Plan

> **For agentic workers:** Implement this plan task-by-task with a test checkpoint after each task.

**Goal:** Add a safe project explorer that distinguishes editable Playwright Studio tests from read-only existing `.spec.ts` files, while supporting rename and delete for Studio tests.

**Architecture:** Electron scans the configured Playwright test directory and `.playwright-studio/tests`. It returns one normalized `TestCase` list with `readOnly` metadata. The renderer uses that metadata to make existing tests view-only. Rename and delete remain explicit Electron IPC operations and update or remove both Studio metadata and generated files.

**Tech Stack:** Electron IPC, Node `fs/promises`, React, TypeScript, native CSS, Node test runner.

## Global Constraints

- Existing `.spec.ts` tests are read-only and must never be modified by Studio.
- Studio rename/delete operations affect metadata and generated `.spec.ts` together.
- Browser fallback storage remains local-only and unchanged.
- No Test Runner is added in this phase.

### Task 1: Normalize project test discovery

**Files:**
- Modify: `src/types.ts`
- Modify: `electron/main.cjs`
- Test: `tests/project-management.test.mjs`

- [x] Add `readOnly?: boolean`, `source?: 'studio' | 'existing'`, and `relativePath?: string` to `TestCase`.
- [x] Add recursive `.spec.ts` discovery under the detected `testDir`.
- [x] Keep `.steps.json` entries editable and include existing `.spec.ts` entries as read-only.
- [x] Read `testDir` from `playwright.config.ts` with `testDir: '...'` or `testDir: "..."`; fall back to `tests`.
- [x] Add tests proving both categories are returned and existing files are not written.

### Task 2: Add safe rename and delete IPC

**Files:**
- Modify: `electron/main.cjs`
- Modify: `electron/preload.cjs`
- Modify: `src/types.ts`
- Test: `tests/project-management.test.mjs`

- [x] Add `renameTest(projectPath, testId, name)` to the preload API and main handler.
- [x] Rename updates the Studio metadata `name` and generated TypeScript test title while retaining the stable test id filenames.
- [x] Reject rename when the target test is not a Studio test.
- [x] Add `deleteTest(projectPath, testId)` to remove only the matching `.steps.json` and `.spec.ts` pair.
- [x] Reject delete for read-only tests.
- [x] Return explicit boolean success values for renderer feedback.

### Task 3: Update Test Explorer and read-only editor state

**Files:**
- Modify: `src/main.tsx`
- Modify: `src/styles.css`

- [x] Render existing tests with a visible `Read-only` marker and disable rename/delete controls for them.
- [x] Render Studio tests as editable entries.
- [x] Show a read-only notice instead of editable step controls for existing tests.
- [x] Show the existing `.spec.ts` source in the code panel without regenerating it.
- [x] Add rename and delete actions for Studio tests with confirmation before delete.
- [x] After rename/delete, refresh the local project state and keep the active selection coherent.

### Task 4: Verify and document

**Files:**
- Modify: `docs/PRD.md`
- Modify: `docs/DESIGN-SYSTEM.md`
- Test: `tests/project-management.test.mjs`

- [x] Document read-only existing tests and Studio file lifecycle.
- [x] Run project management tests, existing generator tests, recorder integration test, and production build.
- [x] Confirm `sources/` remains untouched.
