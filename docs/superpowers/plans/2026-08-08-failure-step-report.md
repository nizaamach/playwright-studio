# Failure Step Details in Test Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the exact failed Playwright test/step, reason, and source location in the Test Report.

**Architecture:** Extend the existing `normalizeRunResult` boundary in `src/runner.ts` to flatten failure details from Playwright JSON while preserving safe fallbacks. Render the normalized failures in `RunPanel` without changing the existing summary, logs, or artifacts.

**Tech Stack:** TypeScript, React, Vite, Node test runner, Playwright JSON reporter.

## Global Constraints

- Keep malformed runner output safe and non-throwing.
- Preserve existing report counts, statuses, logs, and artifacts.
- Show failure details only for completed failed runs; stopped runs must not invent failures.
- Keep long messages and paths readable by wrapping them in the report.

---

### Task 1: Normalize Playwright failure details

**Files:**
- Modify: `src/runner.ts:4-164`
- Test: `tests/runner.test.mjs`

**Interfaces:**
- Produces `RunReport.failures?: Array<{ title: string; message: string; location?: { file: string; line?: number; column?: number } }>`.
- Keeps `normalizeRunResult(payload: unknown): RunResult` as the public normalization boundary.

- [ ] **Step 1: Write failing tests for one and multiple failures**

Add a payload with `suites[0].specs[0].title`, `tests[].title`, and `results[].errors[]`, then assert normalized failures preserve report order, title, message, and location. Include a second failed test to verify flattening.

```js
test('normalizes failed test details in report order', () => {
  const result = normalizeRunResult({
    status: 'failed',
    suites: [{ specs: [{ file: 'tests/login.spec.ts', title: 'login', tests: [
      { title: 'valid credentials', results: [{ errors: [{ message: 'Expected dashboard', location: { file: 'tests/login.spec.ts', line: 12, column: 5 } }] }] },
      { title: 'invalid password', results: [{ errors: [{ message: 'Expected error message' }] }] }
    ] }] }]
  });
  assert.deepEqual(result.report.failures, [
    { title: 'valid credentials', message: 'Expected dashboard', location: { file: 'tests/login.spec.ts', line: 12, column: 5 } },
    { title: 'invalid password', message: 'Expected error message' }
  ]);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test tests/runner.test.mjs`

Expected: the new assertion fails because `RunReport` does not expose `failures` yet.

- [ ] **Step 3: Add safe failure types and parser helpers**

In `src/runner.ts`, add the failure type to `RunReport`. Implement helpers that traverse every suite/spec/test/result, read `errors`, prefer `error.message` and nested `error.error.message`, and normalize only valid locations. Use the spec title plus test title when both exist; otherwise fall back to the test title, spec title, report file, or `Unknown step`.

Only attach `failures` for `status === 'failed'` and only include entries with a non-empty message. Keep `error` fallback behavior unchanged.

- [ ] **Step 4: Add malformed, nested, and stopped-run coverage**

Add tests proving malformed suites/errors are ignored, nested errors produce the useful inner message, missing locations omit `location`, and a stopped payload does not expose failure details.

- [ ] **Step 5: Run focused tests**

Run: `node --test tests/runner.test.mjs`

Expected: all runner tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/runner.ts tests/runner.test.mjs
git commit -m "feat: normalize failed step details"
```

### Task 2: Render failed steps in Test Report

**Files:**
- Modify: `src/main.tsx:408-414`
- Modify: `src/styles.css:125-138`

**Interfaces:**
- Consumes `result.report.failures` from Task 1.
- Produces an accessible `Failed steps` section inside the existing `Test Report`.

- [ ] **Step 1: Add the report markup**

In `RunPanel`, after the summary grid and before the success/failure message, render a section only when `report.failures?.length` is positive. Each failure should show its title, message, and a location string when present.

```tsx
{report.failures && report.failures.length > 0 && <div className="test-report-failures">
  <div className="test-report-subhead">Failed steps</div>
  {report.failures.map((failure, index) => <article className="test-report-failure" key={`${failure.title}-${index}`}>
    <strong>{failure.title}</strong>
    <p>{failure.message}</p>
    {failure.location && <small>{formatLocation(failure.location)}</small>}
  </article>)}
</div>}
```

Use a small local formatter or existing location formatting logic; do not duplicate conditional colon handling in multiple places.

- [ ] **Step 2: Add compact report styles**

In `src/styles.css`, style the failure list with a danger accent, readable spacing, wrapped messages/paths, and no horizontal overflow. Preserve the existing dark/light theme variables and compact desktop layout.

- [ ] **Step 3: Build and run the full suite**

Run: `npm test && npm run build`

Expected: all tests pass and Vite build completes successfully.

- [ ] **Step 4: Commit**

```bash
git add src/main.tsx src/styles.css
git commit -m "feat: show failed steps in test report"
```

### Task 3: Final verification and handoff

**Files:**
- No source changes expected.

- [ ] **Step 1: Review the diff and verify scope**

Run: `git diff HEAD~2..HEAD -- src/runner.ts src/main.tsx src/styles.css tests/runner.test.mjs`

Confirm that only failure normalization, report rendering, styling, and tests changed.

- [ ] **Step 2: Run the complete verification**

Run: `npm test && npm run build`

Expected: all tests pass and production build succeeds.

- [ ] **Step 3: Push the feature branch**

```bash
git push origin experimental/all-updates-v2
```

- [ ] **Step 4: Report the result**

Tell the user where failure details appear, that the step title/reason/location are shown, and provide the commit/branch and verification result.
