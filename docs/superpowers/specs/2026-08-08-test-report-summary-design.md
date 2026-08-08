# Test Report Summary

## Goal

Show a concise report for the latest `Run Test` execution directly in the Playwright Studio runner panel.

## Report contents

After a run completes, render a `TEST REPORT` block containing:

- final status: Passed, Failed, or Stopped;
- duration;
- test count and passed/failed counts from Playwright JSON output;
- generated spec file path when available;
- the primary error and source location when the run fails;
- existing logs and screenshot/trace/video artifact controls.

Successful runs show `All tests passed`. Failed runs keep the actionable error visible. The report represents only the latest run and does not modify saved test files.

## Data flow

The Electron runner already returns Playwright's parsed JSON payload. Extend the typed normalized result with optional report summary fields, preserving raw output for diagnostics. The React RunPanel renders the summary from the normalized result and falls back safely when older or malformed runner payloads omit fields.

## Testing

- Normalize JSON with test counts, file path, and failure location.
- Normalize missing report fields without throwing.
- Keep existing runner and UI behavior unchanged.
- Verify the full test suite and production build.
