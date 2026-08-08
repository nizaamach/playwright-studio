# Test Report Summary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display a concise latest-run report in the Run Test panel using Playwright JSON results.

**Architecture:** Normalize optional summary data at the runner boundary, preserve raw logs and existing artifacts, then render a compact report block in `RunPanel`. Missing JSON fields fall back to safe defaults.

**Tech Stack:** TypeScript, React, Electron runner, Playwright JSON reporter, Node test runner, CSS.

## Global Constraints

- The report represents only the latest run and does not modify saved test files.
- Existing status, logs, error, and artifact behavior remains available.
- Malformed or missing report fields must not throw.

---

### Task 1: Normalize report summary data

**Files:**
- Modify: `src/runner.ts` — add optional `report` summary fields to `RunResult` and normalize them.
- Test: `tests/runner.test.mjs` — cover parsed counts, file path, failure location, and missing fields.

**Interfaces:**
- Produces `RunResult.report: { file: string; total: number; passed: number; failed: number; skipped: number; errorLocation?: { file: string; line?: number; column?: number } }`.

- [ ] Add failing normalization tests with a representative Playwright JSON payload.
- [ ] Implement safe numeric/string normalization and defaults of empty path and zero counts.
- [ ] Run `node --test tests/runner.test.mjs` and verify all tests pass.
- [ ] Commit as `feat: normalize test report summary`.

### Task 2: Render the report in the runner panel

**Files:**
- Modify: `src/main.tsx` — render the `TEST REPORT` summary after completion.
- Modify: `src/styles.css` — add compact report layout and status styling.
- Test: existing runner/UI tests plus full suite.

**Interfaces:**
- Consumes `RunResult.report` from Task 1.

- [ ] Add a `TEST REPORT` block showing status, duration, counts, file path, and failure location when present.
- [ ] Show `All tests passed` only for passed runs with no failed tests; otherwise retain actionable failure text.
- [ ] Keep logs and artifacts below the report.
- [ ] Run `npm test && npm run build`.
- [ ] Commit as `feat: show test report summary`.

### Task 3: End-to-end verification

**Files:**
- Modify: none.

- [ ] Run `npm test && npm run build`.
- [ ] Start the app with `env -u ELECTRON_RUN_AS_NODE npm run dev`.
- [ ] Verify a completed run shows the report and a failed run shows location/error details.
- [ ] Confirm implementation files are committed and push the branch.
