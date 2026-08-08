# Playwright Studio PRD

Status: Active MVP baseline  
Last updated: 2026-08-08  
Product type: Local desktop and browser-compatible authoring tool

## 1. Executive Summary

### Problem Statement

QA engineers who use Playwright still spend too much time translating browser behavior into selectors, test steps, and TypeScript files. Existing visual tools often hide the generated code or require a separate runner workflow.

### Proposed Solution

Playwright Studio is a local visual authoring tool that combines a step builder, browser recorder, locator helper, generated Playwright TypeScript, and direct `.spec.ts` export. The visual model remains the source of truth while the generated code remains readable, Git-compatible, and usable in VS Code or CI.

### Success Criteria

- A QA user can create a test with browser actions, save it, and export a runnable `.spec.ts` file without manually writing test code.
- Recorder MVP captures navigation, click, fill, select, checkbox/radio, and key press actions in event order.
- Generated code uses a supported Playwright locator strategy and preserves the selected action order.
- Saved visual test metadata can be reopened from the same project without losing steps.
- Existing Playwright `.spec.ts` files are discoverable for review without being editable or overwritten.
- Studio-managed tests can be renamed or deleted with their metadata and generated file kept in sync.
- Automated unit and recorder integration tests pass on every implementation change.
- The Fast Start benchmark completes a simple login flow from a newly created project to an exported `.spec.ts` in two minutes or less.

## 2. User Experience and Functionality

### User Personas

- QA engineer: builds repeatable end-to-end tests with minimal manual coding.
- QA automation engineer: reviews and adjusts generated TypeScript in VS Code.
- Small QA team: stores visual metadata and generated files in Git without a hosted service.

### Core User Flow

1. Open an existing Playwright project or create a new local project.
2. Review the project explorer, which separates Studio tests from existing read-only specs.
3. Create or select a Studio test case.
3. Add steps manually or start Browser Recorder.
4. Perform actions in controlled Chromium.
5. Stop recording and append captured steps to the active test.
6. Review and edit steps, locator strategies, assertions, and order.
7. Save the visual test metadata.
8. Rename or delete a Studio test when needed; both metadata and generated files follow the action.
9. Copy or export the generated `.spec.ts` file.
10. Run the exported file manually from VS Code, terminal, or CI.

### Fast Start benchmark flow

The optimized first-use path is:

`New project → automatically selected empty New Test → enter URL → Record → login flow → dashboard assertion → Stop → export .spec.ts`

The target is two minutes or less for this simple end-to-end flow. Project creation uses the existing flow; no additional mandatory configuration is introduced. The empty test and Record action are immediately available after creation.

### User Stories and Acceptance Criteria

#### Project management

As a QA engineer, I want to create or open a Playwright project so that my tests stay inside the project I already use.

- New projects contain Playwright configuration and `.playwright-studio/tests` metadata storage.
- Existing projects can be opened without changing their files until the user saves a Studio test.
- Browser mode provides a local fallback workspace using `localStorage`.
- Existing `.spec.ts` files under the configured `testDir` are listed as read-only source entries.
- Rename and delete are available only for Studio-managed tests and require explicit user action.
- Studio operations never modify existing user-authored source files.

#### Visual test builder

As a QA engineer, I want to compose actions visually so that I can build a test flow without starting from a blank code file.

- Supported actions include navigate, click, hover, focus, clear, press, fill, select, checkbox/radio, upload, assertion, wait, and screenshot.
- Steps can be reordered, duplicated, deleted, and edited.
- Incomplete steps show inline validation and prevent saving.
- Unsaved changes are visibly indicated.

#### Browser Recorder

As a QA engineer, I want to record a browser flow so that common actions become steps automatically.

- Recorder opens a controlled Chromium window with a starting URL.
- Recorder captures navigation, click, fill, select, checkbox/radio, and supported key presses.
- Locator selection prioritizes semantic locators, then test ID, CSS, and XPath fallback.
- Stop appends captured steps to the active test in order.
- Unexpected close or recorder failure discards the temporary session and leaves the active test unchanged.
- The recording URL is required, has no default, and must use `http:` or `https:`. Record remains unavailable until the URL is valid.
- After Stop, Studio immediately appends the steps and shows an informational recording summary with the count and action types; no confirmation interrupts the flow.
- A hostname-based test name is suggested when starting from the default untitled test.

#### Fast Start helpers

As a QA engineer, I want a starting point and clear locator feedback so that I can reach a useful test quickly.

- `Use template` offers `Login`, `Checkout`, `Search`, and `Form submission`; the empty New Test remains the default.
- Applying a template replaces unsaved steps only after explicit selection and confirmation when needed.
- Locator quality is shown as `Stable`, `Acceptable`, or `Fragile`.
- Stable semantic locators include role, label, test ID, and placeholder; text is acceptable; CSS, XPath, and missing locators are fragile.
- When a stronger locator is available, Studio shows a recommendation. The locator changes only after the user clicks `Apply`.
- Keyboard shortcuts are available: `Ctrl/Cmd + N` New Test, `Ctrl/Cmd + R` Record, `Ctrl/Cmd + S` Save, and `Ctrl/Cmd + E` Export. Shortcuts are ignored in editable fields.

#### Authoring acceleration

As a QA engineer, I want reusable data, recovery, and navigation helpers so that I can move from a new project to a maintainable test quickly.

