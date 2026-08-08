# Playwright Studio All Updates v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the requested local test execution, richer assertions, code preview, locator assistance, constrained import, test organization, and environment/data support on the isolated `experimental/all-updates-v2` branch.

**Architecture:** Keep the existing React editor and pure TypeScript generator as the source of truth. Add focused pure modules for run-result normalization, import parsing, and environment substitution; expose privileged runner/import/artifact operations through Electron IPC; keep browser-only mode functional with explicit simulated runner results. UI state changes remain local until the user saves.

**Tech Stack:** React, TypeScript, Electron IPC, Playwright, Node test runner, Vite.

## Global Constraints

- Preserve the current `Step`, `TestCase`, `ManagedTest`, and `ProjectState` formats when reading existing projects.
- Do not store environment secrets in test metadata or generated source files.
- Keep the existing browser-only fallback working when `window.studio` is unavailable.
- Use the project-local Git metadata at `.git-playwright`; do not use the `/Users/mac` Git root.
- Run `npm test` and `npm run build` before each phase checkpoint.
- Video recording and a full TypeScript parser are deferred; import is intentionally limited to common Playwright patterns.

---

### Task 1: Add typed runner contracts and result normalization

**Files:**
- Create: `src/runner.ts`
- Modify: `src/types.ts`
- Create: `tests/runner.test.mjs`

**Interfaces:**
- Consumes: generated test source and runner result payloads.
- Produces: `RunStatus`, `RunRequest`, `RunArtifact`, `RunResult`, and `normalizeRunResult(payload)`.

- [ ] **Step 1: Write the failing tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRunResult } from '../src/runner.ts';

test('normalizes a passing run with artifacts', () => {
  assert.deepEqual(normalizeRunResult({ status: 'passed', durationMs: 42, stdout: 'ok', artifacts: [{ kind: 'trace', path: '/tmp/a.zip' }] }), {
    status: 'passed', durationMs: 42, stdout: 'ok', stderr: '', error: '', artifacts: [{ kind: 'trace', path: '/tmp/a.zip' }]
  });
});

