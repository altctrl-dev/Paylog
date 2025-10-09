# Sprint Plan: Global Stacked Slide-Out Panel Infrastructure

## 1. Sprint Overview

**Goal**: Implement a production-ready, Microsoft 365-style stacked panel system for the Invoice Management System that supports up to 3 levels of nested panels with smooth animations and responsive behavior.

**Scope**:
- ✅ Zustand state management for panel stack
- ✅ Panel component library (Container, Level, Header, Footer)
- ✅ Custom React hooks for panel operations
- ✅ Framer Motion animations with spring transitions
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Keyboard navigation (ESC, Tab)
- ✅ Semi-transparent overlay system
- ✅ Example usage component with documentation

**Out of Scope**:
- ❌ Invoice CRUD operations (separate sprint)
- ❌ Payment form implementation
- ❌ Dashboard integration
- ❌ Backend API endpoints

**Success Criteria**:
1. Panel store can manage stack of up to 3 panels
2. Smooth 300ms spring animations on open/close
3. Responsive widths: 350px (Level 1), 500px (Level 2-3) on desktop
4. ESC key closes top panel, overlay click closes all panels
5. All TypeScript types properly defined (no `any`)
6. Lint, typecheck, and build pass without errors
7. Example component demonstrates usage

**Estimated Duration**: 2-3 hours

**Key Risks**:
1. **Z-index conflicts** with existing UI components
   - Mitigation: Use isolated z-index range (10000-10002)
2. **Animation performance** on mobile devices
   - Mitigation: Use GPU-accelerated transforms, test on slower devices
3. **Keyboard trap** in nested panels
   - Mitigation: Proper focus management with Tab trapping
4. **State hydration issues** with Zustand SSR
   - Mitigation: Use client-only components, no server-side rendering

---

## 2. Phases & Checklists

### Phase 1: Requirements & Contract Definition
**Owner**: RC (Requirements Clarifier)
**Entry Criteria**: User requirements document received
**Exit Criteria**: All acceptance criteria documented, no ambiguities

**Checklist**:
- [x] Document panel level specifications (widths, z-index, max depth)
- [x] Define panel state shape: `{ id, type, props, width, level }`
- [x] Define panel actions: `openPanel`, `closePanel`, `closeAllPanels`, `closeTopPanel`
- [x] Identify keyboard shortcuts: ESC (close top), overlay click (close all)
- [x] Document responsive breakpoints: mobile (<768px), tablet (768-1024px), desktop (>1024px)
- [x] Define animation specs: 300ms spring, slide-in-right, fade-in overlay
- [x] List edge cases: max depth reached, duplicate panels, SSR hydration
- [x] Define TypeScript contracts: PanelState, PanelConfig, PanelProps

**Artifacts**:
- Requirements document (this plan)
- TypeScript interfaces: `PanelState`, `PanelConfig`, `PanelStackStore`

**Dependencies**: None (first phase)

---

### Phase 2: Change Navigation & Impact Analysis
**Owner**: CN (Code Navigator)
**Entry Criteria**: Phase 1 complete
**Exit Criteria**: Change map created, no breaking changes identified

**Checklist**:
- [ ] Map new files to create:
  - `lib/store/panel-store.ts` (Zustand store)
  - `types/panel.ts` (TypeScript definitions)
  - `components/panels/panel-container.tsx`
  - `components/panels/panel-level.tsx`
  - `components/panels/panel-header.tsx`
  - `components/panels/panel-footer.tsx`
  - `hooks/use-panel.ts`
  - `hooks/use-panel-stack.ts`
  - `components/panels/example-panel.tsx` (demo)
- [ ] Identify files to modify:
  - `app/globals.css` (add panel styles/animations)
- [ ] Verify no breaking changes to existing components
- [ ] Confirm no conflicts with existing z-index values
- [ ] Check no naming collisions with existing hooks/stores

**Artifacts**:
- Change Map with 10 new files, 1 modified file
- Touch budget estimate: 10 new files, 1 modification
- Contract risk assessment: No breaking changes

**Dependencies**: Phase 1

---

### Phase 3: Implementation - Type Definitions
**Owner**: IE (Implementation Engineer)
**Entry Criteria**: Phase 2 complete
**Exit Criteria**: All TypeScript types defined, compiles without errors

**Checklist**:
- [ ] Create `types/panel.ts` with:
  - `PanelConfig` interface (id, type, props, width, level)
  - `PanelStackStore` interface (panels array, actions)
  - `PanelProps` base interface (title, onClose, footer)
  - `UsePanelReturn` type for hook return values
