# Recording Cockpit Visual Redesign

## Design read

Full visual overhaul of the Playwright desktop workspace for technical QA users. The product keeps a dark tool identity, but the hierarchy becomes more confident and editorial, with Record as the primary product moment.

Design dials: `DESIGN_VARIANCE 8`, `MOTION_INTENSITY 6`, `VISUAL_DENSITY 4`.

## Goals

- Make Record the first and clearest action in the workspace.
- Make the active recorder state feel tangible without adding distracting animation.
- Reduce the visual weight of secondary panels while preserving existing workflows.
- Keep all current recorder, project, test, report, code, and theme functionality intact.

## Visual system

- Dark-first palette using the existing lime accent as the single brand accent.
- Red remains reserved for errors and amber for warnings.
- One consistent compact radius system, with pill controls reserved for toggles/status controls.
- Sans display typography with a monospace utility layer for paths, statuses, and test metadata.
- Use borders, spacing, and tonal surfaces for hierarchy. Avoid decorative gradients, fake screenshots, and ornamental dashboard cards.

## Layout

### Header

Condense the topbar into a compact product header. Keep brand, project name, project context, New/Open project, Open folder, and theme toggle available without wrapping at desktop widths.

### Recording hero

Replace the current equal-weight recorder toolbar with a split hero:

- Left side: a short headline, one-sentence explanation, starting URL field, helper/error text, and the primary Record button.
- Right side: a live recorder state surface showing browser readiness, captured step count, and a restrained activity indicator.
- Idle state emphasizes readiness and the Record action.
- Recording state emphasizes captured steps and Stop recording.
- Stopping state keeps the same geometry and swaps only status copy and control state.
- Error state preserves the input and presents the error inline without collapsing the hero.

The hero must fit in the initial workspace viewport, keep the main CTA visible, and collapse to one column below the desktop workspace width.

### Workspace surfaces

- Project Explorer becomes a quieter navigation rail with clearer active/recent hierarchy.
- Test Builder becomes the primary editing surface below the hero.
- Report and Generated Code retain their functionality but use stronger section labels and calmer surface treatment.
- Existing Report failure details, browser toggle, step filters, and artifacts remain accessible.

## Interaction and motion

- Record and Stop use clear pressed/disabled states.
- Status changes animate opacity/transform only, with a short transition that communicates state change.
- The activity indicator is semantic and stops when not recording.
- All motion is disabled or reduced under `prefers-reduced-motion: reduce`.
- No scroll listeners, cursor replacement, or perpetual decorative motion.

## Responsive and accessibility requirements

- Preserve keyboard focus rings and accessible labels.
- The URL field keeps a label/helper relationship and exposes validation through `aria-invalid` and `aria-describedby`.
- The hero becomes a single-column flow below the desktop layout breakpoint.
- Primary and destructive controls maintain WCAG AA contrast.
- Do not change existing button intent, project paths, test data, or IPC behavior.

## Verification

- Run existing test suite and production build.
- Inspect the desktop app in dark and light themes.
- Verify idle, recording, stopping, and error recorder states.
- Verify the hero remains usable at the current minimum desktop width and collapses without horizontal overflow.