test('normalizes malformed failures safely', () => {
  const result = normalizeRunResult({ status: 'failed', error: { message: 'boom' } });
  assert.equal(result.status, 'failed');
  assert.equal(result.error, 'boom');
  assert.equal(result.stderr, '');
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test tests/runner.test.mjs`
Expected: FAIL because `src/runner.ts` does not exist.

- [ ] **Step 3: Implement the contracts and normalizer**

```ts
export type RunStatus = 'idle' | 'queued' | 'running' | 'passed' | 'failed' | 'stopped';
export type RunArtifact = { kind: 'screenshot' | 'trace' | 'video'; path: string };
export type RunRequest = { testId: string; source: string; baseURL?: string; environment?: Record<string, string> };
export type RunResult = { status: Exclude<RunStatus, 'idle' | 'queued' | 'running'>; durationMs: number; stdout: string; stderr: string; error: string; artifacts: RunArtifact[] };

export function normalizeRunResult(payload: unknown): RunResult {
  const value = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
  const status = value.status === 'passed' || value.status === 'stopped' ? value.status : 'failed';
  const error = typeof value.error === 'string' ? value.error : (value.error && typeof value.error === 'object' && 'message' in value.error ? String(value.error.message) : '');
  const artifacts = Array.isArray(value.artifacts) ? value.artifacts.filter((item): item is RunArtifact => Boolean(item && typeof item === 'object' && ['screenshot', 'trace', 'video'].includes(String((item as Record<string, unknown>).kind)) && typeof (item as Record<string, unknown>).path === 'string')) : [];
  return { status, durationMs: typeof value.durationMs === 'number' ? value.durationMs : 0, stdout: typeof value.stdout === 'string' ? value.stdout : '', stderr: typeof value.stderr === 'string' ? value.stderr : '', error, artifacts };
}
```

- [ ] **Step 4: Run the focused test and the existing suite**

Run: `node --test tests/runner.test.mjs && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git --git-dir=.git-playwright --work-tree=. add src/runner.ts src/types.ts tests/runner.test.mjs
git --git-dir=.git-playwright --work-tree=. commit -m "feat: add typed runner result contracts"
```

### Task 2: Add Electron runner IPC and artifact collection

**Files:**
- Create: `electron/runner.cjs`
- Modify: `electron/main.cjs`
- Modify: `electron/preload.cjs`
- Modify: `src/types.ts`
- Create: `tests/electron-runner.test.mjs`

**Interfaces:**
- Consumes: `RunRequest` and `normalizeRunResult` from Task 1.
- Produces: `window.studio.runTest(request)`, `window.studio.stopTest()`, and `window.studio.openArtifact(path)`.

- [ ] **Step 1: Write failing tests for command construction and result parsing**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRunCommand, parseRunnerOutput } from '../electron/runner.cjs';

test('builds an isolated Playwright command', () => {
  assert.deepEqual(buildRunCommand('/tmp/run', 'test.spec.ts'), { command: 'npx', args: ['playwright', 'test', 'test.spec.ts', '--reporter=json'], cwd: '/tmp/run' });
});

test('maps JSON runner output to a passed result', () => {
  assert.equal(parseRunnerOutput('{"status":"passed","durationMs":12}').status, 'passed');
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test tests/electron-runner.test.mjs`
Expected: FAIL because `electron/runner.cjs` does not export the functions.

- [ ] **Step 3: Implement isolated runner execution**

Create a temporary run directory, write the generated `.spec.ts` and a minimal Playwright config with `trace: 'retain-on-failure'` and `screenshot: 'only-on-failure'`, spawn `npx playwright test <file> --reporter=json`, capture stdout/stderr, support cancellation with `AbortController`, and return a typed payload. Reject paths that escape the temporary directory and pass environment values only through `process.env`.

- [ ] **Step 4: Wire IPC and preload methods**

Register `run-test`, `stop-test`, and `open-artifact` handlers in `electron/main.cjs`; expose matching methods in `electron/preload.cjs`; update the `Window.studio` interface. `open-artifact` must verify the path exists and is inside the run artifact directory before calling `shell.openPath`.

- [ ] **Step 5: Run tests and build**

Run: `node --test tests/electron-runner.test.mjs && npm test && npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git --git-dir=.git-playwright --work-tree=. add electron src/types.ts tests/electron-runner.test.mjs
git --git-dir=.git-playwright --work-tree=. commit -m "feat: run generated Playwright tests locally"
```

### Task 3: Add runner controls and result panel

**Files:**
- Modify: `src/main.tsx`
- Modify: `src/styles.css`
- Create: `tests/run-state.test.mjs`

**Interfaces:**
- Consumes: `RunStatus`, `RunRequest`, and `RunResult` from Task 1 plus `window.studio.runTest` from Task 2.
- Produces: Run, Stop, Rerun controls and a result panel with status, duration, logs, error, and artifact buttons.

- [ ] **Step 1: Write the failing state tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { canRun, runLabel } from '../src/runner.ts';

test('run is disabled for an invalid or read-only test', () => {
  assert.equal(canRun({ readOnly: true, hasErrors: false, hasStudio: true, status: 'idle' }), false);
  assert.equal(canRun({ readOnly: false, hasErrors: false, hasStudio: true, status: 'idle' }), true);
});

test('run label reflects status', () => assert.equal(runLabel('running'), 'Running…'));
```

- [ ] **Step 2: Implement state helpers and UI state**

Add `canRun` and `runLabel`, then add `runStatus`, `runResult`, and `runMessage` state in `App`. Run must use the same generated code shown in the preview, must not save automatically, and must clear stale artifacts before a new run.

- [ ] **Step 3: Add result panel styling and empty/error states**

Show a compact status badge, elapsed time, expandable stdout/stderr, actionable error text, and artifact buttons. Browser-only mode must show “Desktop runner unavailable” instead of throwing.

- [ ] **Step 4: Run tests and build**

Run: `node --test tests/run-state.test.mjs && npm test && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git --git-dir=.git-playwright --work-tree=. add src/main.tsx src/runner.ts src/styles.css tests/run-state.test.mjs
git --git-dir=.git-playwright --work-tree=. commit -m "feat: add test runner controls and results"
```

### Task 4: Complete assertion builder and live code preview

**Files:**
- Modify: `src/main.tsx`
- Modify: `src/generator.ts`
- Modify: `src/styles.css`
- Modify: `tests/generator.test.mjs`

**Interfaces:**
- Consumes: existing `Step.assertion` model and `generateCode`.
- Produces: guided assertion fields, validation for visibility/enabled/disabled/checked, and a read-only preview with copy/export.

- [ ] **Step 1: Add failing generator tests**

```js
test('generates visibility and checked assertions', () => {
  const code = generateCode('assertions', [
    { id: 'a', type: 'assert', selector: '[data-ready]', locatorType: 'css', assertion: 'visible' },
    { id: 'b', type: 'assert', selector: '#agree', locatorType: 'css', assertion: 'checked' }
  ]);
  assert.match(code, /toBeVisible/);
  assert.match(code, /toBeChecked/);
});
```

- [ ] **Step 2: Implement generator mappings and validation**

Map each supported assertion to the corresponding Playwright expect call, require an expected value only for value-bearing assertions, and require an attribute name for `attribute`. Preserve current mappings and error text.

- [ ] **Step 3: Add preview actions**

Render `previewCode` beside the editor, add a copy button using `navigator.clipboard.writeText`, and keep export routed through the existing `window.studio.exportCode` bridge.

- [ ] **Step 4: Run tests and build**

Run: `node --test tests/generator.test.mjs && npm test && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git --git-dir=.git-playwright --work-tree=. add src/main.tsx src/generator.ts src/styles.css tests/generator.test.mjs
git --git-dir=.git-playwright --work-tree=. commit -m "feat: expand assertions and add live code preview"
```

### Task 5: Add locator recommendations and constrained spec import

**Files:**
- Create: `src/importer.ts`
- Create: `src/locator-recommendations.ts`
- Modify: `src/main.tsx`
- Modify: `src/styles.css`
- Create: `tests/importer.test.mjs`
- Create: `tests/locator-recommendations.test.mjs`

**Interfaces:**
- Consumes: Playwright source text and existing `Step`/`LocatorDiagnostic` values.
- Produces: `importSpec(source): { steps: Step[]; warnings: ImportWarning[] }` and `recommendLocators(step, diagnostic): LocatorRecommendation[]`.

- [ ] **Step 1: Write failing parser and recommendation tests**

```js
test('imports common Playwright actions and reports unsupported lines', () => {
  const result = importSpec("await page.goto('https://example.com');\nawait page.getByRole('button', { name: 'Save' }).click();\nawait page.waitForTimeout(100);");
  assert.equal(result.steps.map((step) => step.type).join(','), 'navigate,click,wait');
  assert.equal(result.warnings.length, 0);
});

test('prefers role over brittle css when available', () => {
  const result = recommendLocators({ selector: '.save', locatorType: 'css', role: 'button' }, { status: 'available', count: 1 });
  assert.equal(result[0].locatorType, 'role');
});
```

- [ ] **Step 2: Implement the constrained parser**

Parse only literal `goto`, `getByRole`, `getByText`, `getByLabel`, `locator`, `fill`, `click`, `check`, `selectOption`, `press`, `expect`, `waitForTimeout`, and screenshot statements. Return one warning per unsupported non-empty line with its 1-based line number; never execute imported source.

- [ ] **Step 3: Implement recommendation ranking and UI actions**

Rank test ID, role, label, text, placeholder, CSS, and XPath using available role/selector data. Show recommendation chips and retain the original selector until the user accepts one.

- [ ] **Step 4: Run tests and build**

Run: `node --test tests/importer.test.mjs tests/locator-recommendations.test.mjs && npm test && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git --git-dir=.git-playwright --work-tree=. add src/importer.ts src/locator-recommendations.ts src/main.tsx src/styles.css tests/importer.test.mjs tests/locator-recommendations.test.mjs
git --git-dir=.git-playwright --work-tree=. commit -m "feat: add spec import and locator recommendations"
```

### Task 6: Add test organization and environment/data profiles

**Files:**
- Create: `src/test-organization.ts`
- Create: `src/environments.ts`
- Modify: `src/types.ts`
- Modify: `src/main.tsx`
- Modify: `src/styles.css`
- Modify: `electron/main.cjs`
- Modify: `electron/preload.cjs`
- Create: `tests/test-organization.test.mjs`
- Create: `tests/environments.test.mjs`

**Interfaces:**
- Consumes: `ManagedTest`, `Project`, `RunRequest`, and the existing project discovery/save bridge.
- Produces: stable tag/folder filtering, `resolveEnvironment(profile, overrides)`, and environment selection for runner/code generation.

- [ ] **Step 1: Write failing organization and substitution tests**

```js
test('filters tests by search, tag, and folder without changing ids', () => {
  const tests = [{ id: 'a', name: 'Login', tags: ['smoke'], folder: 'auth' }, { id: 'b', name: 'Checkout', tags: ['regression'], folder: 'shop' }];
  assert.deepEqual(filterTests(tests, { query: 'login', tag: 'smoke', folder: 'auth' }).map((item) => item.id), ['a']);
});

test('resolves environment values without mutating the stored profile', () => {
  const profile = { baseURL: 'https://qa.example.com', values: { email: 'qa@example.com' } };
  assert.deepEqual(resolveEnvironment(profile, { email: 'override@example.com' }), { baseURL: 'https://qa.example.com', values: { email: 'override@example.com' } });
  assert.equal(profile.values.email, 'qa@example.com');
});
```

- [ ] **Step 2: Implement stable organization metadata**

Extend managed-test metadata with optional `tags` and `folder`, keep IDs and relative paths unchanged, and provide pure filtering/grouping helpers. Add UI controls for query, tag, and folder.

- [ ] **Step 3: Implement environment profiles**

Add named profiles containing non-secret base URL and variable names; keep secret values in local storage or process environment only. Add profile selection to the run panel and substitute values at run time without persisting resolved secrets.

- [ ] **Step 4: Run tests and build**

Run: `node --test tests/test-organization.test.mjs tests/environments.test.mjs && npm test && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git --git-dir=.git-playwright --work-tree=. add src electron tests
git --git-dir=.git-playwright --work-tree=. commit -m "feat: organize tests and add environment profiles"
```

### Task 7: Regression verification and remote checkpoint

**Files:**
- Modify: `docs/PRD.md`
- Modify: `docs/DESIGN-SYSTEM.md` only if new UI states require documented tokens.

- [ ] **Step 1: Run the complete verification suite**

Run: `npm test && npm run build`
Expected: all tests pass and TypeScript/Vite build completes.

- [ ] **Step 2: Verify rollback checkpoint**

Run: `git --git-dir=.git-playwright --work-tree=. log --oneline --decorate --all -6`
Expected: the baseline commit and every feature checkpoint are visible; `main` remains at `0f83780`.

- [ ] **Step 3: Push the completed experimental branch**

```bash
git --git-dir=.git-playwright --work-tree=. push -u origin experimental/all-updates-v2
```

- [ ] **Step 4: Commit documentation and report the rollback command**

```bash
git --git-dir=.git-playwright --work-tree=. add docs
git --git-dir=.git-playwright --work-tree=. commit -m "docs: record all-updates v2 verification"
git --git-dir=.git-playwright --work-tree=. push
```

Rollback command: `git --git-dir=.git-playwright --work-tree=. switch experimental/all-updates`.
