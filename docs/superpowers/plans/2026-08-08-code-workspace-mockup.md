# Code Workspace Mockup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved Playwright Studio V2 code-editor mockup to the existing functional UI without changing test-authoring behavior.

**Architecture:** Keep React state and handlers in `src/main.tsx`; update the existing native CSS system in `src/styles.css` so the current three functional regions read as project rail, step builder, and generated-code panel. Reuse existing tokens, controls, responsive breakpoints, and semantic status colors.

**Tech Stack:** React, TypeScript, Vite, native CSS, existing Node test runner.

## Global Constraints

- Preserve all existing recorder, runner, import, save, undo/redo, templates, and environment behavior.
- Use one decorative accent: `#C9FF68`; syntax colors are restricted to generated code.
- Use dark graphite surfaces, monospace metadata/code, 5–6px radii, and no new dependencies.
- Treat `sources/` as read-only.

### Task 1: Apply the code-workspace visual system

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 1: Replace the dark theme tokens and base typography** with the mockup palette (`#0D1117`, `#161B22`, `#1C2128`, `#30363D`, `#E6EDF3`, `#8B949E`, `#C9FF68`) and a system sans/monospace stack.
- [ ] **Step 2: Update the desktop shell dimensions** to a 230px project rail, flexible builder, and roughly 405px code panel while preserving the existing mobile collapse.
- [ ] **Step 3: Restyle top bar, project tree, recorder toolbar, step cards, buttons, inputs, code panel, run panel, and status feedback** using the mockup's flat graphite surfaces and hairline borders.
- [ ] **Step 4: Add syntax-token colors and interaction states** for code output, focus, hover, active, reduced motion, and light theme compatibility.
- [ ] **Step 5: Run `npm run build`** and fix only visual/type regressions caused by the stylesheet change.

### Task 2: Verify the implemented screen

**Files:**
- Test: existing `tests/*.test.mjs`

- [ ] **Step 1: Run `npm test`** and confirm existing editor, recorder, generator, and project-management tests pass.
- [ ] **Step 2: Run `npm run build`** and confirm the Vite production build completes.
- [ ] **Step 3: Inspect `git diff --stat` and `git status --short`** to confirm only the planned UI files and plan are changed; do not clean unrelated user artifacts.
