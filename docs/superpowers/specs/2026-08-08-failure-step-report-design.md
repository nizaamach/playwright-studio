# Failure Step Details in Test Report

## Goal

When a Playwright test run fails, the Test Report must explain which test step failed and why. The existing summary for status, duration, counts, file, logs, and artifacts remains available.

## Design

### Runner normalization

Extend the normalized `RunReport` with an optional `failures` array. Each failure contains:

- `title`: the Playwright test or step title;
- `message`: the primary assertion or runtime error message;
- optional `location`: file, line, and column when Playwright reports them.

Parse the standard Playwright JSON hierarchy (`suites`, `specs`, `tests`, `results`, `errors`). Flatten failures in report order. Prefer nested error messages when the top-level error is only a wrapper. Ignore malformed entries safely and retain the existing generic run error fallback.

### Report UI

When `failures` is non-empty, render a `Failed steps` section inside Test Report. Each item shows the title, the reason, and the source location when available. Long messages and paths wrap instead of being truncated. Passed runs keep the existing compact success presentation.

### Compatibility and edge cases

- Existing report counts and status behavior are unchanged.
- Missing or malformed failure data must not break a run result.
- A failure without a title uses the test file or `Unknown step` as a readable fallback.
- A failure without a location omits the location line.
- Stopped runs do not invent failure details from incomplete output.

### Testing

Add unit coverage for one failure, multiple failures, nested errors, missing locations, malformed failure entries, and a passing run with no failure details. Run the complete test suite and production build.
