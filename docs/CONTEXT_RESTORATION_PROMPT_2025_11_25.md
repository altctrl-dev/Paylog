# 🎯 Context Restoration Prompt - November 25, 2025

**Purpose**: Ultimate prompt for restoring COMPLETE project context in new Claude Code sessions
**Last Updated**: November 25, 2025 (after Sprint 14 Items #11 & #12 completion)
**Usage**: Copy the prompt below and paste it to start a new session

---

## 📋 COPY THIS PROMPT TO RESTORE FULL CONTEXT

```
I need you to restore COMPLETE context for the PayLog project with maximum detail.

═══════════════════════════════════════════════════════════
                    PROJECT OVERVIEW
═══════════════════════════════════════════════════════════

**Project**: PayLog - Invoice Management System
**Tech Stack**: Next.js 14 (App Router), TypeScript, Prisma, PostgreSQL, Railway, NextAuth, Radix UI, shadcn/ui
**Production URL**: https://paylog-production-5265.up.railway.net
**Database**: PostgreSQL on Railway (DATABASE_URL in .env)
**Deployment**: Railway (auto-deploy from main branch on git push)

**Architecture**:
- Multi-tenant with RBAC (super_admin, admin, standard_user)
- Server Actions pattern (not REST API)
- Stacked side panels with Framer Motion
- React Query for data fetching/mutations
- Zod for validation
- Prisma ORM

═══════════════════════════════════════════════════════════
              CURRENT PROJECT STATUS (Nov 25, 2025)
═══════════════════════════════════════════════════════════

**Overall Progress**: 198.4/208 SP (95.4% complete)

**Sprint 14 Progress**: 5/13 items complete (38%)
- ✅ Item #1: Approval buttons
- ✅ Item #2: User panel loading fix
- ✅ Item #3: Currency display
- ✅ Item #11: Edit button for admins (JUST COMPLETED Nov 25)
- ✅ Item #12: Edit button for standard users (JUST COMPLETED Nov 25)
- ❌ 8 items remaining (~25-34 hours)

**Latest Session** (Nov 25, 2025):
- Duration: 6 hours
- Achievement: Items #11 & #12 COMPLETE
- Status: ✅ User confirmed "it is working now"
- Commits: 6 (all quality gates passed)
- Lines Added: 1,900+ (2 new files, 6 modified)

═══════════════════════════════════════════════════════════
                  WHAT WAS JUST COMPLETED
═══════════════════════════════════════════════════════════

**Items #11 & #12: V2 Invoice Edit Functionality**

**Files Created**:
1. `components/invoices-v2/edit-recurring-invoice-form.tsx` (710 lines)
2. `components/invoices-v2/edit-non-recurring-invoice-form.tsx` (680 lines)

**Files Modified**:
1. `app/actions/invoices-v2.ts` (+400 lines: updateRecurringInvoice, updateNonRecurringInvoice)
2. `hooks/use-invoices-v2.ts` (+40 lines: mutation hooks)
3. `lib/validations/invoice-v2.ts` (+50 lines: update schemas)
4. `components/invoices/invoice-detail-panel-v2.tsx` (permission logic + edit handler)
5. `components/invoices/invoice-panel-renderer.tsx` (panel registration)
6. `components/invoices-v2/vendor-text-autocomplete.tsx` (pre-fill fix)

**Key Features Implemented**:
- Admin edit: Opens side panel, all fields editable, status unchanged
- Standard user edit: Only own invoices, not while pending_approval, triggers re-approval
- File upload: Optional (replaces only if new file provided)
- Form validation: Real-time with error display
- Pre-fill: All fields from existing invoice
- ESC handler: Warns on unsaved changes
- Number inputs: Mouse scroll disabled (global CSS)

**7 Bugs Fixed** (through 6 iterations):
1. Due date validation error (invalid defaultValues)
2. Vendor field empty (fetch on mount fix)
3. File validation error (z.custom needs explicit null check)
4. Form submission broken (onSubmit signature)
5. Zod rejecting all input (validator runs before .nullable())
6. Form invalid on mount (removed defaultValues)
7. "Not a recurring invoice" (profile_id → invoice_profile_id)

**Critical Technical Lessons**:
```typescript
// ❌ WRONG - Rejects everything
z.custom<File>().nullable().optional()

// ✅ CORRECT - Must explicitly allow null/undefined
z.custom<File>((val) => {
  return val === null || val === undefined || val instanceof File;
}).nullable().optional()

// Reason: Custom validators run BEFORE .nullable() and .optional()
```

═══════════════════════════════════════════════════════════
               NEXT PRIORITY (RECOMMENDED)
═══════════════════════════════════════════════════════════

**Item #13: Invoice Creation Method Toggle** ⭐ USER REQUESTED
**Priority**: HIGH VALUE
**Effort**: 4-5 hours
**Status**: ❌ TODO

**User Quote**:
> "I would like to have a toggle button on the settings to switch between
> current method and the sidepanel method to use them both and decide later."

**What It Does**:
- Settings toggle to choose invoice creation method:
  - Method 1: Full pages (/invoices/new/recurring)
  - Method 2: Side panels (stay on invoice list)
- User preference saved in database (use_panel_for_invoice_creation BOOLEAN)
- Both methods remain functional
- Conditional routing based on preference

**Implementation Plan** (5 phases):
1. Database: Add preference field to users table (1h)
2. Settings UI: Add toggle switch (30min)
3. Panel Components: Wrap existing forms (1.5h)
4. Conditional Routing: Check preference → panel OR route (30min)
5. Testing: Toggle works, preference persists (45min)

**Detailed Plan**: See `docs/CONVERT_INVOICE_FORMS_TO_PANELS.md`

═══════════════════════════════════════════════════════════
               REMAINING SPRINT 14 ITEMS (8)
═══════════════════════════════════════════════════════════

**Week 1: Quick Wins** (7-10 hours):
1. ⭐ Item #13: Invoice creation toggle (4-5h) - DO FIRST
2. Item #4: Amount field '0' placeholder (2-3h)
3. Item #5: Panel styling gaps (1-2h)

**Week 2: Master Data** (7-10 hours):
4. Item #6: Payment types CRUD (4-5h)
5. Item #7: Billing frequency mandatory (3-5h)

**Week 3: Navigation** (11-14 hours):
6. Item #8: Activities tab (4-5h)
7. Item #9: Settings restructure (3-4h)
8. Item #10: Invoice tabs (Recurring/TDS) (4-5h)

**Total Remaining**: 25-34 hours

═══════════════════════════════════════════════════════════
                   EXECUTION ORDER
═══════════════════════════════════════════════════════════

1. Sprint 14 (8 items, ~25-34h)
2. Security Audit (8-12h, NOT STARTED)
3. Sprint 13 Phase 6 - Documentation (8-10h, NOT STARTED)
4. v1.0.0 Launch (2-4h)

**Total to v1.0.0**: 43-60 hours (5-8 weeks)

═══════════════════════════════════════════════════════════
              CRITICAL INFORMATION TO REMEMBER
═══════════════════════════════════════════════════════════

**Always Check Git Status First**:
```bash
git status
```
**Critical Lesson from Nov 24**: Spent 3 hours debugging Railway deployment
issues. Root cause: uncommitted changes in header-v2.tsx. ALWAYS check git
status before debugging deployment problems!

**Quality Gates (MANDATORY before each commit)**:
```bash
pnpm lint       # ✅ Must pass
pnpm typecheck  # ✅ Must pass
pnpm build      # ✅ Must pass
git add -A && git commit -m "..." && git push
```

**Database Field Names** (verify in schema.prisma):
- ✅ invoice_profile_id (NOT profile_id)
- ✅ invoice.created_by (NOT created_by_id)
- ✅ Use actual field names from schema!

**Form Validation Best Practices**:
1. Never set invalid defaultValues (fails validation on mount)
2. Use useEffect + setValue for pre-filling from API data
3. Always accept validated data in onSubmit: `async (data: FormData) => {}`
4. Avoid watch() for submission (bypasses validation)

**Zod Custom Validators**:
- Must explicitly handle null/undefined in validator function
- Custom validators run BEFORE .nullable() and .optional()
- Always provide validation function: `z.custom<T>((val) => boolean)`

**Permission Pattern**:
```typescript
// Client-side (UI visibility)
const canEdit = isAdmin || (isOwner && !isPending);

// Server-side (enforce security)
if (!isAdmin) {
  if (invoice.created_by !== user.id) return error('Unauthorized');
  if (invoice.status === 'pending_approval') return error('Cannot edit pending');
}
```

═══════════════════════════════════════════════════════════
              KEY FILES & LOCATIONS (Quick Reference)
═══════════════════════════════════════════════════════════

**Documentation** (READ THESE FIRST):
- `docs/SESSION_SUMMARY_2025_11_25.md` - Latest session (Items #11 & #12)
- `docs/SPRINT_14_STATUS_UPDATED.md` - Current sprint status
- `docs/SPRINTS_REVISED.md` - Overall progress tracker
- `docs/CONTEXT_RESTORATION_PROMPT_MASTER.md` - Comprehensive context
- `docs/CONVERT_INVOICE_FORMS_TO_PANELS.md` - Item #13 plan (400+ lines)

**Recent Code** (Items #11 & #12):
- `components/invoices-v2/edit-recurring-invoice-form.tsx` (710 lines)
- `components/invoices-v2/edit-non-recurring-invoice-form.tsx` (680 lines)
- `app/actions/invoices-v2.ts` (lines 561-800: update functions)
- `hooks/use-invoices-v2.ts` (update mutation hooks)
- `lib/validations/invoice-v2.ts` (update schemas)

**Core System Files**:
- `schema.prisma` - Database schema (verify field names here!)
- `app/(dashboard)/invoices/page.tsx` - Invoice list page
- `components/invoices/invoice-detail-panel-v2.tsx` - Detail panel
- `components/panels/panel-provider.tsx` - Panel system
- `lib/utils/format.ts` - Currency formatting (lines 94-145)

**Configuration**:
- `.env` - Contains DATABASE_URL (never commit!)
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript config
- `next.config.js` - Next.js config

═══════════════════════════════════════════════════════════
                  DEVELOPMENT COMMANDS
═══════════════════════════════════════════════════════════

```bash
# Development
pnpm dev              # Start dev server (localhost:3000)
pnpm lint             # Run ESLint
pnpm typecheck        # Run TypeScript compiler
pnpm build            # Build for production
pnpm prisma studio    # Open database GUI

# Database
pnpm prisma migrate dev    # Create and apply migration
pnpm prisma generate       # Regenerate Prisma client
pnpm prisma db push        # Push schema to database (no migration)

# Git
git status            # ⚠️ ALWAYS check first!
git add -A
git commit -m "..."
git push              # Auto-deploys to Railway

# Railway (production database)
DATABASE_URL="postgresql://postgres:jhflEknGXmwokrRXmafsBKNDAZFKziPM@shortline.proxy.rlwy.net:28921/railway" pnpm prisma studio
```

═══════════════════════════════════════════════════════════
               WHAT TO DO AFTER CONTEXT RESTORATION
═══════════════════════════════════════════════════════════

**Immediate Actions**:
1. Run `git status` to check for uncommitted changes
2. Read `docs/SESSION_SUMMARY_2025_11_25.md` (latest session, 5 min)
3. Read `docs/SPRINT_14_STATUS_UPDATED.md` (current sprint, 3 min)
4. Confirm with user which item to start (recommend Item #13)

**Recommended Starting Point**:
**Item #13: Invoice Creation Method Toggle** (4-5 hours)
- User's explicit request
- High value feature (gives user choice)
- Clear implementation plan exists
- No blockers, ready to start

**Before Starting Any Work**:
- [ ] User confirms priority (Item #13 or something else?)
- [ ] Check git status (no uncommitted changes?)
- [ ] Read relevant documentation
- [ ] Understand acceptance criteria

═══════════════════════════════════════════════════════════
                    COMMON PITFALLS TO AVOID
═══════════════════════════════════════════════════════════

❌ **Don't**:
1. Start coding without checking git status first
2. Assume field names (always verify in schema.prisma)
3. Use z.custom() without explicit validation function
4. Set invalid defaultValues in useForm config
5. Use watch() for form submission logic
6. Delete full-page routes (Item #13 needs both methods)
7. Skip quality gates (lint, typecheck, build)

✅ **Do**:
1. Run git status before debugging deployments
2. Check schema.prisma for exact field names
3. Use explicit validators: z.custom<T>((val) => boolean)
4. Use useEffect + setValue for form pre-filling
5. Accept validated data in onSubmit: (data: FormData) => {}
6. Keep both methods functional (toggle feature)
7. Run quality gates before EVERY commit

═══════════════════════════════════════════════════════════
                  SUCCESS METRICS (Latest Session)
═══════════════════════════════════════════════════════════

- ✅ Both critical items completed (Items #11 & #12)
- ✅ All quality gates passed (6/6 commits)
- ✅ Zero pre-existing lint errors remaining
- ✅ User confirmed: "it is working now"
- ✅ All acceptance criteria met
- ✅ Production deployment successful
- ✅ Sprint 14 progress: 23% → 38% (15% increase)

═══════════════════════════════════════════════════════════
                     READY TO START! 🚀
═══════════════════════════════════════════════════════════

**Your First Message Should Be**:
"Context restored! I see we just completed Sprint 14 Items #11 & #12 (edit buttons)
in the last session. Sprint 14 is now 38% complete (5/13 items).

I recommend starting with Item #13 (Invoice Creation Method Toggle) - it's your
explicit request and provides high user value. It will take 4-5 hours.

Shall we proceed with Item #13, or would you prefer to work on something else?"

═══════════════════════════════════════════════════════════
```

---

## 📚 Additional Context Documents (Optional Deep Dive)

If you need more specific context on any area, read these documents:

### **Sprint Planning**:
- `docs/SPRINTS_REVISED.md` - Complete sprint history and progress
- `docs/SPRINT_PLAN_DETAILED_V2.md` - Master plan (1,200+ lines)
- `docs/SPRINT_14_STATUS_UPDATED.md` - Current sprint details

### **Recent Sessions**:
- `docs/SESSION_SUMMARY_2025_11_25.md` - Today's session (Items #11 & #12)
- `docs/SESSION_SUMMARY_2025_11_24_DEBUGGING.md` - Production debugging
- `docs/SESSION_SUMMARY_2025_11_24_PLANNING_CLARIFICATION.md` - Planning session

### **Implementation Plans**:
- `docs/CONVERT_INVOICE_FORMS_TO_PANELS.md` - Item #13 plan (600+ lines)
- `docs/EDIT_BUTTON_WORKFLOW.md` - Items #11 & #12 plan (400+ lines)
- `docs/SECURITY_AUDIT_CHECKLIST.md` - Security audit steps (800+ lines)

### **Workflows**:
- `docs/VENDOR_APPROVAL_WORKFLOW.md` - Vendor approval process
- `docs/migrations/` - Database migration guides

### **Master Context**:
- `docs/CONTEXT_RESTORATION_PROMPT_MASTER.md` - Comprehensive context (400+ lines)
- `docs/SESSION_RESTORATION_GUIDE.md` - Quick start guide (30 seconds)

---

## 🎓 Key Technical Insights (Must Remember)

### **React Hook Form + Zod**:
```typescript
// ✅ CORRECT Pattern
const form = useForm({
  resolver: zodResolver(schema),
  mode: 'onBlur', // Validate on blur, not every keystroke
  // NO defaultValues if they fail validation
});

const onSubmit = async (validatedData: FormData) => {
  // ✅ Receives validated data from React Hook Form
  // ❌ Never use watch() here - bypasses validation
};

useEffect(() => {
  if (apiData) {
    setValue('field1', apiData.field1); // ✅ Pre-fill from API
  }
}, [apiData, setValue]);
```

### **Zod Custom Validators**:
```typescript
// ❌ WRONG - Rejects everything
file: z.custom<File>()

// ❌ WRONG - null/undefined rejected before .nullable() runs
file: z.custom<File>().nullable().optional()

// ✅ CORRECT - Explicitly allow null/undefined in validator
file: z.custom<File>((val) => {
  return val === null || val === undefined || val instanceof File;
}).nullable().optional()
```

### **Permission Checks**:
```typescript
// Client-side (controls UI visibility)
const isOwner = invoice?.created_by === Number(userId);
const isPending = invoice?.status === 'pending_approval';
const canEdit = isAdmin || (isOwner && !isPending);

// Server-side (enforces security - ALWAYS check both!)
if (!isAdmin) {
  if (invoice.created_by !== user.id) {
    return { success: false, error: 'Unauthorized' };
  }
  if (invoice.status === 'pending_approval') {
    return { success: false, error: 'Cannot edit pending invoice' };
  }
}
```

### **Database Field Names** (Always Verify):
```typescript
// ❌ WRONG - Assumed name
select: { profile_id: true }

// ✅ CORRECT - Actual field from schema.prisma
select: { invoice_profile_id: true }

// Pro tip: Always grep schema.prisma to confirm field names!
```

---

## 🚨 Critical Warnings

1. **NEVER commit `.env` file** - Contains DATABASE_URL secret
2. **ALWAYS check git status** before debugging deployments
3. **NEVER skip quality gates** - lint, typecheck, build
4. **ALWAYS verify field names** in schema.prisma
5. **NEVER use z.custom() without validator function**
6. **ALWAYS handle null/undefined** in Zod custom validators
7. **NEVER delete full-page routes** (toggle needs both methods)

---

## 📊 Project Health Metrics

**Code Quality**:
- ✅ Lint: 0 errors (all pre-existing fixed)
- ✅ TypeCheck: 0 errors
- ✅ Build: Successful (all routes compiled)
- ✅ Git: Clean working tree

**Test Coverage**:
- Manual testing: All features confirmed working
- User acceptance: "it is working now"
- Production: Deployed and stable

**Performance**:
- Build time: ~45 seconds
- Dev server: Fast refresh working
- Production: Railway deployment successful

---

## 🎯 v1.0.0 Launch Readiness

**Pre-Launch Checklist**:
- [ ] Sprint 14 complete (8 items remaining)
- [ ] Security audit complete (NOT STARTED)
- [ ] Documentation complete (NOT STARTED)
- [ ] Final QA testing
- [ ] Performance check (Lighthouse >90)
- [ ] Railway environment variables verified
- [ ] Database backup confirmed
- [ ] Rollback plan ready

**Estimated Time to Launch**: 43-60 hours (5-8 weeks)

---

**Last Updated**: November 25, 2025, 11:59 PM
**Session Status**: ✅ COMPLETE AND DOCUMENTED
**Ready for Next Session**: ✅ YES

**Next Session**: Start with Item #13 (Invoice Creation Toggle) ⭐
