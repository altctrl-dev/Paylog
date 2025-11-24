# Context Restoration Prompt - Master Edition

**Created**: November 24, 2025
**Purpose**: THE definitive prompt for restoring full project context in new sessions
**Usage**: Copy this entire prompt to start a new Claude Code session

---

## 🎯 COPY THIS PROMPT TO RESTORE CONTEXT

```
I need you to restore FULL context for the PayLog project.

**Project**: PayLog - Invoice Management System
**Tech Stack**: Next.js 14 (App Router), TypeScript, Prisma, PostgreSQL, Railway, NextAuth, Radix UI
**Production URL**: https://paylog-production-5265.up.railway.net:28921/railway

**Current Status** (November 24, 2025):
- **Progress**: 197.5/208 SP (94.9% complete)
- **Sprint 14**: 4/13 items complete, 9 remaining (~31-42 hours)
- **Sprint 13 Phase 6** (Documentation): NOT started (8-10 hours)
- **Security Audit**: NOT started (8-12 hours)

**Execution Order** (CONFIRMED):
Sprint 14 → Security Audit → Sprint 13 Phase 6 (Documentation) → v1.0.0 Launch

**Next Priority**:
1. Sprint 14 Item #11 & #12 (Edit buttons) - 6-8h 🔥 CRITICAL
2. Sprint 14 Item #13 (Invoice creation toggle) - 4-5h ⭐ NEW FEATURE
3. Remaining Sprint 14 items (7 items, ~21-28h)
4. Security Audit (8-12h)
5. Documentation (8-10h)
6. Launch v1.0.0 (2-4h)

**IMPORTANT - What's Complete vs Planned**:
✅ **Planning documents created** (these are NOT deliverables):
   - SPRINT_PLAN_DETAILED_V2.md (master plan)
   - SECURITY_AUDIT_CHECKLIST.md (checklist, not actual audit)
   - EDIT_BUTTON_WORKFLOW.md (implementation plan)
   - CONVERT_INVOICE_FORMS_TO_PANELS.md (panel conversion + toggle feature)
   - SESSION_RESTORATION_GUIDE.md (quick start guide)

❌ **Actual deliverables NOT started** (Sprint 13 Phase 6):
   - Production deployment guide
   - Complete USER_GUIDE.md
   - API documentation
   - Changelog (Sprints 13-14)
   - v1.0.0 release notes
   - Migration guide

**Critical Lesson from Nov 24**:
> ALWAYS check `git status` BEFORE debugging deployment issues!
> Last session spent 3 hours debugging when root cause was uncommitted changes.

**Key Insight**:
Planning documents (checklists, workflows) ≠ Actual documentation deliverables (USER_GUIDE.md, API docs)

**Files to Read for Context**:
1. docs/SESSION_RESTORATION_GUIDE.md (30-second overview)
2. docs/SPRINT_PLAN_DETAILED_V2.md (comprehensive plan)
3. docs/SPRINT_14_STATUS_UPDATED.md (current sprint status)
4. docs/SESSION_SUMMARY_2025_11_24_PLANNING_CLARIFICATION.md (latest session summary)

**Git Status Check**:
Run `git status` immediately to see if there are uncommitted changes.

**Ready to start**: Sprint 14 Item #11 & #12 (Edit buttons for admins and standard users)
```

---

## 📚 Detailed Context Below (For Reference)

### **Project Overview**

**PayLog** is an invoice management system with the following features:
- Multi-tenant with RBAC (super_admin, admin, standard_user)
- Invoice workflows (create → pending_approval → approved → paid)
- Recurring and non-recurring invoices
- Vendor approval workflow
- Master data management (vendors, categories, entities, currencies, payment types)
- Dashboard with KPIs and analytics
- File attachments
- Activity logging
- Modern UI with collapsible sidebar and stacked panels

---

### **Sprint 14 Status (13 Items Total)**

