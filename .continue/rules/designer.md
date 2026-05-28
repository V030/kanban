---
name: designer
user-invocable: true
description: >
  Build new UI from scratch with a bold, intentional aesthetic direction.
  Covers greenfield components, pages, and feature UIs across React, Vue,
  and HTML/CSS/JS. Prioritizes visual distinction, production-grade code,
  and cohesive design thinking before implementation.
---

# design Skill

## Purpose
Design and implement new UI with a clear aesthetic point of view. Every
output should be visually memorable, production-ready, and grounded in a
deliberate design decision — not a generic AI default.

## Activation
Invoke when:
- Building a new component, page, or feature UI from scratch
- Prototyping a design direction or visual concept
- Implementing a redesign where the visual output is meant to change
- Creating UI that needs to feel designed, not just functional

Do NOT invoke for:
- Refactoring existing component logic without visual changes → use `frontend`
- Fixing spacing/alignment bugs in existing UI → use `ui-ux`
- Backend or API work → use `backend`

---

## Design Thinking — Required Before Any Code

Before writing a single line, commit to a clear design direction by
answering these four questions. State the answers explicitly at the top of
your response.

### 1. Purpose
What problem does this interface solve? Who uses it, and in what context?
(e.g. "A task detail view used daily by developers — needs to be dense,
scannable, and low friction.")

### 2. Aesthetic direction
Pick a clear, extreme aesthetic and commit to it. Do not hedge toward
generic. Examples for inspiration — but choose one that fits the context:

- Brutally minimal — near-zero decoration, strict grid, monospace, raw utility
- Maximalist editorial — layered type, collage-like composition, rich texture
- Retro-futuristic — CRT glow, scanlines, terminal green, chunky UI chrome
- Organic/natural — soft curves, earthy palette, handcrafted imperfection
- Luxury/refined — generous whitespace, serif type, muted gold accents
- Playful/toy-like — rounded everything, bright saturated colors, bouncy motion
- Brutalist/raw — unstyled-but-intentional, stark contrast, anti-polish
- Art deco/geometric — symmetry, ornamental borders, high contrast, gold
- Soft/pastel — low saturation, warm neutrals, gentle shadows, rounded cards
- Industrial/utilitarian — monochrome, data-dense, functional typography

**CRITICAL:** Choose a direction and execute it with precision. Bold
maximalism and refined minimalism both work — the key is intentionality,
not intensity. No design should look like another.

### 3. Constraints
- Framework: React (JSX/TSX), Vue (SFC), or HTML/CSS/JS — detect from
  context or ask.
- Token system: use existing CSS variables from the project (see Token
  System section below).
- Performance: prefer CSS-only animation where possible; use Motion library
  only in React contexts where it is already installed.
- Accessibility: semantic HTML, sufficient contrast, keyboard navigability.

### 4. Differentiation
What is the one thing someone will remember about this UI? Name it before
building it. If you cannot name it, the design is not distinct enough.

---

## Implementation Standards

### Typography
- Pair a distinctive display font with a refined body font.
- Never default to Inter, Roboto, Arial, or system-ui as a primary choice.
- Match the font personality to the aesthetic direction (e.g. a geometric
  sans for art deco, a slab serif for industrial, a humanist italic for
  organic/natural).
- Use `font-size`, `line-height`, `letter-spacing`, and `font-weight` as
  primary hierarchy tools — not just size alone.

### Color and theme
- Commit to a dominant palette with one or two sharp accent colors.
- Use CSS variables consistently (see Token System below).
- Timid, evenly-distributed palettes read as generic. Dominant base with
  sharp contrast accents outperform them.
- Always verify dark mode works — every color must be readable on a
  near-black background.

### Motion
- Use animation for high-impact moments: page load reveals, state
  transitions, hover feedback.
- Prefer CSS-only solutions for HTML. Use Motion library for React only
  when already installed.
- One well-orchestrated staggered entry creates more delight than many
  scattered micro-interactions.
- Use `animation-delay` for staggered reveals. Use `transform` and
  `opacity` only — never animate `height`, `width`, or layout properties.

### Spatial composition
- Avoid predictable centered-column layouts by default.
- Consider: asymmetry, overlap, diagonal flow, grid-breaking elements,
  generous negative space, or controlled density.
- Unexpected layouts are memorable. Safe layouts are forgettable.

### Backgrounds and visual depth
- Avoid solid white or solid black as the only background treatment.
- Match atmosphere to aesthetic: noise textures, geometric patterns, subtle
  gradients, layered transparencies, decorative borders, or grain overlays
  are all valid — use what fits the direction.
- Never use purple-gradient-on-white. Never use generic "glassmorphism"
  without a strong reason.

---

## Token System — Project CSS Variables

Always use these variables. Do not hardcode colors, radii, or font stacks
that duplicate an existing token.

```css
/* Backgrounds */
--color-background-primary      /* main surface, adapts light/dark */
--color-background-secondary    /* raised surface */
--color-background-tertiary     /* page background */
--color-background-info
--color-background-success
--color-background-warning
--color-background-danger

/* Text */
--color-text-primary            /* default body text */
--color-text-secondary          /* muted/supporting text */
--color-text-tertiary           /* hints, placeholders */
--color-text-info
--color-text-success
--color-text-warning
--color-text-danger

/* Borders */
--color-border-tertiary         /* 0.15α — default hairline */
--color-border-secondary        /* 0.3α — hover/emphasis */
--color-border-primary          /* 0.4α — strong */
--color-border-info / -success / -warning / -danger

/* Typography */
--font-sans
--font-serif
--font-mono

/* Layout */
--border-radius-md              /* 8px — components */
--border-radius-lg              /* 12px — cards */
--border-radius-xl              /* 16px — large containers */
```

For custom accent colors outside the token system (justified by the
aesthetic direction), define them as local CSS variables at the component
or page root — never as inline hex values scattered through the code.

---

## Behavior Rules
- **Design-first.** State the aesthetic direction before writing any code.
  If the direction is unclear, ask.
- **Never generic.** If the output could have been produced by any AI with
  no context, it is not good enough. Make a distinct choice.
- **No logic changes.** If existing component logic needs to be preserved,
  do not alter it — only the visual layer.
- **Token-first colors.** Use CSS variables before creating new ones. Create
  new ones only when the aesthetic direction requires a color the token
  system does not cover.
- **Framework-aware.** Detect the framework from context (React, Vue, or
  vanilla HTML) and match the output format. Ask if ambiguous.
- **Production-grade.** Code must be functional, not just visually
  impressive. Interactions must work. States must be handled.

---

## Output Format

Begin every response with the design brief:

```
## Design Brief
**Purpose:** <one sentence>
**Aesthetic direction:** <named direction + one sentence description>
**Differentiator:** <the one thing someone will remember>
**Framework:** <React | Vue | HTML/CSS/JS>
```

Then deliver the implementation. For multi-file outputs, list all files
at the top and group code by file.

---

## Clarifying Questions
Ask before starting if any of the following is unknown:
- What framework is this being built in?
- Is there an existing page or component this needs to visually match, or
  is this a standalone piece?
- Are there brand colors or typography constraints beyond the token system?
- Is dark mode required, or is one theme sufficient?
- Are animations acceptable, or is a reduced-motion environment expected?

---

## Completion Criteria
- Design brief is stated explicitly before any code.
- Aesthetic direction is named, committed to, and visible in the output.
- All colors use CSS variables or locally scoped custom properties — no
  scattered hardcoded hex values.
- Typography uses a deliberate font pairing — not a system font default.
- Output is functional and handles interactive states (hover, focus, empty,
  loading where applicable).
- Dark mode works — no invisible text or broken contrast in dark contexts.
- The differentiator named in the brief is actually present in the output.
ENDOFFILE