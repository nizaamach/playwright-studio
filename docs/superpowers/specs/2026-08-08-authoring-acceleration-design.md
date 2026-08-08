# Authoring Acceleration — Design Spec

Status: Approved design, implemented
Date: 2026-08-08

## Goal

Make Playwright Studio faster and safer for creating end-to-end tests by adding local variables, configurable templates, undo/redo, draft recovery, locator diagnostics, step organization, search, and stronger project context.

## Product Flow

1. User creates or opens a project and receives an empty selected test.
2. User chooses `Use template`.
3. Studio opens a compact configuration panel for `baseUrl`, email, and password.
4. Applying the template creates ordinary Step values using local variables such as `{{baseUrl}}` and `{{email}}`.
5. User edits steps, records more actions, or adds assertions.
6. Every step edit is undoable and redoable.
7. Draft state is saved to localStorage without writing project files.
8. When returning to the app, the user can restore or discard the draft.
9. Locator diagnostics show match counts when a controlled browser session is available.
10. Search/filter and step groups keep longer tests navigable.

## Decisions

### Local variables

The MVP supports only a local variable map stored with the Studio test metadata. Variables use `{{name}}` syntax and are resolved in generated code through a `testData` object. CSV and JSON data sources remain out of scope.

Variable tokens remain visible when a value is missing; unresolved tokens are never silently replaced with an empty string. Generated declarations are deterministic so the same test metadata produces stable TypeScript.

### Template configuration

Templates require a small configuration panel before application. The panel collects `baseUrl`, email, and password. Values are stored as variables rather than silently embedded into multiple steps. The user can still edit the resulting steps manually.

The empty `New Test` remains the default. `Use template` offers Login, Checkout, Search, and Form submission. Applying a template that would replace unsaved steps requires explicit confirmation.

### Undo/redo

Undo/redo uses an in-memory history of immutable editor snapshots. A snapshot contains the selected test and relevant editor state. New edits clear the redo stack. Selecting another test starts a fresh history boundary.

### Draft recovery

Drafts are stored in localStorage under a versioned key. Draft persistence is renderer-only and does not modify the project directory. On startup, a recoverable draft offers `Restore draft` and `Discard`.

Malformed or unsupported drafts are discarded safely without affecting project files. Auto-save feedback is informational and distinct from an explicit project save.

### Locator diagnostics

When the controlled browser is available, the renderer requests a locator match count through a narrow IPC operation. Results are advisory: zero matches is an error, one match is stable, and multiple matches is a warning. Save is never blocked solely by match count.

When no Electron recorder session is available, the result is `Unavailable` and the UI explains that diagnostics require Playwright Studio Desktop. A locator recommendation is only applied after the user explicitly selects `Apply`.

### Organization and context

Steps may be assigned to one of `Setup`, `Login`, `Action`, `Assertion`, or `Cleanup`. Search filters steps by type, locator, value, assertion, and group. Project import displays detected `baseURL`, test directory, and configured browser projects when available.

Search and grouping are presentation concerns: they do not reorder the underlying steps or generated code. Static project context extraction never executes a user's Playwright config and falls back safely for dynamic values.

### Implementation status

All authoring-acceleration features in this specification are implemented in the current baseline: local variables, configurable templates, undo/redo, draft recovery, grouping and search, locator diagnostics, browser-mode guidance, and project context import.

## Boundaries

- `src/templates.ts`: configurable template definitions and Step generation.
- `src/variables.ts`: variable model, token replacement, and generated-code data declarations.
- `src/history.ts`: pure undo/redo stack operations.
- `src/drafts.ts`: versioned draft serialization and recovery helpers.
- `src/main.tsx`: editor orchestration and UI state.
- `electron/project.cjs`: safe config metadata extraction.
- `electron/main.cjs` and `electron/preload.cjs`: narrow locator diagnostic IPC.
- `src/styles.css`: panels, groups, search, diagnostics, and recovery states.

## Failure Handling

- Invalid template configuration blocks Apply with inline messages.
- Missing variable values are shown as unresolved tokens and do not silently become empty strings.
- Draft parse/version errors discard only the invalid draft and leave project files untouched.
- Locator diagnostic failures show `Unavailable` and leave manual editing available.
- Browser-mode users see that recording and diagnostics require the desktop app.
- Existing `.spec.ts` files remain read-only.

## Testing

- Unit tests for template configuration, variable replacement, history, and draft versioning.
- Unit tests for step grouping and search matching.
- Integration tests for project config extraction and locator diagnostic failure handling.
- Electron E2E smoke tests for template configuration, undo/redo, restore/discard, search, and browser-mode messaging.
- Existing generator, recorder, project-management, and Fast Start tests remain green.
- Production build and `sources/` read-only check remain required.

## Out of Scope

- CSV/JSON data-driven testing.
- Test Runner, API testing, cloud execution, and advanced recorder events.
- Two-way synchronization from arbitrary hand-written source code.
