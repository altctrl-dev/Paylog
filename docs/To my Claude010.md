# To my Claude010

**Date**: 2025-10-09  
**Participants**: Althaf, Codex agent  
**Scope**: Sidebar collapse spacing (left & right gutters preserved)

---

## Context
After the last adjustment, collapsing the sidebar left a wider gap between the sidebar and content. The goal was to keep the right edge (and “Add Invoice” button) fixed while also preserving the original left gutter.

## Change
- Updated `components/layout/dashboard-shell.tsx` to use conditional layout classes:  
  - Expanded: content remains `mx-auto max-w-6xl`.  
  - Collapsed: content uses `ml-auto max-w-none` so it fills remaining space without altering the original left padding.
- Added `cn` helper import to support the conditional class logic.

## Result
- When the sidebar collapses, the main content stays aligned with both original gutters; only width increases to the left, while the right edge remains stationary.
- `npm run lint` passes.

---

Ready for a quick visual review before we move to the next feature. !*** End Patch
