# Playwright UI — All Updates Experiment

## Goal

Provide an isolated experimental version of Playwright UI that adds the requested authoring and execution capabilities while preserving the current version as the rollback baseline.

## Isolation and rollback

The current project remains unchanged as the baseline. The experiment is developed in a separate working copy/checkpoint. Features are grouped behind a single experiment configuration so each group can be disabled independently. Existing tests, stored projects, and the current step format remain readable.

Because the current mirror is not an independent Git repository (its Git root is the user home directory and contains unrelated changes), the agent must not create or switch a home-level branch. Rollback should use a project-local experimental copy or an explicitly supplied repository branch.

## Existing capabilities to preserve

The baseline already includes recording, project/test management, step editing and reordering, locator diagnostics, code generation/export, templates, variables, draft autosave, undo/redo, search/filtering, and assertion step types. New work must extend these capabilities rather than duplicate them.

## Feature scope

### 1. Test runner

Add a local Electron bridge that runs the selected generated Playwright test, reports queued/running/pass/fail states, duration, stdout/stderr, and a normalized error summary. The UI exposes Run, Stop, and rerun actions. A failed run must not overwrite the edited test.

### 2. Result artifacts

When available, expose the latest screenshot and trace path from the run. Artifact collection is best-effort; missing artifacts show a clear empty state instead of failing the editor. Video recording is deferred to a later phase.

### 3. Assertion builder

Expand the existing assertion step editor with guided fields for URL, text, value, title, attribute, count, and visibility. Each assertion maps to the existing `Step` model and generator. Invalid combinations are blocked before save or run.

### 4. Code preview

Show generated code beside the step editor with refresh-on-edit, copy, and export actions. The preview is read-only and remains consistent with the same generator used by the runner.

### 5. Locator assistance

Add a selector picker for recorded or manually entered targets and show locator-quality recommendations. The user can accept a recommendation without losing the original selector.

### 6. Import

Support a constrained import of common Playwright `.spec.ts` patterns: `goto`, locator actions, fills, checks, selects, assertions, waits, and screenshots. Unsupported statements are reported with line numbers and preserved as warnings.

### 7. Test organization

Add search, tags, and folders/collections in the project view. Existing test IDs and paths remain stable when tests are reorganized.

### 8. Environment and data

Add project base URL, named environments, and test-data values. Generated code references the selected environment/data profile without storing secrets in test metadata.

## Data flow

The editor produces a `TestCase` and generated code. The runner receives the generated code plus selected environment values through the Electron preload bridge, executes it in a temporary run directory, and returns a result envelope with status, duration, logs, and artifact paths. The editor updates only run state; saving remains an explicit user action.

## Error handling

- Validation errors prevent save/run and identify the affected step.
- Runner failures are displayed as actionable summaries with expandable raw output.
- Import warnings do not discard successfully parsed steps.
- IPC failures return typed errors and leave the editor state intact.
- Artifact paths are validated before being opened.

## Testing

Add unit tests for assertion-to-code mapping, import parsing, environment substitution, result normalization, and feature-flag behavior. Add Electron bridge tests for run success, run failure, stop, missing artifacts, and malformed input. Keep existing generator, recorder, organizer, history, and project-management tests passing.

## Phasing

1. Runner bridge and result panel.
2. Assertion builder and code preview.
3. Locator assistance and import.
4. Organization, environments, and data profiles.
5. Hardening, regression tests, and rollback verification.

Video recording and a full TypeScript parser are explicitly deferred until these phases are stable.