**✅ Complete (4/13)**:
1. Item #1: Approval buttons in invoice detail panel
2. Item #2: User Details panel loading fix
3. Item #3: Currency display with proper symbols
4. Item #5: Side panel styling (80% done)

**🔥 CRITICAL (2/13)** - DO FIRST:
5. Item #11: Edit button doesn't work for admins (shows "coming soon" toast)
6. Item #12: Edit button missing for standard users

**⭐ NEW FEATURE (1/13)** - HIGH VALUE:
7. Item #13: Invoice creation method toggle
   - Toggle in Settings to switch between full-page and panel methods
   - User preference: `use_panel_for_invoice_creation` (database field)
   - Conditional routing based on preference
   - Keep BOTH methods functional
   - Estimated: 4-5 hours

**❌ TODO (6/13)**:
8. Item #4: Amount field '0' placeholder UX (2-3h)
9. Item #6: Payment types CRUD implementation (4-5h)
10. Item #7: Billing frequency mandatory field (3-5h)
11. Item #8: Activities tab (replace My Requests) (4-5h)
12. Item #9: Settings restructure (Profile, Security, Activities tabs) (3-4h)
13. Item #10: Invoice tabs (Recurring, All, TDS) (4-5h)

**Total Remaining**: ~31-42 hours

---

### **Edit Button Business Rules** (Items #11 & #12)

**Standard Users**:
1. ✅ Can create invoices → status becomes "pending_approval"
2. ❌ **Cannot edit while status = "pending_approval"** (must wait for admin)
3. ✅ Can edit after admin action (approved/rejected/on_hold)
4. 🔄 Editing changes status back to "pending_approval"
5. 🔒 Can only edit own invoices

**Admins**:
1. ✅ Can edit any invoice in any status
2. ✅ Edits don't change status

**Current Problem**:
- `components/invoices/invoice-detail-panel-v2.tsx` line 104: `const canEdit = isAdmin;`
- This prevents standard users from editing entirely
- Admin edit button shows "coming soon" toast (line 66-75)

**Required Logic**:
```typescript
const isOwner = invoice?.created_by_id === session?.user?.id;
const isStandardUser = session?.user?.role === 'standard_user';
const isPending = invoice?.status === 'pending_approval';

const canEdit =
  isAdmin ||
  (isOwner && isStandardUser && !isPending);
```

**Detailed Plan**: See `docs/EDIT_BUTTON_WORKFLOW.md`

---

### **Invoice Creation Toggle Feature** (Item #13)

**User Request**:
> "I would like to have a toggle button on the settings to switch between current method and the sidepanel method to use them both and decide later."

**Method 1 - Full Pages (Current)**:
- Routes: `/invoices/new/recurring`, `/invoices/new/non-recurring`
- Full page with all fields
- More screen real estate

**Method 2 - Side Panels (New)**:
- Click "Add Invoice" → Panel slides in
- Choose type → Form opens in stacked panel
- Stay on invoice list
- Better for quick data entry