- Local variables use `{{name}}` tokens and are stored with the Studio test. The MVP supports local values only; CSV and JSON data sources are out of scope.
- Login, Checkout, Search, and Form submission templates open a compact configuration panel before application. The panel collects `baseUrl`, email, and password and creates ordinary steps that reference the resulting variables.
- Applying a template requires confirmation when it would replace unsaved steps. The empty `New Test` remains the default path.
- Undo and redo cover meaningful editor changes, including manual edits, recording, template application, duplicate, reorder, delete, clear, and locator changes. A new edit clears the redo history.
- A versioned local draft is saved to browser storage after meaningful edits. Drafts never write project files automatically. On return, the user can restore or discard a recoverable draft.
- Steps can be assigned to `Setup`, `Login`, `Action`, `Assertion`, or `Cleanup` groups. Grouping changes organization only and never changes generated step order.
- Step search matches type, locator, value, assertion, and group. Search and group filters affect the visible list only.
- Locator diagnostics report `0 matches`, `1 match`, or `2+ matches` when a controlled browser session is available. Diagnostics are advisory and never block saving.
- In browser mode, the UI explains that recording and locator diagnostics require Playwright Studio Desktop; manual editing, drafts, and export remain available.
- Project import safely reads static `baseURL`, `testDir`, and named browser projects from `playwright.config.ts` when available. Dynamic configuration falls back without executing user config.

#### Generated code and export

As an automation engineer, I want readable TypeScript output so that I can review, edit, and run it in existing Playwright workflows.

- Preview updates when steps or values change.
- Copy places the current code on the clipboard.
- Export downloads or saves a `.spec.ts` file using a sanitized test name.
- Generated code imports `test` and `expect` from `@playwright/test`.
- Locator output supports CSS, XPath, role, text, label, test ID, and placeholder strategies.

### Non-Goals

- Local or cloud Test Runner in MVP.
- API testing.
- Hosted execution, accounts, roles, audit trails, or shared server state.
- Two-way synchronization from arbitrary hand-written code back into visual steps.
- Automatic assertions, popup/dialog/download flows, drag and drop, iframe, shadow DOM, and device emulation in Recorder MVP.

## 3. AI System Requirements

Not applicable. Playwright Studio MVP uses deterministic browser events and code generation rather than an AI decision layer.

## 4. Technical Specifications

### Architecture Overview

- Electron main process owns filesystem operations, Save As dialogs, and the controlled Playwright Chromium session.
- Preload exposes a narrow IPC API to the React renderer with context isolation enabled.
- React owns visual builder state, temporary recorder steps, validation, preview, and browser fallback storage.
- TypeScript models define `Project`, `TestCase`, `Step`, `StepType`, and `LocatorType`.
- Generator converts ordered steps into deterministic Playwright TypeScript.

### Storage Contract

Project metadata is stored under `.playwright-studio/`:

- `project.json` stores project metadata.
- `tests/<test-id>.steps.json` stores the visual source of truth.
- `tests/<test-id>.spec.ts` stores generated code.

When a project is opened in Electron, `testDir` is read from `playwright.config.ts` when present. Existing `.spec.ts` files below that directory are shown in the explorer with a stable derived identity and are treated as read-only. Studio test IDs remain stable during rename; rename updates the metadata title and generated test title, while delete removes the matching Studio pair only.

Browser-only mode stores the equivalent project state under the `playwright-studio-web-project` local storage key.

Local drafts use a separate versioned browser-storage key and are scoped to the active project and test. A draft is temporary editor state, not a replacement for `.steps.json`; explicit Save remains the only action that writes Studio metadata and generated TypeScript to the project.

### Integration Points

- Electron IPC for project selection, project creation, save, export, recorder start, recorder events, recorder stop, and recorder errors.
- Playwright Chromium for recorder capture.
- Local filesystem for Git-compatible project artifacts.
- Clipboard and browser download APIs for code handoff.

### Security and Privacy

- No cloud upload, analytics, or account system in MVP.
- Recorder only observes the controlled Chromium session opened by the app.
- Renderer does not receive unrestricted Node.js access.
- User project files are not modified during import or recording.
- Save and export are explicit user actions.

## 5. Risks and Roadmap

### Phased Rollout

#### MVP current

- Visual builder and validation.
- Locator strategies and XPath support.
- Browser Recorder for common actions.
- Save metadata, generated preview, copy, and `.spec.ts` export.
- Browser fallback workspace.

#### v1.1

- Deeper existing-project import with `playwright.config.ts` detection.
- Test rename, delete, and project test explorer improvements. **Implemented in current baseline.**
- Undo/redo, draft recovery, step grouping, and action search. **Implemented in current baseline.**
- Configurable starter templates and local variables. **Implemented in current baseline.**
- Locator match diagnostics and browser-mode guidance. **Implemented in current baseline.**
- Static project context import for `baseURL`, `testDir`, and named browser projects. **Implemented in current baseline.**

#### v2.0

- CSV/JSON data-driven sources.
- Optional local Test Runner with screenshots and traces.
- Advanced recorder events such as popup, dialog, download, upload, iframe, and drag and drop.
- CI configuration helpers.

### Technical Risks

- Browser recorder behavior can vary across websites and dynamic DOMs.
- Semantic locator ranking may select a locator that is valid but not unique.
- Chromium distribution increases application size and packaging complexity.
- Generated code can become stale if the visual metadata and external `.spec.ts` file are edited independently.
- Browser local storage fallback is useful for demos but is not a replacement for Git-backed project storage.