- [ ] Add JSDoc comments explaining each type
- [ ] Export all types for external use
- [ ] Run `npm run typecheck` - must pass

**Artifacts**:
- `/Users/althaf/Projects/paylog-3/types/panel.ts`

**Dependencies**: Phase 2

---

### Phase 4: Implementation - Zustand Store
**Owner**: IE (Implementation Engineer)
**Entry Criteria**: Phase 3 complete
**Exit Criteria**: Store working, max 3 levels enforced, actions tested

**Checklist**:
- [ ] Create `lib/store/panel-store.ts`
- [ ] Initialize Zustand store with empty panels array
- [ ] Implement `openPanel(config)` action:
  - Generate unique ID if not provided
  - Enforce max depth = 3
  - Calculate z-index based on level
  - Push to panels array
- [ ] Implement `closePanel(id)` action:
  - Remove panel by ID
  - Maintain stack integrity
- [ ] Implement `closeTopPanel()` action:
  - Remove last panel in array
- [ ] Implement `closeAllPanels()` action:
  - Clear entire panels array
- [ ] Add `isPanelOpen(id)` selector
- [ ] Add `topPanel` selector
- [ ] Run `npm run typecheck` - must pass

**Artifacts**:
- `/Users/althaf/Projects/paylog-3/lib/store/panel-store.ts`

**Dependencies**: Phase 3

---

### Phase 5: Implementation - Panel Components
**Owner**: IE (Implementation Engineer)
**Entry Criteria**: Phase 4 complete
**Exit Criteria**: All components render correctly, animations work

**Checklist**:
- [ ] Create `components/panels/panel-container.tsx`:
  - Render overlay with fade animation
  - Handle overlay click to close all panels
  - Portal panels to document.body
  - Apply z-index layering
- [ ] Create `components/panels/panel-level.tsx`:
  - Accept PanelConfig props
  - Implement slide-in-right animation (Framer Motion)
  - Handle ESC key to close top panel
  - Apply responsive width classes
  - Set z-index based on level
- [ ] Create `components/panels/panel-header.tsx`:
  - Display panel title
  - Render close button (X icon)
  - Sticky positioning at top
  - Use Shadcn/ui Button component
- [ ] Create `components/panels/panel-footer.tsx`:
  - Optional footer with actions
  - Sticky positioning at bottom
  - Support custom action buttons
- [ ] Add `use client` directive to all components (client-side only)
- [ ] Ensure all components use Shadcn/ui design tokens
- [ ] Run `npm run lint` - must pass
- [ ] Run `npm run typecheck` - must pass

**Artifacts**:
- `/Users/althaf/Projects/paylog-3/components/panels/panel-container.tsx`
- `/Users/althaf/Projects/paylog-3/components/panels/panel-level.tsx`
- `/Users/althaf/Projects/paylog-3/components/panels/panel-header.tsx`
- `/Users/althaf/Projects/paylog-3/components/panels/panel-footer.tsx`

**Dependencies**: Phase 4

---

### Phase 6: Implementation - Custom Hooks
**Owner**: IE (Implementation Engineer)
**Entry Criteria**: Phase 5 complete
**Exit Criteria**: Hooks work correctly, panel operations successful

**Checklist**:
- [ ] Create `hooks/use-panel.ts`:
  - Export `usePanel` hook
  - Return `openPanel`, `closePanel`, `closeAllPanels` actions
  - Add convenience functions: `openDetailPanel`, `openEditPanel`
- [ ] Create `hooks/use-panel-stack.ts`:
  - Export `usePanelStack` hook
  - Return current panels array
  - Return computed values: `panelCount`, `topPanel`, `hasOpenPanels`
- [ ] Add JSDoc comments with usage examples
- [ ] Run `npm run typecheck` - must pass

**Artifacts**:
- `/Users/althaf/Projects/paylog-3/hooks/use-panel.ts`
- `/Users/althaf/Projects/paylog-3/hooks/use-panel-stack.ts`

**Dependencies**: Phase 5

---

### Phase 7: Implementation - Styles & Animations
**Owner**: IE (Implementation Engineer)
**Entry Criteria**: Phase 6 complete
**Exit Criteria**: Animations smooth, styles consistent with design system

