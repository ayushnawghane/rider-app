# Blinkcar Theme — "Golden Horizon" Grainy Aurora

Warm molten-sunrise design system: fire gradients, film grain, editorial-bold type.
Two surface modes — **golden** (light, default) and **fire-night** (dark).

## Tokens

Defined as CSS variables in `src/theme/variables.css` and mirrored in `tailwind.config.js`.

| Token | Value | Tailwind |
|---|---|---|
| `--fire-red` | `#FF3D00` | `fire-red`, `primary-600` |
| `--fire-orange` | `#FF6B00` | `fire-orange`, `primary-500` |
| `--fire-amber` | `#FF9100` | `fire-amber`, `primary-400` |
| `--fire-gold` | `#FFB300` | `fire-gold` |
| `--fire-yellow` | `#FFD43B` | `fire-yellow` |
| `--fire-glow` | `#FFE9A8` | `fire-glow` |
| `--paper` / `--paper-dim` | `#FFF7ED` / `#FFF1E0` | `paper`, `paper-dim` |
| `--ink` | `#1A0E06` | `ink` |
| `--char` / `--char-2` | `#120A06` / `#20120A` | `char`, `char-2` |
| `--hot-pink` | `#FF4D8D` | `accent-pink` |
| `--aurora-violet` | `#6D28D9` | `accent-violet` |
| `--aurora-teal` | `#14B8A6` | `accent-teal` |

Semantic roles auto-swap per mode: `--bg`, `--surface`, `--surface-border`, `--text`, `--text-dim`.

**Rules:** orange family is the brand; pink/violet/teal are occasional aurora accents (max one per view). Body text uses `--text` (never gray on a gradient). Saturated fire = backgrounds/accents, not long-form text.

## Dark mode
Set `data-theme="fire-night"` on a root element (e.g. `<html>` / `<body>`). All semantic roles and Tailwind `dark:`-style utilities flip. Light/golden is the default.

## Aurora backgrounds
Use the `<Aurora>` component (`src/components/ui/Aurora.tsx`) — layers 2–3 large, soft, slowly-drifting radial blooms + grain. Content goes in as children (rendered above the gradient).

```tsx
import Aurora from '@/components/ui/Aurora';

<Aurora variant="golden" grain="strong">   {/* or "fire-night" */}
  <YourContent />
</Aurora>
```
Props: `variant` (`golden` | `fire-night`), `grain` (`soft` | `base` | `strong`), `still` (freeze drift).

CSS-only fallbacks also exist: `.aurora-golden`, `.aurora-fire-night`.

## Grain
- App-wide paper grain is applied once via `body::after` (fixed, blended).
- Per-surface grain: add `grain` (base `0.10`), `grain grain-soft` (`0.06`, over text), or `grain grain-strong` (`0.16`, pure-gradient hero) to any positioned element. Or drop in `<Grain intensity="strong" />`.
- Noise is a single inline SVG data-URI — rendered once, never per-element.

## Helpers
- `.text-fire` — gradient-clipped fire text for display accents.
- `.glass` — warm frosted glass (mode-aware tint + orange hairline).
- `.btn` / `.btn-primary` (fire-gradient) / `.btn-secondary` (glass) / `.btn-danger`.
- `.card`, `.input`, `.badge-*`, `.avatar-primary`, `.page*`, `.section-title` — all reskinned & mode-aware.

## Typography
- **Display:** Clash Display (→ Archivo fallback). `font-display`, weights 600–800, `tracking-tightest` (`-0.03em`).
- **Body:** Inter. Default sans.
- Hero H1 `clamp(3rem, 9vw, 7rem)` / 800–900 / line-height ~0.92. Go big; let type be a graphic element.

## Motion
Aurora blooms drift via `animate-aurora-1/2/3` (19–28s, transform-only). Entry: `animate-rise` / `animate-fade-in`. All motion is disabled under `prefers-reduced-motion`.
