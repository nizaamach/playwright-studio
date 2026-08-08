# Design System: Playwright Studio V2 Code Workspace

## 1. Visual Theme & Atmosphere

A dense, calm developer workstation inspired by GitHub Dark and modern code editors. The interface is technical without feeling cold: graphite surfaces create focus, familiar syntax colors make generated TypeScript scan instantly, and a single acid-lime accent marks actions and active state. Density is 7/10, variance 4/10, and motion 3/10.

## 2. Color Palette & Roles

- **Graphite Canvas** (`#0D1117`) — primary application background.
- **Editor Surface** (`#161B22`) — sidebar, cards, and code panel.
- **Raised Surface** (`#1C2128`) — buttons and secondary controls.
- **Structural Border** (`#30363D`) — panel boundaries and inputs.
- **Primary Text** (`#E6EDF3`) — headings and active content.
- **Muted Text** (`#8B949E`) — labels, descriptions, and metadata.
- **Quiet Text** (`#6E7681`) — low-priority timestamps and line numbers.
- **Action Lime** (`#C9FF68`) — one accent for primary actions, focus, selected navigation, and success emphasis.
- **Keyword Red** (`#FF7B72`) — TypeScript keywords only.
- **String Blue** (`#A5D6FF`) — string literals and user-entered values.
- **Function Violet** (`#D2A8FF`) — function and method names inside code only; never use as a UI accent.
- **Number Blue** (`#79C0FF`) — numeric literals and language metadata.
- **Semantic Success** (`#3FB950`) — passed status only.
- **Semantic Warning** (`#D29922`) — unsaved or caution status only.
- **Semantic Danger** (`#F85149`) — destructive and failed status only.

Never use pure black, neon gradients, or a second decorative accent.

## 3. Typography Rules

- **UI:** Geist, with the native system sans fallback for desktop readability.
- **Code and metadata:** JetBrains Mono, falling back to SFMono-Regular and Consolas.
- **Title:** 21px, 700 weight, tight tracking.
- **UI body:** 13px with 1.45 line height.
- **Labels:** 10px uppercase monospace with `.10em`–`.14em` tracking.
- **Generated code:** 11px monospace with 1.82 line height.
- **Syntax:** red keywords, blue strings, lilac functions, and sky-blue numbers follow familiar editor conventions.

## 4. Component Stylings

- **Buttons:** 5px radius, graphite surfaces, 32px minimum height. Primary action uses Action Lime with dark ink. Active state moves down 1px; no glow.
- **Cards:** 6px radius and hairline borders. Elevation is communicated through surface contrast, not large shadows.
- **Inputs:** Labels sit above or beside fields. Fields use `#0A0F14`, monospace values, and a lime focus border.
- **Step cards:** Fixed order gutter plus flexible content. Locator quality is shown inline with text and a semantic dot.
- **Code panel:** Read-only generated output with line numbers, stable padding, and Copy/Export controls at the top.
- **Run state:** Compact status panel at the bottom of the code panel; never hide status behind color alone.

## 5. Layout Principles

Use a desktop-first three-zone shell: 230px project rail, flexible step builder, and 405px generated-code panel. Keep every element in its own spatial zone. Use CSS Grid for the shell and step structure. At widths below 1180px, move the code panel below the builder; never create horizontal scrolling.

## 6. Motion & Interaction

Keep motion restrained: 160–220ms transitions using a weighty ease-out, transform and opacity only. Buttons receive tactile press feedback. Lists may reveal with a short stagger, but the editor must remain stable during authoring.

## 7. Anti-Patterns

Never use emojis, Inter, generic serif fonts, pure black, neon glow, gradient text, floating labels, oversized marketing copy, decorative illustrations, equal three-column feature cards, or ambiguous icon-only controls without accessible labels. Do not use syntax colors outside the code panel except where a semantic state explicitly requires it.