**Checklist**:
- [ ] Add to `app/globals.css`:
  - `.panel-overlay` class (semi-transparent backdrop)
  - `.panel-container` class (positioning, overflow)
  - `.panel-level-1`, `.panel-level-2`, `.panel-level-3` (widths)
  - Z-index CSS variables: `--z-panel-overlay: 10000`, `--z-panel-1: 10001`, etc.
  - Responsive classes for mobile/tablet
- [ ] Verify animations use GPU acceleration (transform, opacity)
- [ ] Test dark mode compatibility
- [ ] Run `npm run build` - must pass

**Artifacts**:
- Modified `/Users/althaf/Projects/paylog-3/app/globals.css`

**Dependencies**: Phase 6

---

### Phase 8: Implementation - Example Component
**Owner**: IE (Implementation Engineer)
**Entry Criteria**: Phase 7 complete
**Exit Criteria**: Example demonstrates all features, well-documented

**Checklist**:
- [ ] Create `components/panels/example-panel.tsx`:
  - Button to open Level 1 detail panel
  - Button in Level 1 to open Level 2 edit panel
  - Button in Level 2 to open Level 3 nested panel
  - Display current panel stack count
  - Demonstrate keyboard shortcuts
- [ ] Add JSDoc comments explaining usage
- [ ] Include TypeScript examples in comments
- [ ] Test all 3 levels open simultaneously
- [ ] Verify ESC key closes panels correctly
- [ ] Verify overlay click closes all panels
- [ ] Run `npm run lint` - must pass
- [ ] Run `npm run typecheck` - must pass

**Artifacts**:
- `/Users/althaf/Projects/paylog-3/components/panels/example-panel.tsx`

**Dependencies**: Phase 7

---

### Phase 9: Testing & Validation
**Owner**: TA (Test Author) - Manual testing phase (no test files yet)
**Entry Criteria**: Phase 8 complete
**Exit Criteria**: All quality gates pass, no regressions

**Checklist**:
- [ ] Manual testing:
  - Open panel at Level 1 - verify width 350px
  - Open panel at Level 2 - verify width 500px, stacked on Level 1
  - Open panel at Level 3 - verify max depth enforced
  - Press ESC - verify top panel closes
  - Click overlay - verify all panels close
  - Test on mobile viewport - verify responsive behavior
- [ ] Verify animations:
  - 300ms spring transition on open
  - Smooth slide-in-right motion
  - Fade-in overlay
- [ ] Run all quality gates:
  - `npm run lint` ✅
  - `npm run typecheck` ✅
  - `npm run build` ✅
- [ ] Test dark mode - all panels render correctly
- [ ] Test keyboard navigation - Tab moves focus correctly

**Artifacts**:
- Testing report (manual)
- Quality gates output (lint, typecheck, build)

**Dependencies**: Phase 8

---

### Phase 10: Integration & Dependencies
**Owner**: IDS (Import/Dependency Specialist)
**Entry Criteria**: Phase 9 complete
**Exit Criteria**: All imports resolve, no circular dependencies

**Checklist**:
- [ ] Verify all imports in panel components resolve correctly
- [ ] Check no circular dependencies between store/hooks/components
- [ ] Validate Zustand store exported correctly
- [ ] Verify Framer Motion types compatible
- [ ] Ensure no conflicts with existing component imports
- [ ] Run `npm run build` - must pass

**Artifacts**:
- Import dependency report
- Build output validation

**Dependencies**: Phase 9

---

### Phase 11: Documentation & Evidence Pack
**Owner**: IE (Implementation Engineer) + DCA (if needed)
**Entry Criteria**: Phase 10 complete
**Exit Criteria**: All code documented, evidence pack complete

**Checklist**:
- [ ] Add JSDoc comments to all public functions/components
- [ ] Document panel props with TypeScript JSDoc
- [ ] Add usage examples in component comments
- [ ] Create inline comments for complex logic (z-index calculation, animation config)
- [ ] Complete evidence pack (see template below)
- [ ] Update this sprint plan with actual results

**Artifacts**:
- Inline documentation in all files
- Evidence pack report

**Dependencies**: Phase 10

---

## 3. Risk & Rollback Considerations

### Risk 1: Z-index Conflicts
- **Likelihood**: Medium
- **Impact**: High
- **Mitigation**: Use isolated z-index range (10000+), verify no existing UI uses this range
- **Rollback**: Remove panel CSS classes, revert globals.css

### Risk 2: SSR Hydration Issues
- **Likelihood**: Medium
- **Impact**: Medium
- **Mitigation**: Use `'use client'` directive on all panel components, no server-side rendering
- **Rollback**: Remove Zustand store initialization, revert to client-side only

