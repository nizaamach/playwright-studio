# Run Test — Headed/Headless Option

## Goal

Allow users to choose whether `Run Test` opens a visible Playwright browser or runs in the background.

## User experience

- Add a `Show browser` toggle to the existing Run Test panel.
- The toggle is enabled by default so debugging runs are visible.
- When enabled, the selected test runs with a visible Chromium window.
- When disabled, the test runs headless as it does today.
- `Stop` continues to terminate the active test process and its browser.

## Architecture

The React UI stores the toggle state locally and includes it as `headed` in the existing runner request. The preload bridge forwards the request unchanged to Electron. The Electron runner translates the option into Playwright CLI behavior: `--headed` when `headed` is true, and no headed flag when false. The existing run status, logs, errors, and result handling remain unchanged.

The option applies only to the current run and does not modify the saved project or test files.

## Error handling

- If the visible browser cannot launch, the existing runner error panel displays the failure and keeps the editor usable.
- Stopping a run must use the existing process termination path.
- Missing or invalid `headed` values default to headless at the runner boundary for safe non-interactive execution.

## Testing

- Verify the runner command includes `--headed` when requested.
- Verify the runner command omits `--headed` for headless runs.
- Verify the UI sends the selected option without changing the generated test source.
- Keep the existing runner, UI, and build tests passing.

## Scope

This change does not add persistent preferences, browser selection beyond the existing Playwright project configuration, video recording, or a separate preview window.
