# Mobile Design Guidelines

Use the mobile Kanban page as the source of truth for mobile layouts. New mobile screens and mobile-only redesigns should match its shell, spacing, colors, and component weight before introducing page-specific styling.

## Reference Surface

- Primary reference: `client/src/pages/KanbanPage.jsx`
- Primary styles: `client/src/components/styles/KanbanPage.css`
- Board/card styles: `client/src/components/styles/KanbanBoard.css`
- Bottom navigation: `client/src/components/common/SideBar.jsx` and `client/src/components/styles/SideBar.css`

## Mobile Shell

For page-level mobile views, follow the Kanban page shell model:

- Page background: `#f0f4f3`
- App layout owns bottom navigation spacing:
  - `.app-layout:has(.kanban-page)` uses bottom padding for the floating nav.
  - Do not add competing large bottom padding on the page container and nested content at the same time.
- The page shell should keep the same outer breathing room as Kanban.
- Inner mobile content rhythm uses `8px` horizontal padding:
  - Breadcrumb bar: `padding: 3px 8px`
  - Hero/title content: `padding: 6px 8px 0`
  - Main content/cards area: `padding: 0 8px 5px`

Avoid making mobile pages edge-to-edge unless Kanban does the same for that exact area.

## Mobile Header / Hero

Match the Kanban mobile header hierarchy:

- Breadcrumb row first.
- Main title row below.
- Meta/status row below title when relevant.
- Action icons align to the title row on the right.
- Header background remains `#f0f4f3`; do not put the hero in a white card.

Breadcrumb style:

- `font-size: 11px`
- `font-weight: 700`
- Muted text: `#7b8a99`
- Parent links: `#1D9E75`
- Separator: muted gray
- Height: `min-height: 38px`
- Padding: `3px 8px`
- Bottom border: `0.5px solid rgba(148, 163, 184, 0.35)`
- Long labels must truncate with:
  - `min-width: 0`
  - `overflow: hidden`
  - `text-overflow: ellipsis`
  - `white-space: nowrap`

Title style:

- `font-size: 20px`
- `font-weight: 500`
- `line-height: 1.18`
- `letter-spacing: 0`
- Color: `#12263a`

## Cards

Mobile cards should match Kanban task card weight:

- Background: `#ffffff`
- Border: `0.5px solid rgba(148, 163, 184, 0.34)`
- Border radius: `12px`
- Shadow: none
- Horizontal margins should come from the shared shell/content rhythm, not one-off edge spacing.

Internal dividers should be quieter than card borders:

- Use `0.5px solid rgba(148, 163, 184, 0.22-0.28)`
- Avoid heavy grid lines that make mobile cards feel like desktop forms.

## Section Labels

Section labels such as `DETAILS`, `ASSIGNEES`, and `SUBTASKS` should be quiet uppercase labels:

- `font-size: 11px`
- `font-weight: 500`
- `letter-spacing: 0.05em`
- `text-transform: uppercase`
- Color: muted/tertiary, preferably `#7b8a99` or `var(--color-text-tertiary)` if it matches the surrounding surface.

## Pills And Badges

Kanban uses small rounded badges. Keep pill weights consistent within a row.

Base mobile pill:

- `font-size: 12px`
- `font-weight: 500`
- `padding: 4px 10px`
- `border-radius: 20px`
- `border: none` unless the Kanban reference uses a bordered filter chip.

Priority badge colors:

- Unset: `#EEF2F4` background, `#64748b` text
- Low: `#E8F7EF` background, `#1D9E75` text
- Medium: `#FFF4D6` background, `#9A5A00` text
- High/Urgent: `#FCEBEB` background, `#A32D2D` text

Status badge colors:

- Todo: `#EEF2F4` background, `#64748b` text
- In Progress: `#E6F1FB` background, `#185FA5` text
- To Review: `#FFF4D6` background, `#9A5A00` text
- Done: `#E8F7EF` background, `#1D9E75` text

Do not duplicate status information as both a meta sentence and pills in the same header.

## Metadata

Mobile metadata should use a compact Kanban-like scale:

- Label: `11px`, muted tertiary text, `font-weight: 500`
- Value: `13px`, primary text, `font-weight: 500`
- Dates should be readable, not timestamp-heavy:
  - Use `May 17, 2026`
  - Avoid `5/17/2026, 12:43:20 AM`

## Bottom Navigation

Use the existing mobile bottom navigation as-is:

- Floating rounded pill nav
- Active Projects state must use `#1D9E75` for icon and label
- Do not replace it with a flat full-width bar on one page unless the whole app is changing.

Make sure scrollable content has enough bottom space to avoid being hidden behind the floating nav and browser chrome.

## Implementation Rules

- Scope mobile-only overrides inside `@media (max-width: 768px)`.
- Prefer matching Kanban's existing classes and spacing before creating new values.
- Do not add page-specific shell padding that competes with `.app-layout`, `.page-shell`, or shared mobile nav padding.
- When building another mobile page, compare it beside the Kanban mobile page at `375px` width before calling it done.
