# Recording Cockpit Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Playwright Studio workspace hierarchy so Record is the primary hero feature while preserving all existing workflows and IPC behavior.

**Architecture:** Keep the existing React state and event handlers in `src/main.tsx`, but reorganize the recorder markup into a dedicated hero composition with explicit idle, recording, stopping, and error visual states. Use the existing CSS-variable theme system in `src/styles.css` to restyle the full shell, with CSS-only state transitions and responsive collapse.

**Tech Stack:** React, TypeScript, native CSS, Vite, Electron, Node test runner.

## Global Constraints

- Keep the existing dark-first shell and lime accent as the single brand accent.
- Preserve all current recorder, project, test, report, code, theme, and IPC functionality.
- Do not change button intent, project paths, test data, or IPC behavior.
- The hero must keep the main CTA visible in the initial workspace viewport.
- Use only transform/opacity motion and honor `prefers-reduced-motion: reduce`.
- Preserve accessible labels, focus rings, URL validation semantics, and WCAG AA contrast.
- Avoid decorative gradients, fake screenshots, scroll listeners, cursor replacement, and perpetual decorative animation.

---

### Task 1: Build the Recording cockpit markup

**Files:**
- Modify: `src/main.tsx:387-415`
- Test: `tests/main.test.mjs` if an existing UI-helper seam is available; otherwise verify through TypeScript build and manual state inspection.

**Interfaces:**
- Consumes existing state: `recorderState`, `recordedSteps`, `recordUrl`, `recordUrlError`, `canRecord`, `startRecording`, `stopRecording`, and `window.studio`.
- Produces a stable `.recording-hero` structure with `.recording-hero-copy`, `.recording-hero-form`, `.recording-hero-status`, and state classes for `idle`, `recording`, `stopping`, and `error`.

- [ ] **Step 1: Capture current behavior constraints**

Before editing, verify the existing handlers still own behavior: `startRecording` starts the recorder, `stopRecording` finalizes captured steps, and URL validation remains wired through `aria-invalid` and `aria-describedby`. Do not duplicate these handlers in the new markup.

- [ ] **Step 2: Replace the recorder toolbar markup with the hero structure**

Keep the existing conditional behavior, but render a structure equivalent to:

```tsx
<section className={`recording-hero recording-hero-${recorderState}`} aria-labelledby="recording-hero-title">
  <div className="recording-hero-copy">
    <div className="eyebrow">BROWSER RECORDER</div>
    <h1 id="recording-hero-title">Turn browser actions into tests.</h1>
    <p>Start from a URL, interact with the page, and keep every useful step.</p>
    <div className="recording-hero-form">
      {/* Keep the existing input, aria attributes, helper, and Record/Stop handlers. */}
    </div>
  </div>
  <div className="recording-hero-status" aria-live="polite">
    <span className="recording-status-orbit" aria-hidden="true" />
    <strong>{recorderState === 'recording' ? 'Recording browser actions' : recorderState === 'stopping' ? 'Finishing capture' : 'Ready to record'}</strong>
    <span>{recorderState === 'recording' ? `${recordedSteps.length} steps captured` : 'Chromium session will open when you start.'}</span>
  </div>
</section>
```

Use the current `record-start` controls inside `.recording-hero-form` so validation and button disabling remain identical. Keep the existing stop button in the same form area when recording or stopping.

- [ ] **Step 3: Add explicit state data for visual styling**

Apply exactly one state class based on `recorderState`. Ensure error state keeps the hero visible and displays `recorderMessage` below the hero as it does today. Do not use a new React state variable when the existing recorder state already represents the condition.

- [ ] **Step 4: Build to catch markup and type regressions**

Run: `npm run build`

Expected: TypeScript and Vite build pass.

- [ ] **Step 5: Commit**

```bash
git add src/main.tsx
git commit -m "feat: make recording the primary workspace hero"
```

### Task 2: Restyle the complete workspace around the hero

**Files:**
- Modify: `src/styles.css:1-330`

**Interfaces:**
- Consumes the stable markup from Task 1 and existing theme selectors.
- Produces the dark cockpit visual system, responsive hero collapse, state motion, and calmer secondary surfaces without changing behavior.

- [ ] **Step 1: Establish tokens and shell hierarchy**

Keep the lime token as the only accent. Tune surface, line, text, and muted tokens for stronger contrast. Keep one compact radius scale for cards and controls, with pills only for the existing toggle/status controls.

- [ ] **Step 2: Style the new recording hero**

Implement an asymmetric split layout with the copy and form on the left and the live status surface on the right. Make the hero the strongest surface using border contrast, spacing, and tonal depth rather than a decorative gradient. The primary Record button must have readable contrast and remain one line at desktop width.

- [ ] **Step 3: Implement recorder state styling and motivated motion**

Use state classes for idle, recording, stopping, and error. The recording status indicator may pulse only while recording; status changes may transition opacity/transform. Add a reduced-motion override that disables the pulse and transitions.

- [ ] **Step 4: Rebalance secondary surfaces**

Quiet the sidebar, builder header, run report, and code panel so they support the hero. Preserve report failure styling, Show browser control, step cards, and light-theme selectors. Avoid adding repeated card grids or decorative eyebrows to every section.

- [ ] **Step 5: Add responsive collapse and overflow protection**

At the existing compact breakpoint, collapse the hero to one column, make the form controls full-width, and keep the workspace free of horizontal overflow. Preserve the existing minimum desktop layout behavior.

- [ ] **Step 6: Build and commit**

Run: `npm run build`

Expected: production build passes.

```bash
git add src/styles.css
git commit -m "style: redesign workspace as recording cockpit"
```

### Task 3: Verify all recorder states and theme/accessibility behavior

**Files:**
- No source changes expected unless verification exposes a concrete regression.

- [ ] **Step 1: Run the complete automated suite**

Run: `npm test && npm run build`

Expected: all tests pass and production build succeeds. If the recorder test cannot bind localhost inside the sandbox, rerun with the required local-listener permission.

- [ ] **Step 2: Inspect the desktop app in both themes**

Run: `env -u ELECTRON_RUN_AS_NODE npm run dev` and inspect dark and light modes. Verify the hero remains readable and the lime accent remains consistent.

- [ ] **Step 3: Verify recorder state transitions**

Manually verify idle, recording, stopping, and error states. Confirm URL validation, Record/Stop controls, captured step count, recorder messages, and keyboard focus remain functional.

- [ ] **Step 4: Verify responsive layout**

Check the current minimum desktop width and a narrower window. Confirm the hero collapses to one column, the CTA stays visible, and no horizontal overflow appears.

- [ ] **Step 5: Push the v3 branch**

```bash
git push origin experimental/all-updates-v3
```

- [ ] **Step 6: Commit any final verification fix and report**

If a concrete issue is found, fix it in a focused commit, rerun the relevant checks, then report the final commit and branch. Otherwise report the two implementation commits, verification results, and the preserved unrelated worktree changes.
