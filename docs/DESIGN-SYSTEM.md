# Playwright Studio Design System

Status: Active UI baseline  
Last updated: 2026-08-08

## Design Read

Playwright Studio is a desktop-first developer tool for QA engineers, with a dark-tech operator-console language, restrained motion, and a medium visual density that keeps the builder readable during long test authoring sessions.

Design dials: `DESIGN_VARIANCE 6`, `MOTION_INTENSITY 3`, `VISUAL_DENSITY 5`.

This system is a product UI adaptation of the selected anti-slop frontend taste. It is not a marketing landing page system.

## 1. Design Principles

### Readable before decorative

The test step, locator, and generated code are the primary content. Decoration must not compete with them.

### One strong accent

Acid lime identifies primary actions, selected navigation, focus, and successful state. Red and amber are reserved for semantic error and warning states.

### Tool-like surfaces

Use dark graphite surfaces, hairline borders, and compact spacing. Use elevation only when a panel or dialog needs separation.

### Visible state

Dirty, saved, recording, stopping, error, disabled, and empty states must be visible in context. Do not rely on color alone.

### Code is a first-class output

Generated TypeScript is not a secondary debug view. Its panel should remain stable, readable, and easy to copy or export.

## 2. Tokens

### Color

| Token | Value | Use |
|---|---|---|
| `--bg` | `#090c0e` | App background |
| `--surface` | `#0e1316` | Sidebar and code panel |
| `--surface-raised` | `#141b1f` | Buttons and raised controls |
| `--surface-soft` | `#192126` | Hover and selected support surface |
| `--line` | `#263238` | Default borders and separators |
| `--line-strong` | `#35434a` | Hover and emphasized borders |
| `--text` | `#e9eee9` | Primary text |
| `--muted` | `#829096` | Labels and helper text |
| `--quiet` | `#5c6b71` | Metadata and low-priority text |
| `--accent` | `#c9ff68` | Primary action, focus, selected state |
| `--accent-ink` | `#11180b` | Text on accent controls |
| `--danger` | `#ff988f` | Validation and recorder errors |
| `--warning` | `#f2ca61` | Unsaved and stopping states |

Do not introduce a second decorative accent. Semantic danger and warning colors are allowed only when they communicate actual state.

### Typography

- UI: system sans stack for native desktop readability.
- Metadata, labels, locators, generated code, and status: system monospace stack.
- Page title: 24px, weight 700, tight tracking.
- UI body: 11-13px.
- Metadata labels: 9-10px, uppercase, letter spacing between `.1em` and `.18em`.
- Generated code: 11px with 1.8 line height.

### Shape and spacing

- Default radius: 6px.
- Use the same radius for buttons, inputs, step cards, and recorder panels.
- Base spacing unit: 4px.
- Standard gaps: 5px, 7px, 10px, 12px, 16px, 20px, 24px, 32px.
- Avoid pill controls except for compact status badges where the shape carries meaning.

## 3. Layout

### Desktop shell

The desktop layout uses three functional zones:

1. Left rail, 230px: project explorer and test navigation.
2. Center builder, flexible width: test title, recorder, ordered steps, and action palette.
3. Right code panel, 390px: generated TypeScript and output actions.

At narrower browser widths, the code panel moves below the builder and the app uses a two-column layout with a reduced sidebar.

### Information hierarchy

- Top bar: product identity, project context, and project actions.
- Project explorer: test name, source category, and a clear `read-only` marker for existing specs.
- Builder header: current test identity, editable actions, and save action.
- Recorder bar: high-value workflow action, visually separated with one accent edge.
- Step card: order number, step type, compact controls, then labeled fields.
- Code panel: output context first, code second, copy/export controls at the top right.

## 4. Components

### Buttons

- Primary: acid lime fill with dark text. Use for Save and Export.
- Secondary: graphite fill with line border. Use for New and Open project.
- Ghost: transparent with line or text emphasis. Use for Clear and step controls.
- Destructive: transparent or low-emphasis until the action is explicit. Use danger color only for delete hover or error feedback.
- Interaction: use border and background change on hover, 1px downward movement on active, and a visible focus ring.

### Inputs and selects

- Labels sit above controls.
- Placeholder text is a hint, never the only label.
- Background uses `#0a1012` against the surrounding surface.
- Focus uses the accent outline and border.
- Errors appear below the field or at the bottom of the step card.

### Step card

- Use a two-column structure: fixed order gutter and flexible content.
- The order gutter is quieter than the content but remains visible.
- Controls use icon-like text buttons with accessible `aria-label` and `title`.
- Error cards use a semantic danger border, not a full red fill.

### Recorder bar

- Always show the current recorder state in text.
- Start state includes a labeled URL field and Record action.
- The URL field is required, has no default, and shows an inline actionable error for blank or invalid values. Record stays disabled until valid.
- Recording state shows captured step count and Stop action.
- Stopping appends steps immediately and shows a compact informational summary with count and action labels.
- Failure state shows a contextual error and clears the temporary session.

### Fast Start surfaces

- After project creation, open an empty `New Test` and keep `Record` visible as the primary next action.
- `Use template` opens a compact picker for Login, Checkout, Search, and Form submission. Keep the empty test as the default path.
- If applying a template would replace unsaved steps, require an explicit confirmation before changing the step list.
- Suggest a hostname-based test name only for the default untitled test; keep the field editable.

