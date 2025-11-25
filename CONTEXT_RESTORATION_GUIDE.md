# Context Restoration Guide - Quick Reference

**Use this guide to quickly restore context at the start of any new session.**

---

## 🚀 QUICK START (Use This First!)

Copy and paste this prompt to restore full context:

```
I need to restore the complete context for the PayLog project. Please read:

1. /Users/althaf/Projects/paylog-3/docs/ULTIMATE_CONTEXT_RESTORATION_PROMPT.md

This document contains the complete restoration prompt with references to all other documents.

After reading, confirm you're ready to start with Item #4 (Amount Field UX).
```

---

## 📊 Current Status (As of Nov 25, 2025 9:00 PM)

**Overall Progress**: 95.4% complete (198.4/208 SP)
**Sprint 14**: 38% complete (5/13 items)
**Remaining**: 8 items, 25-34 hours

**Completed in Previous Session**:
- ✅ Item #11: Edit Button for Admins
- ✅ Item #12: Edit Button for Standard Users
- ✅ 8 bugs fixed through 6 iterations
- ✅ All pre-existing lint errors resolved
- ✅ 1,940 lines of code across 12 files

---

## 🎯 Next Priority (Your Top Priority)

**Item #4: Amount Field '0' Placeholder Behavior**
- **Effort**: 2-3 hours
- **Why**: Quick UX win, affects all invoice forms
- **Problem**: Typing "1500" becomes "01500"
- **Solution**: Create smart AmountInput component

**Implementation Plan**:
1. Create `components/invoices-v2/amount-input.tsx` (30 mins)
2. Replace in all 8+ invoice forms (1.5-2 hours)
3. Test focus/blur/submission behavior (30 mins)

---

## 📋 NEW Priority Order (You Requested This)

1. **Priority 1**: Item #4 - Amount Field UX (2-3h) 🔥 NEXT
2. **Priority 2**: Item #6 - Payment Types (4-5h)
3. **Priority 3**: Item #7 - Billing Frequency (3-5h)
4. **Priority 4**: Item #5 - Panel Styling (1-2h)
5. **Priority 5**: Item #8 - Activities Tab (4-5h)
6. **Priority 6**: Item #9 - Settings Restructure (3-4h)
7. **Priority 7**: Item #10 - Invoice Tabs (4-5h)
8. **Priority 8**: Item #13 - Invoice Creation Toggle (4-5h)

---

## ⚠️ Critical Warnings (Don't Forget These!)

### **1. Zod Custom Validators**
```typescript
// ❌ WRONG - Rejects null/undefined
z.custom<File>().nullable().optional()

// ✅ CORRECT - Explicitly allows null/undefined
z.custom<File>((val) => val === null || val === undefined || val instanceof File).nullable().optional()
```
**Why**: Custom validators run BEFORE `.nullable()` and `.optional()`

### **2. React Hook Form onSubmit**
```typescript
// ❌ WRONG - Bypasses validation
const onSubmit = async () => { const data = watch(); }

// ✅ CORRECT - Receives validated data
const onSubmit = async (validatedData: FormData) => { }
```

### **3. Form DefaultValues**
```typescript
// ❌ WRONG - Invalid defaults
defaultValues: { invoice_profile_id: 0 } // Fails validation!

// ✅ CORRECT - Use useEffect + setValue
useEffect(() => { setValue('invoice_profile_id', data.invoice_profile_id); }, [data]);
```

