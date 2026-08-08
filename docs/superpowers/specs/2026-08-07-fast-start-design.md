# Fast Start Layer — Design Spec

Status: Implemented
Date: 2026-08-07

## Goal

Reduce the time from creating a Playwright Studio project to having a usable end-to-end test ready for export. The benchmark is a simple login flow with an assertion in two minutes or less.

## Benchmark

The primary Fast Start benchmark is a simple end-to-end login flow completed in two minutes or less:

`New project → New Test → enter URL → Record → login actions → dashboard assertion → Stop → export .spec.ts`

Project creation keeps the current flow. After creation, Studio opens an empty `New Test` with `Record` visible so the user can begin immediately.

## User Flow

1. User creates a project using the current project creation flow.
2. Studio automatically creates and selects an empty `New Test`.
3. The builder displays the `Record` action immediately.
4. The user must enter a URL before recording can start; no default URL is used.
5. The recorder captures the browser flow and appends steps immediately when stopped.
6. A non-blocking summary reports the captured step count and action types.
7. The test name is suggested from the hostname and remains editable.
8. The user may select `Use template` and choose Login, Checkout, Search, or Form submission.
9. Generated TypeScript remains the source handoff and can be saved or exported.

The recording URL is mandatory and has no default value. Invalid or blank URLs keep `Record` disabled and show an actionable inline validation message. When recording stops, captured steps are appended immediately; the summary is informational and does not add a confirmation step.

## Design Decisions

### Templates

The empty `New Test` remains the default. A `Use template` action opens a compact picker. Templates are ordinary `Step[]` values and do not introduce a new persistence format.

The picker provides four starter flows: `Login`, `Checkout`, `Search`, and `Form submission`. Applying a template replaces the current unsaved step list only after the user explicitly selects the template; if steps would be lost, Studio asks for confirmation.

### Locator quality

Each target step receives a visual quality status: `Stable`, `Acceptable`, or `Fragile`. The status is advisory and must not block saving. When a stronger locator recommendation exists, Studio displays it and only changes the step after the user clicks `Apply`.

`Stable` covers semantic strategies such as role, label, test ID, and placeholder. `Acceptable` covers text locators. `Fragile` covers CSS, XPath, or missing locators. Applying a recommendation updates only the selected step and never changes locators silently.

### Keyboard shortcuts

- `Ctrl/Cmd + N`: create/select a new test
- `Ctrl/Cmd + R`: start recording
- `Ctrl/Cmd + S`: save the active test
- `Ctrl/Cmd + E`: export TypeScript

Shortcuts are ignored while focus is inside an input, textarea, select, or contenteditable element. Browser-native shortcuts remain undisturbed when a shortcut cannot be handled.

### Recording summary

After Stop, Studio shows a non-blocking summary with the number of captured steps and action labels, for example: `4 steps captured · Navigate, Fill, Click, Assert`. The captured steps are already appended when this feedback appears.

## Components and Boundaries

- `templates.ts`: deterministic starter templates returning normal `Step` values.
- `locatorQuality.ts`: pure quality classification and recommendation helpers.
- `main.tsx`: Fast Start actions, URL validation, hostname naming, recording summary, and shortcut wiring.
- `styles.css`: template picker, quality badges, summary feedback, and shortcut affordances.
- Existing recorder IPC and generator remain unchanged unless a small compatibility adjustment is required.

## Validation and Failure Handling

- Empty or invalid URL prevents recording and shows an inline actionable message.
- A recorder error clears only the temporary recording buffer and shows the existing error state.
- A recording summary is informational; it does not interrupt the append flow.
- Template application replaces the current unsaved step list only after explicit user selection.
- Applying a locator recommendation updates only the selected step.

## Testing

- Unit tests for all four starter templates.
- Unit tests for URL validation and hostname-based naming.
- Unit tests for locator quality classification and recommendation application data.
- UI tests for shortcut guards and actions where the current test harness supports them.
- Existing generator, project management, and recorder tests must continue to pass.
- Production build must pass.

## Out of Scope

- Test Runner, API testing, cloud execution, two-way code synchronization, and advanced recorder events.
- Automatic locator replacement without user confirmation.
- A new project wizard or additional mandatory project configuration.
