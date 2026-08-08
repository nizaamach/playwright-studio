# Headed Run Option Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-run `Show browser` option that switches Playwright between visible headed execution and background headless execution.

**Architecture:** Extend the typed runner request with an optional `headed` flag. Keep the UI choice local to the current session and pass it through the existing preload/Electron bridge. Add `--headed` only at the runner command boundary when requested; invalid or absent values remain headless.

**Tech Stack:** React, TypeScript, Electron IPC/preload, Node.js child process, Playwright CLI, Node test runner.

## Global Constraints

- The option applies only to the current run and must not modify saved project or test files.
- Missing or invalid `headed` values default to headless.
- Existing run status, logs, errors, artifacts, and Stop behavior remain unchanged.
- Do not add persistent preferences or a separate preview window.

---

### Task 1: Extend runner contract and command construction

**Files:**
- Modify: `src/runner.ts` — add `headed?: boolean` to `RunRequest`.
- Modify: `electron/runner.cjs` — accept an options object in `buildRunCommand` and append `--headed` only for `headed === true`.
- Test: `tests/electron-runner.test.mjs` — cover headed and headless command output.

**Interfaces:**
- Consumes: existing `buildRunCommand(cwd, specFile, playwrightBin)` calls.
- Produces: `buildRunCommand(cwd, specFile, playwrightBin, { headed?: boolean })` and `RunRequest.headed?: boolean`.

- [ ] **Step 1: Write the failing tests**

Add tests beside the existing command tests:

```js
test('adds headed mode when requested', () => {
  const result = buildRunCommand('/project', 'tests/run/test.spec.ts', '/studio/playwright', { headed: true });
  assert.deepEqual(result.args, ['test', 'tests/run/test.spec.ts', '--reporter=json', '--headed']);
});

test('keeps runs headless when headed is not enabled', () => {
  const result = buildRunCommand('/project', 'tests/run/test.spec.ts', '/studio/playwright', { headed: false });
  assert.deepEqual(result.args, ['test', 'tests/run/test.spec.ts', '--reporter=json']);
});
```

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `node --test tests/electron-runner.test.mjs`

Expected: the existing tests pass, and the two new tests fail because `buildRunCommand` does not yet accept the options argument.

- [ ] **Step 3: Implement the minimal runner change**

Change the signature and construct arguments without mutating the base command:

```js
function buildRunCommand(cwd, specFile, playwrightBin, options = {}) {
  const args = playwrightBin
    ? ['test', specFile, '--reporter=json']
    : ['playwright', 'test', specFile, '--reporter=json'];
  if (options && options.headed === true) args.push('--headed');
  return { command: playwrightBin || (process.platform === 'win32' ? 'npx.cmd' : 'npx'), args, cwd };
}
```

Pass the request option from `runGeneratedTest`:

```js
const command = buildRunCommand(
  projectPath,
  path.relative(projectPath, specPath),
  existsSync(localBin) ? localBin : undefined,
  { headed: request.headed === true }
);
```

Add `headed?: boolean` to `RunRequest` in `src/runner.ts`. No shell environment variable is needed; the CLI flag is explicit and scoped to the child process.

- [ ] **Step 4: Run the focused tests and verify they pass**

Run: `node --test tests/electron-runner.test.mjs`

Expected: all runner tests pass, including both headed and headless cases.

- [ ] **Step 5: Commit the runner contract**

```bash
git --git-dir=.git-playwright --work-tree=. add src/runner.ts electron/runner.cjs tests/electron-runner.test.mjs
git --git-dir=.git-playwright --work-tree=. commit -m "feat: support headed test runs"
```

### Task 2: Add the per-run Show browser control

**Files:**
- Modify: `src/main.tsx` — store the toggle state, pass it to `runTest`, and render the control in `RunPanel`.
- Test: `tests/runner.test.mjs` or the existing UI-independent runner tests — cover the default run option if a suitable pure helper is introduced; otherwise validate through typecheck/build and runner command tests.

**Interfaces:**
- Consumes: `RunRequest.headed?: boolean` from Task 1.
- Produces: `RunPanel` prop `headed: boolean` and `onHeadedChange: (value: boolean) => void`; `runTest` sends `headed`.

- [ ] **Step 1: Add the UI state and wire the request**

Near the existing run state in `App`, add:

```ts
const [runHeaded, setRunHeaded] = useState(true);
```

Include the current value in the existing request:

```ts
const result = await window.studio.runTest({
  testId: selected.id,
  source: runSource,
  projectPath: state?.projectPath,
  testDir: state?.project.testDir,
  baseURL: selectedEnvironment.baseURL || state?.project.baseURL,
  environment: selected.variables,
  headed: runHeaded
});
```

- [ ] **Step 2: Render the control in the Run panel**

Extend the `RunPanel` props and render a native checkbox next to the run controls:

```tsx
<label className="run-headed-toggle">
  <input type="checkbox" checked={headed} onChange={(event) => onHeadedChange(event.target.checked)} disabled={running} />
  <span>Show browser</span>
</label>
```

Pass it from the existing call site:

```tsx
<RunPanel
  status={runStatus}
  result={runResult}
  message={runMessage}
  available={Boolean(window.studio)}
  headed={runHeaded}
  onHeadedChange={setRunHeaded}
  onRun={() => void runTest()}
  onStop={() => void stopTest()}
/>
```

Keep the checkbox disabled while queued/running so the active child process cannot change mode mid-run. The default `useState(true)` makes visible execution the initial behavior without persistence.

- [ ] **Step 3: Run tests and build**

Run: `npm test && npm run build`

Expected: all existing tests pass and the Vite production build completes without TypeScript errors.

- [ ] **Step 4: Commit the UI option**

```bash
git --git-dir=.git-playwright --work-tree=. add src/main.tsx
git --git-dir=.git-playwright --work-tree=. commit -m "feat: add show browser run option"
```

### Task 3: Verify the end-to-end behavior

**Files:**
- Modify: none unless verification exposes a regression.
- Test: `tests/electron-runner.test.mjs`, full project test suite, and manual Electron run.

**Interfaces:**
- Consumes: the completed UI-to-runner `headed` path.
- Produces: verified headed and headless execution behavior.

- [ ] **Step 1: Run the complete automated checks**

Run: `npm test && npm run build`

Expected: all tests pass and the build succeeds.

- [ ] **Step 2: Start the desktop app with the required Electron environment**

Run: `env -u ELECTRON_RUN_AS_NODE npm run dev`

Expected: the Playwright Studio window opens at the local Vite URL without `ipcMain` errors.

- [ ] **Step 3: Manually verify headed mode**

Open a writable test and click `Run Test` with `Show browser` checked. Expected: a visible Chromium window opens and performs the generated steps; the UI eventually shows Passed or the runner error.

- [ ] **Step 4: Manually verify headless mode**

Stop or wait for completion, uncheck `Show browser`, and click `Run Test` again. Expected: no browser window opens and the UI still reports the run result and logs.

- [ ] **Step 5: Check the working tree and report the result**

Run: `git --git-dir=.git-playwright --work-tree=. status --short`

Expected: only pre-existing/generated local artifacts are present; implementation files are committed.
