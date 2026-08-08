# Task 2 Report: Failed Steps UI

## Status

Completed. The Test Report now renders a Failed steps section whenever `result.report.failures` contains one or more entries. Stopped reports do not render failure details.

## Implementation

- Added a shared `formatLocation` helper in `src/main.tsx` for `file[:line[:column]]` display. It formats both the existing summary-level failure location and each failed-step location, keeping optional line and column handling in one place.
- Added a conditional, accessible failure-details region inside `RunPanel`, between the summary grid and the success/failure outcome message.
  - The region has an `h3` labelled `Failed steps`.
  - Each `RunFailure` is represented by an `article` containing its title, message, and optional formatted location.
  - Existing summary, runner logs, artifacts, and outcome messages were not changed.
- Added compact report styles in `src/styles.css`:
  - Danger-colored heading and left accent border.
  - Existing CSS custom properties for theme-aware colors and surfaces.
  - `min-width: 0`, `overflow-wrap: anywhere`, and `word-break: break-word` to prevent lengthy messages and paths from producing horizontal overflow.
- Fixed the completed-run stop-result branch in `src/main.tsx` to strip both `failures` and `errorLocation` when converting a result to `stopped`.

## Validation

Ran `npm test && npm run build` successfully.

- Tests: 74 passed, 0 failed.
- Build: TypeScript project build and Vite production build completed successfully.

The initial sandboxed test run could not start the recorder test's local `127.0.0.1` listener (`EPERM`). Re-running the required command with local-listener permission passed fully; this is an environment limitation, not a product failure.

## Commit

- `88237c2 feat: show failed steps in test report`

## Scope and concerns

- Only `src/main.tsx` and `src/styles.css` were committed for Task 2.
- No UI-level browser test was added because the repository test suite covers the runner data normalization, while this task is a narrow presentation-layer addition. The TypeScript/Vite build confirms the new markup and types compile.
- No additional focused test was added for the stop-result branch because it is an internal async UI seam; the existing stopped-run normalization coverage remains in `tests/runner.test.mjs`.
- Pre-existing unrelated modified and untracked files were left untouched.