### **4. Database Field Names**
Always check `schema.prisma` for exact field names!
- ❌ `profile_id` (assumed, doesn't exist)
- ✅ `invoice_profile_id` (actual field)

---

## 👤 Your Preferences (Mandatory to Follow)

1. **Additive Approach**: "Always take an additive approach. Don't delete anything that you don't understand."
2. **Quality Gates**: Lint, TypeCheck, Build must pass before EVERY commit
3. **Fix All Errors**: "We are all on the same team. Fix all pre-existing and existing errors."
4. **Document Everything**: Create comprehensive documentation for future sessions

---

## 🛠️ Development Commands

```bash
# Start dev server
pnpm dev

# Quality gates (run before EVERY commit)
pnpm lint
pnpm typecheck
pnpm build

# Database
pnpm prisma studio

# Git workflow
git add .
git commit -m "type: message"
git push  # Auto-deploys to Railway
```

---

## 📁 Key Documents (All in /docs/)

1. **ULTIMATE_CONTEXT_RESTORATION_PROMPT.md** - Main restoration prompt
2. **SESSION_SUMMARY_2025_11_25_FINAL.md** - Latest session summary
3. **SPRINT_14_STATUS_UPDATED.md** - Sprint 14 status with NEW priorities
4. **COMPREHENSIVE_SESSION_ANALYSIS_2025_11_25.md** - Complete technical deep dive
5. **CONTEXT_RESTORATION_PROMPT_2025_11_25.md** - Original restoration prompt

---

## 🔄 If Context Gets Lost Mid-Session

If Claude forgets context during a session:

```
Please re-read: /Users/althaf/Projects/paylog-3/docs/ULTIMATE_CONTEXT_RESTORATION_PROMPT.md

Specifically remind yourself:
- Current priority: Item #4 (Amount Field UX)
- My preferences: Additive approach, quality gates, fix all errors
- Technical warnings: Zod validators, React Hook Form, database fields
```

---

## ✅ Quality Checklist (Before Every Commit)

- [ ] `pnpm lint` passes (0 errors, 0 warnings)
- [ ] `pnpm typecheck` passes (0 errors)
- [ ] `pnpm build` succeeds
- [ ] Manual testing complete
- [ ] Clear commit message (conventional commits)
- [ ] No files deleted without understanding
- [ ] All pre-existing errors fixed

---

## 🎯 Week-by-Week Plan

### **Week 1** (6-8 hours):
- Item #4: Amount Field (2-3h)
- Item #6: Payment Types (4-5h)

### **Week 2** (7-10 hours):
- Item #7: Billing Frequency (3-5h)
- Item #5: Panel Styling (1-2h)
- Item #8: Activities Tab (start, 4-5h)

### **Week 3-4** (11-17 hours):
- Item #8: Activities Tab (complete if needed)
- Item #9: Settings Restructure (3-4h)
- Item #10: Invoice Tabs (4-5h)
- Item #13: Invoice Creation Toggle (4-5h)

**Estimated Completion**: 3-5 weeks

---

## 📊 Path to v1.0.0

1. Sprint 14 (remaining 8 items): 25-34 hours
2. Sprint 13 Phase 6 (Documentation): 8-10 hours
3. Security Audit: 8-12 hours
4. v1.0.0 Launch: 2-4 hours

**Total Remaining**: 43-60 hours (5-8 weeks)

---

## 🔗 Quick Links

- **Project**: PayLog (expense management system)
- **Stack**: Next.js 14, TypeScript, Prisma, PostgreSQL
- **Deployment**: Railway (auto-deploy from main)
- **Database**: Railway PostgreSQL
- **Repository**: GitHub (altctrl-dev/Paylog)

---

## 📞 If You Need Help

If Claude needs clarification:
1. Refer to ULTIMATE_CONTEXT_RESTORATION_PROMPT.md
2. Check SPRINT_14_STATUS_UPDATED.md for detailed plans
3. Review COMPREHENSIVE_SESSION_ANALYSIS for technical patterns
4. Ask user for clarification if still unclear

---

**Last Updated**: November 25, 2025, 9:00 PM
**Status**: ✅ Ready for Next Session
**Next Task**: Item #4 (Amount Field UX) - 2-3 hours

---

## 🎉 Ready to Code!

Everything is documented. Context can be restored instantly. Priorities are clear.

**Start your next session with the Quick Start prompt above!**