### Template configuration and variables

- `Use template` opens a compact configuration surface for `baseUrl`, email, and password before steps are created.
- Show the template name, a short flow preview, required fields, and a clear `Apply template` action.
- Required fields use inline validation; do not apply a partially configured template.
- Represent local data as `{{name}}` tokens in the step editor. Keep variable names visually distinct from literal values without making the editor feel like a code editor.
- Never reveal passwords in a summary or status message. The configured value may be used by generated code according to the existing project workflow, but UI feedback should use a masked value.

### Undo, redo, and draft recovery

- Place Undo and Redo beside the builder editing controls, with disabled states that communicate history boundaries.
- Show concise status feedback such as `Draft saved`, `Draft restored`, or `Draft discarded`; do not interrupt the authoring flow for every auto-save.
- Recovery is a decision surface, not a modal trap. Present the draft timestamp and test name, with explicit `Restore draft` and `Discard` actions.
- Draft status must not imply that project files were saved. Keep `Save test` as the distinct filesystem action.

### Step organization and search

- Group selection belongs on each editable step and uses the fixed vocabulary `Setup`, `Login`, `Action`, `Assertion`, and `Cleanup`.
- Search is a compact builder utility. Its helper text should state that it searches action type, locator, value, assertion, and group.
- Filtering must preserve step numbers and generated order. Empty results explain how to clear the search or group filter.

### Locator diagnostics

- Show diagnostics inline on the step card near the locator field.
- Use text plus semantic status styling: `0 matches` (error), `1 match` (stable), `2+ matches` (warning), and `Unavailable` (session not available).
- Diagnostic status is advisory. Never style the Save action as disabled solely because a locator has zero or multiple matches.
- Keep `Apply` explicit for any stronger locator recommendation; diagnostics must not silently rewrite a user's selector.

### Project context and browser mode

- Show detected `baseURL`, `testDir`, and named browser projects as quiet project metadata in the header or explorer.
- If static config values are unavailable, use a compact `Project context unavailable` message and preserve the rest of the workspace.
- In browser mode, show `Requires Playwright Studio Desktop` in the Record and locator diagnostic areas. Explain the limitation without hiding manual builder, draft, or export actions.

### Locator quality

- Show both the level label and its meaning; never communicate quality by color alone.
- `Stable`: role, label, test ID, or placeholder.
- `Acceptable`: text locator.
- `Fragile`: CSS, XPath, or missing locator.
- A stronger locator recommendation is an inline affordance on the step card. The `Apply` action must be explicit, update only that step, and never silently replace the user's locator.

### Shortcut affordances

- Show shortcut hints near the related actions: `⌘/Ctrl N`, `⌘/Ctrl R`, `⌘/Ctrl S`, and `⌘/Ctrl E`.
- Hints are secondary metadata and must not compete with the action label.
- Shortcuts are inactive while focus is in an input, textarea, select, or contenteditable region.

### Project explorer

- Studio-managed tests use the normal selected/dirty treatment.
- Existing Playwright specs use a quiet `read-only` marker and remain selectable for source review.
- Rename and delete controls are available only for Studio-managed tests.
- Destructive delete requires confirmation and should mention that both metadata and generated TypeScript are removed.

### Read-only source view

- Show a compact notice explaining that source editing happens in VS Code.
- Preserve the original `.spec.ts` text in the code panel; never regenerate it from an empty visual step list.
- Copy and export remain available as handoff actions.

### Code panel

- Keep code in a monospace face with generous line height.
- Use a hairline left edge instead of a heavy shadow.
- Copy and Export are separate actions with clear labels.

## 5. States and Accessibility

- Keyboard focus must be visible on every interactive control.
- Button text must meet WCAG AA contrast against its background.
- Error text must not rely on color alone; use the `!` prefix and contextual message.
- Disabled Save communicates why it is unavailable through inline validation on the step.
- Empty project and empty step states explain the next action.
- Reduced-motion mode disables transitions beyond near-instant feedback.
- The app remains usable without recorder access. Manual builder and export must continue to work.

## 6. Motion Rules

Motion intensity is intentionally low. Motion communicates feedback only:

- Button active state confirms a click.
- Hover state confirms an interactive target.
- Recorder state changes update text and controls.
- No perpetual animation, scroll hijacking, or decorative motion.
- All transitions must degrade under `prefers-reduced-motion: reduce`.

## 7. Content and Voice

- Use direct functional labels: `Save test`, `Open project`, `Record`, `Stop recording`, `Export .ts`.
- Avoid marketing language inside the product.
- Keep error messages actionable: `URL is required`, `Locator is required`, `Recorder browser was closed before recording stopped.`
- Use one language consistently within a surface. Current product UI uses English technical labels.

## 8. Implementation Guardrails

- Keep tokens in `src/styles.css` as CSS custom properties.
- Preserve the three-zone layout unless a product requirement changes.
- Do not add gradients, decorative glows, or extra accent colors without a documented semantic reason.
- Do not replace generated code with a fake preview. The visible output must remain real generated TypeScript.
- Keep component behavior and style changes independently testable where practical.
