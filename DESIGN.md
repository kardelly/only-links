# Design System — delicious.modern

## Color

**Strategy**: Restrained. Tinted neutrals + one accent used sparingly (≤10% of surface).

**Theme**: Light. Reasoning: Knowledge work happens during daytime, often in well-lit offices or cafes. Bookmarking is additive (bright mood), not troubleshooting (dark mood).

```css
:root {
  /* Neutrals — warm tint toward oklch hue 60 (amber) */
  --bg:      oklch(98% 0.008 60);     /* Off-white canvas */
  --surface: oklch(99.5% 0.004 60);   /* Elevated panels */
  --fg:      oklch(18% 0.012 60);     /* Primary text */
  --muted:   oklch(52% 0.008 60);     /* Secondary text */
  --border:  oklch(90% 0.006 60);     /* Hairline dividers */
  
  /* Accent — cobalt blue, editorial energy */
  --accent:  oklch(56% 0.18 250);     /* Links, CTAs, focus states */
  
  /* Semantic (derived) */
  --success: oklch(54% 0.15 145);
  --warning: oklch(68% 0.16 85);
  --danger:  oklch(58% 0.18 25);
}
```

**Usage rules**:
- Accent appears ONLY on: primary CTA, active nav item, focused inputs, links in prose. Never on decorative elements.
- No gradients except a single ambient glow in the far background (oklch(99% 0.01 250) → transparent).
- Success/warning/danger only when semantic (form validation, system feedback). Never for decoration.

## Typography

**Fonts**:
- Display: **Newsreader** (serif, editorial authority)
- Body: **Inter** (sans, proven UI workhorse)
- Mono: **JetBrains Mono** (code, URLs, timestamps)

**Scale** (1.25 ratio, capped at 6 sizes):
```css
--text-xs:   13px;  /* Captions, metadata */
--text-sm:   14px;  /* Sidebar, labels */
--text-base: 16px;  /* Body copy */
--text-lg:   20px;  /* Section headers */
--text-xl:   25px;  /* Page titles */
--text-2xl:  31px;  /* Marketing hero only */
```

**Hierarchy rules**:
- Body line length: 65ch max
- Headings: Newsreader, weight 600, tracking -0.02em at ≥25px
- Body: Inter, weight 400, line-height 1.6
- UI labels: Inter, weight 510, tracking 0.01em
- Mono: 14px, line-height 1.5, tabular-nums

**Vertical rhythm**: 4px base unit. Line heights round to multiples of 4px.

## Layout

**Grid**: 12-column, 1200px max-width, 20px gutters.

**Spacing scale** (4px base):
```css
--space-1:  4px;
--space-2:  8px;
--space-3:  12px;
--space-4:  16px;
--space-6:  24px;
--space-8:  32px;
--space-12: 48px;
--space-16: 64px;
```

**Composition patterns**:
- **Feed** (main content): 720px max, centered, var(--space-8) vertical rhythm between items.
- **Sidebar** (tags, meta): 280px fixed width, var(--space-6) padding, sticky position.
- **Header**: 60px tall, backdrop-filter blur for scroll context.
- **Cards**: None. Bookmarks are list items with hover elevation, not enclosed cards.

## Components

### Bookmark Item
- **Structure**: URL bar (title + domain) + description + tags + metadata row
- **Spacing**: var(--space-6) padding, var(--space-8) gap between items
- **Hover**: translateY(-2px), shadow-md (0 4px 12px oklch(18% 0.012 60 / 0.08))
- **Typography**: Title (var(--text-base), weight 510), description (var(--text-sm), var(--muted))

### Tag Pill
- **Size**: var(--text-xs), var(--space-2) × var(--space-3) padding
- **Style**: 1px border (var(--border)), 4px radius, no background
- **Hover**: border-color var(--accent), no background fill
- **Active**: border-color var(--accent), color var(--accent)

### Input
- **Size**: 40px tall, var(--space-4) × var(--space-3) padding
- **Border**: 1px var(--border), 6px radius
- **Focus**: 2px var(--accent) border, no shadow, no glow
- **Typography**: var(--text-base), Inter

### Button Primary
- **Size**: 40px tall, var(--space-4) × var(--space-6) padding
- **Style**: var(--accent) fill, white text, 6px radius, weight 510
- **Hover**: oklch(from var(--accent) calc(l - 0.05) c h)
- **Active**: translateY(1px)

### Button Secondary
- **Size**: Same as primary
- **Style**: 1px var(--border), transparent fill, var(--fg) text
- **Hover**: var(--surface) fill
- **Active**: translateY(1px)

## Elevation

Two levels only:

| Level | Use case | Shadow |
|---|---|---|
| 0 (flat) | Default state | none |
| 1 (raised) | Hover, dropdowns, modals | 0 4px 12px oklch(18% 0.012 60 / 0.08) |

No `box-shadow` on inputs or buttons. Elevation is for content, not chrome.

## Motion

**Durations**:
- Micro (hover, focus): 150ms
- Small (dropdown, tooltip): 200ms
- Medium (modal, drawer): 300ms

**Easing**: `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo) for all transitions.

**Animated properties**:
- `transform` (translateY, scale)
- `opacity`
- `box-shadow`

Never animate: width, height, padding, margin, border-width.

## Responsive

**Breakpoints**:
- Desktop: ≥1024px (sidebar visible)
- Tablet: 768–1023px (sidebar collapses to drawer)
- Mobile: <768px (stacked layout, bottom nav)

**Mobile adaptations**:
- Header height: 56px
- Bookmark item padding: var(--space-4)
- Tag font size: var(--text-xs)
- Bottom nav: 64px tall, 5 icons max

## Accessibility

- Focus rings: 2px var(--accent), 2px offset
- Min touch target: 44×44px
- Color contrast: AAA for body (7:1), AA for UI (4.5:1)
- Keyboard shortcuts: /, n, esc, enter, tab
- Reduced motion: `prefers-reduced-motion` disables all transitions

## Anti-patterns

**Never use**:
- Side-stripe borders on bookmarks
- Gradient text
- Glassmorphism (removed from current implementation)
- Identical card grids
- Modal for bookmark creation (use inline form)
- Auto-playing animations

**The slop test**: If someone sees this and says "looks like a Tailwind template", it failed. Distinctive without decoration.