**Implementation**:
1. Add `use_panel_for_invoice_creation BOOLEAN DEFAULT true` to users table
2. Create Settings toggle UI
3. Create panel wrapper components (RecurringInvoicePanel, NonRecurringInvoicePanel, InvoiceTypeSelectorPanel)
4. Implement conditional routing (check preference → open panel OR navigate to route)
5. Keep BOTH routes functional (don't delete anything)

**Detailed Plan**: See `docs/CONVERT_INVOICE_FORMS_TO_PANELS.md`

---

### **Sprint 13 Phase 6 - Documentation** (NOT STARTED)

**Status**: ⏳ NEXT after Sprint 14 + Security Audit
**Estimated Time**: 8-10 hours
**Story Points**: 1.5 SP

**Required Deliverables**:
1. Production deployment guide (env vars, database setup, migrations, build, deploy)
2. Complete USER_GUIDE.md (remaining sections: Invoices, Master Data, Users)
3. API documentation (all server actions with examples)
4. Changelog generation (Sprints 1-13, v1.0.0 entry)
5. v1.0.0 release notes (features list, known limitations, upgrade path)
6. Migration guide (vendor approval workflow, invoice_received_date field)

**When**: After Sprint 14 + Security Audit, BEFORE v1.0.0 launch

---

### **Security Audit** (NOT STARTED)

**Status**: NOT started (only checklist exists)
**Estimated Time**: 8-12 hours
**When**: After Sprint 14, BEFORE documentation

**Checklist Categories**:
1. Automated scans (npm audit, Snyk, ESLint security)
2. Authentication & Authorization (NextAuth, RBAC, last admin protection)
3. Input validation (SQL injection, XSS prevention)
4. Data protection (secrets, sensitive data handling)
5. API security (rate limiting, CORS, headers)
6. Penetration testing (OWASP Top 10)
7. Compliance (GDPR, audit logging)

**Target**: ZERO high-priority vulnerabilities before v1.0.0

**Checklist**: See `docs/SECURITY_AUDIT_CHECKLIST.md`

---

### **Recent Sessions Summary**

**Nov 24, 2025 (Latest)** - Planning Clarification:
- Clarified Sprint 13 Phase 6 (Documentation) is NOT complete
- Added Item #13 (Invoice creation toggle feature)
- Updated all planning documents
- Created comprehensive session summary
- User confirmed: "documentation stuffs at the end of everything"

**Nov 24, 2025 (Earlier)** - Production Debugging:
- Fixed 4 critical bugs (currency, panel caching, NavbarPlusMenu, password reset)
- Root cause: Uncommitted `header-v2.tsx` changes
- Lesson: ALWAYS check `git status` before debugging deployments

**Nov 22, 2025** - Railway Deployment Fixes:
- Fixed 11 Railway build failures
- All Invoice V2 components deployed successfully
- Sprint 13 Phase 5 (Vendor Approval Workflow) completed

**Nov 21, 2025** - Invoice V2 Detail Page:
- Built complete Invoice V2 detail panel (~370 lines)
- Added `invoice_received_date` to schema
- Fixed toast notifications

**Nov 18, 2025** - UI v2 Redesign:
- Complete UI v2 redesign (collapsible sidebar 240px ↔ 60px)
- Modern navbar with search
- Framer Motion animations
- Mobile responsive

---

### **Key Insights & Lessons**

**1. Planning Docs ≠ Deliverables**:
- SECURITY_AUDIT_CHECKLIST.md = Planning (how to audit)
- Actual security audit report = Deliverable (audit results)
- Always clarify: "Is this the plan OR the actual deliverable?"

**2. Git Status First**:
- ALWAYS run `git status` before debugging deployment issues
- Uncommitted changes won't be deployed to Railway
- Can save hours of debugging time

**3. User Preferences > Perfect Architecture**:
- Toggle feature > forcing one method
- User flexibility wins
- Can gather data and decide later

**4. Context Restoration**:
- Read SESSION_RESTORATION_GUIDE.md first (30 seconds)
- Check SPRINTS_REVISED.md for source of truth
- Verify what's actually complete vs just planned
- Ask questions if uncertain

---

### **File Locations**

**Essential Documentation**:
- `docs/SESSION_RESTORATION_GUIDE.md` - Quick start (30 seconds)
- `docs/SPRINT_PLAN_DETAILED_V2.md` - Master plan (1,200+ lines)
- `docs/SPRINT_14_STATUS_UPDATED.md` - Sprint 14 status
- `docs/SPRINTS_REVISED.md` - Overall progress tracker
- `docs/SESSION_SUMMARY_2025_11_24_PLANNING_CLARIFICATION.md` - Latest session

**Implementation Plans**:
- `docs/EDIT_BUTTON_WORKFLOW.md` - Edit button business rules (400+ lines)
- `docs/CONVERT_INVOICE_FORMS_TO_PANELS.md` - Toggle feature plan (600+ lines)
- `docs/SECURITY_AUDIT_CHECKLIST.md` - Security audit steps (800+ lines)

**Key Code Files**:
- `components/invoices/invoice-detail-panel-v2.tsx` - Invoice detail panel (needs edit button fix)
- `lib/utils/format.ts` - Currency formatting (lines 94-145)
- `prisma/schema.prisma` - Database schema
- `app/(dashboard)/invoices/page.tsx` - Invoice list page
- `components/layout-v2/navbar-plus-menu.tsx` - '+' button menu

**Database**:
- Production: Railway PostgreSQL
- Connection: `DATABASE_URL` in `.env` (never commit!)
- Migrations: `prisma/migrations/` directory

---

### **Common Pitfalls to Avoid**

❌ **Don't**:
1. Start implementing without checking git status first
2. Confuse planning documents with actual deliverables
3. Start Sprint 13 Phase 6 (Documentation) before Sprint 14 is complete
4. Delete full-page invoice routes (toggle feature needs both methods)
5. Assume what's in planning docs has been implemented

✅ **Do**:
1. Run `git status` immediately after context restoration
2. Read SESSION_RESTORATION_GUIDE.md first
3. Verify actual completion status before proceeding
4. Follow execution order: Sprint 14 → Security Audit → Documentation → Launch
5. Ask user for clarification if priorities are unclear

---

### **Quality Gates**

Before marking ANY item complete:
1. ✅ Lint passes: `pnpm lint`
2. ✅ TypeCheck passes: `pnpm typecheck`
3. ✅ Build succeeds: `pnpm build`
4. ✅ Tests pass (if applicable)
5. ✅ Manual testing confirms functionality
6. ✅ Git committed and pushed to main
7. ✅ Railway deployment successful

---

### **v1.0.0 Launch Readiness**

**Pre-Launch Checklist**:
- [ ] Sprint 14 complete (all 13 items)
- [ ] Security audit passed (no high-priority vulns)
- [ ] Documentation complete (6 deliverables)
- [ ] Final QA testing (all workflows)
- [ ] Performance check (Lighthouse >90)
- [ ] Railway environment variables verified
- [ ] Database backup confirmed
- [ ] Rollback plan ready

**Current Estimate**: 48-66 hours to v1.0.0 (6-8 weeks)

---

### **Tech Stack Quick Reference**

**Frontend**:
- React 18, Next.js 14 App Router
- TypeScript (strict mode)
- shadcn/ui components (Radix UI primitives)
- TailwindCSS for styling
- Framer Motion for animations
- React Query (TanStack Query) for data fetching

**Backend**:
- Next.js Server Actions
- Prisma ORM (PostgreSQL)
- NextAuth.js (credentials provider)
- bcrypt for password hashing

**Database**:
- PostgreSQL on Railway
- Prisma migrations
- Connection pooling

**Deployment**:
- Railway (auto-deploy from main branch)
- Build command: `pnpm build`
- Start command: `pnpm start`
- Node.js 18+

**Dev Commands**:
- `pnpm dev` - Start dev server (localhost:3000)
- `pnpm lint` - Run ESLint
- `pnpm typecheck` - Run TypeScript compiler
- `pnpm build` - Build for production
- `pnpm prisma studio` - Open Prisma Studio (database GUI)
- `pnpm prisma migrate dev` - Create and apply migration

---

## 🎬 Ready to Start?

**Your first actions should be**:
1. Run `git status` to check for uncommitted changes
2. Read `docs/SESSION_RESTORATION_GUIDE.md` (30 seconds)
3. Read `docs/SPRINT_14_STATUS_UPDATED.md` (current sprint)
4. Confirm with user which item to start (recommend Item #11 & #12)

**Recommended Starting Point**:
Sprint 14 Item #11 & #12 (Edit Buttons) - 6-8 hours
- CRITICAL: Blocks invoice editing workflow
- Business rules confirmed
- Detailed plan exists in EDIT_BUTTON_WORKFLOW.md
- Clear acceptance criteria

**Good luck! 🚀**

---

**Last Updated**: November 24, 2025
**Next Update**: After Sprint 14 completion or major milestone