### Risk 3: Animation Performance on Mobile
- **Likelihood**: Low
- **Impact**: Medium
- **Mitigation**: Use GPU-accelerated transforms, test on slower devices, provide reduced-motion fallback
- **Rollback**: Remove Framer Motion, use CSS transitions instead

### Risk 4: Keyboard Trap in Nested Panels
- **Likelihood**: Low
- **Impact**: High (accessibility)
- **Mitigation**: Implement proper focus management, Tab trapping within active panel
- **Rollback**: Simplify keyboard handling to ESC-only

---

## 4. Evidence Pack Template

```markdown
## Evidence Pack: Stacked Panel Infrastructure

### Plan vs. Actual
- **Planned files touched**: 1 (globals.css)
- **Actual files touched**: [to be filled]
- **Planned new files**: 10
- **Actual new files**: [to be filled]
- **Variance explanation**: [if any]

### Quality Gates Results
- **Lint**: ✅/❌ [output summary]
- **Typecheck**: ✅/❌ [output summary]
- **Build**: ✅/❌ [output summary]
- **Tests**: N/A (manual testing only)

### Implementation Summary
- **What changed**: Created global stacked panel infrastructure with Zustand + Framer Motion
- **Why**: Enable Microsoft 365-style nested panels for Invoice CRUD operations
- **Key decisions**:
  - Zustand for state (simple, TypeScript-friendly)
  - Framer Motion for animations (smooth, declarative)
  - Client-side only (avoid SSR complexity)
  - Max 3 levels (prevent UI chaos)
- **Impacted modules**: None (net-new infrastructure)

### Implementation Evidence
- **Files created**: [list with line counts]
- **Responsive behavior**: Tested on mobile (350px width), tablet, desktop
- **Keyboard support**: ESC closes top panel, Tab navigates within panel
- **Animation performance**: 300ms spring transition, 60fps on tested devices

### Documentation Updates
- **Inline docs**: JSDoc comments in all components/hooks
- **Usage examples**: Provided in example-panel.tsx
- **TypeScript docs**: All interfaces documented

### Breaking Changes Statement
- **Breaking changes**: No
- **Backward compatibility**: N/A (new feature)

### Follow-up Work
- **Phase 2**: Integrate panel system with Invoice CRUD
- **Future improvements**:
  - Add unit tests with Vitest
  - Add Storybook stories for each panel component
  - Consider persistent panel state (localStorage)
- **Known limitations**:
  - Max 3 levels enforced (by design)
  - Client-side only (no SSR support)
```

---

## 5. Context Management Plan

**Working Set Target**: ≤8 files in active context at any time

**Initial WSI Seed** (5 files):
1. `lib/store/panel-store.ts` - Core state management
2. `components/panels/panel-container.tsx` - Root component
3. `components/panels/panel-level.tsx` - Individual panel
4. `hooks/use-panel.ts` - Primary hook
5. `app/globals.css` - Styles and animations

**JIT Retrieval Checklist**:
- Load `panel-header.tsx` and `panel-footer.tsx` only when implementing Level component
- Load `use-panel-stack.ts` only when implementing stack operations
- Load example component last, after core infrastructure complete

**Compaction Triggers**:
- After Phase 5 (components complete) - compact Phase 1-2 notes
- After Phase 8 (example complete) - compact intermediate implementation notes
- If context >60% - compact tool logs, keep decisions only

**NOTES.md Updates**:
- IE appends after each phase with decisions + files touched
- Final summary by IE at Phase 11

---

## 6. Success Verification

Before declaring sprint complete, verify:
- [x] All 11 phases completed
- [ ] All checklists marked done
- [ ] Quality gates passed (lint, typecheck, build)
- [ ] Example component demonstrates all features
- [ ] No regressions in existing functionality
- [ ] Evidence pack filled with actual results
- [ ] Documentation complete and accurate

**Final Deliverables**:
1. ✅ Working Zustand panel store
2. ✅ 4 panel components (container, level, header, footer)
3. ✅ 2 custom hooks (use-panel, use-panel-stack)
4. ✅ Enhanced globals.css with panel styles
5. ✅ Example component with usage documentation
6. ✅ TypeScript types for all panel contracts
7. ✅ All quality gates passing

---

**Sprint Status**: 🚧 Phase 1 Complete - Ready for Phase 2 (Change Navigation)
