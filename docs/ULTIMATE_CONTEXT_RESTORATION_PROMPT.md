# Ultimate Context Restoration Prompt for PayLog Project

**Use this prompt to restore full context at the start of any new session.**

---

## 🔥 PROMPT (Copy & Paste This)

```
I need to restore the complete context for the PayLog project. This is a continuation session.

Please read these documents in the following order:

1. /Users/althaf/Projects/paylog-3/docs/CONTEXT_RESTORATION_PROMPT_2025_11_25.md
   (Ultimate restoration prompt with project overview, current status, and critical information)

2. /Users/althaf/Projects/paylog-3/docs/SESSION_SUMMARY_2025_11_25_FINAL.md
   (Latest session summary: Items #11 & #12 completed, priorities reordered)

3. /Users/althaf/Projects/paylog-3/docs/SPRINT_14_STATUS_UPDATED.md
   (Sprint 14 status with NEW priority order dated Nov 25, 2025 9:00 PM)

4. /Users/althaf/Projects/paylog-3/docs/COMPREHENSIVE_SESSION_ANALYSIS_2025_11_25.md
   (Complete technical deep dive: 1,337 lines, all bugs, patterns, and lessons learned)

After reading all documents, please confirm you understand:

**Project Status**:
- Overall: 95.4% complete (198.4/208 SP)
- Sprint 14: 38% complete (5/13 items)
- Items #11 & #12 completed in previous session
- 8 items remaining, 25-34 hours of work

**Next Priority (User Confirmed)**:
Item #4: Amount Field '0' Placeholder Behavior
- Effort: 2-3 hours
- Why: Quick UX win, affects all invoice forms
- Problem: Typing "1500" becomes "01500"
- Solution: Smart AmountInput component

**NEW Priority Order (as of Nov 25, 2025 9:00 PM)**:
1. Item #4: Amount Field UX (2-3h)
2. Item #6: Payment Types (4-5h)
3. Item #7: Billing Frequency (3-5h)
4. Item #5: Panel Styling (1-2h)
5. Item #8: Activities Tab (4-5h)
6. Item #9: Settings Restructure (3-4h)
7. Item #10: Invoice Tabs (4-5h)
8. Item #13: Invoice Creation Toggle (4-5h)

**Critical Technical Warnings**:
1. Zod custom validators run BEFORE `.nullable()` and `.optional()` - must explicitly handle null/undefined
2. React Hook Form onSubmit must accept validated data parameter, never use watch() for submission
3. Never set invalid defaultValues that fail schema validation - use useEffect + setValue instead
4. Always verify database field names in schema.prisma - don't assume based on relation names
5. Client-side Zod defaults don't work - set defaults in form config

**User Preferences (MANDATORY)**:
- ✅ Always take an additive approach (don't delete anything you don't understand)
- ✅ Quality gates mandatory before every commit: Lint, TypeCheck, Build
- ✅ Fix all errors (pre-existing + new): "We are all on the same team"
- ✅ Document everything thoroughly for future context restoration

**Established Code Patterns**:
- Permission logic: `isAdmin || (isOwner && !isPending)`
- Server authorization: Check both ownership and status
- File upload: Optional with explicit null/undefined handling
- Form pre-filling: useEffect + setValue (NOT defaultValues)
- Number inputs: No spinner arrows (global CSS)

**Development Commands**:
- pnpm dev (start dev server)
- pnpm lint (ESLint)
- pnpm typecheck (TypeScript)
- pnpm build (production build)
- pnpm prisma studio (database GUI)

**Git Workflow**:
- Commit after passing all quality gates
- Push to main → auto-deploys to Railway
- Conventional commits: feat:, fix:, chore:, docs:

Please confirm:
1. You understand the current project status
2. You understand the next priority (Item #4)
3. You understand the critical technical warnings
4. You understand the user's preferences
5. You're ready to start with Item #4 (Amount Field UX)
```

---

## 📋 What This Prompt Does

**Restores Full Context**:
- ✅ Project overview (PayLog, Next.js 14, TypeScript, Prisma, Railway)
- ✅ Current progress (95.4% overall, Sprint 14: 38%)
- ✅ What was just completed (Items #11 & #12 - edit forms with RBAC)
- ✅ What's next (Item #4 - Amount Field UX)
- ✅ Remaining work (8 items, 25-34 hours)
- ✅ NEW priority order (user-confirmed as of Nov 25, 2025 9:00 PM)

**Critical Information**:
- ✅ All technical warnings (Zod validators, React Hook Form, database fields)
- ✅ User preferences (additive approach, quality gates, documentation)
- ✅ Established code patterns (permissions, server auth, file uploads, forms)
- ✅ Development workflow (commands, git, Railway deployment)

**Technical Deep Dive**:
- ✅ All 8 bugs encountered and fixed
- ✅ Code architecture patterns
- ✅ Complete file manifest
- ✅ Quality gate procedures

---

## 🎯 When to Use This Prompt

**Use at the start of ANY new session**:
- ✅ After context window expires
- ✅ After closing and reopening Claude Code
- ✅ When starting a new day/session
- ✅ When returning after a break
- ✅ When another developer takes over

**Benefits**:
- ⚡ Instant context restoration (no back-and-forth)
- 🎯 Clear next priority (Item #4)
- 🚀 Ready to code immediately
- 📚 All technical insights preserved
- 🔒 User preferences enforced

---

## 📖 Document Structure

The prompt references 4 key documents in order of importance:

### **1. CONTEXT_RESTORATION_PROMPT_2025_11_25.md** (500+ lines)
**Purpose**: Primary restoration document
**Contains**:
- Project overview and tech stack
- Current status (what's done, what's next)
- Critical warnings (what to avoid)
- Development workflow
- Common pitfalls
- Quick reference (files, commands)

### **2. SESSION_SUMMARY_2025_11_25_FINAL.md** (this document)
**Purpose**: Latest session summary
**Contains**:
- What was accomplished (Items #11 & #12 + priorities)
- All bugs fixed (8 bugs through 6 iterations)
- Technical lessons learned
- Sprint 14 progress update
- Next priority (Item #4)

### **3. SPRINT_14_STATUS_UPDATED.md** (850+ lines)
**Purpose**: Sprint 14 detailed status with NEW priorities
**Contains**:
- Complete item list (13 items)
- NEW priority order (1-8)
- Detailed implementation plans for each item
- Acceptance criteria
- Week-by-week execution plan

### **4. COMPREHENSIVE_SESSION_ANALYSIS_2025_11_25.md** (1,337 lines)
**Purpose**: Complete technical deep dive
**Contains**:
- Chronological timeline (10 phases)
- All 8 bugs with root causes and fixes
- Code architecture patterns established
- Complete file manifest (every file modified)
- Quality assurance details (all commits, quality gates)

---

## 🚀 Expected Response After Using This Prompt

After using this prompt, Claude should respond with:

```
✅ Context fully restored!

**Project Status Confirmed**:
- PayLog: Next.js 14, TypeScript, Prisma, PostgreSQL, Railway
- Overall: 95.4% complete (198.4/208 SP)
- Sprint 14: 38% complete (5/13 items)
- Previous session: Items #11 & #12 (edit forms) ✅ DONE
- 8 items remaining, 25-34 hours

**Next Priority Confirmed**:
Item #4: Amount Field '0' Placeholder Behavior (2-3 hours)
- Problem: Typing "1500" becomes "01500"
- Solution: Create AmountInput component with smart placeholder
- Affects: All invoice forms (create + edit)
- Implementation Plan:
  1. Create AmountInput component (30 mins)
  2. Replace in all 8+ forms (1.5-2 hours)
  3. Test focus/blur/submission (30 mins)

**NEW Priority Order Confirmed**:
1. Item #4: Amount Field (2-3h) - NEXT UP
2. Item #6: Payment Types (4-5h)
3. Item #7: Billing Frequency (3-5h)
4. Item #5: Panel Styling (1-2h)
5. Item #8: Activities Tab (4-5h)
6. Item #9: Settings Restructure (3-4h)
7. Item #10: Invoice Tabs (4-5h)
8. Item #13: Invoice Creation Toggle (4-5h)

**Critical Warnings Acknowledged**:
✅ Zod custom validators run BEFORE .nullable()/.optional()
✅ React Hook Form onSubmit must accept validated data
✅ Never set invalid defaultValues - use useEffect + setValue
✅ Always verify database field names in schema.prisma
✅ Client-side Zod defaults don't work

**User Preferences Acknowledged**:
✅ Additive approach (don't delete)
✅ Quality gates mandatory (Lint, TypeCheck, Build)
✅ Fix all errors (pre-existing + new)
✅ Document everything thoroughly

**Ready to implement Item #4 (Amount Field UX)!**

Shall I start by creating the AmountInput component?
```

---

## 💡 Pro Tips

### **For Users**:
1. **Save this prompt**: Bookmark or copy to a text file
2. **Use at session start**: Paste immediately when starting new session
3. **Verify response**: Ensure Claude confirms all key points
4. **If unclear**: Ask Claude to re-read specific documents

### **For Claude**:
1. **Read all 4 documents**: Don't skip any
2. **Confirm everything**: Show you understand all key points
3. **Be specific**: Reference exact items, file paths, line numbers
4. **Ask if unsure**: Better to clarify than assume

### **Quality Checks**:
- ✅ Claude mentions "Item #4" as next priority
- ✅ Claude lists NEW priority order (1-8)
- ✅ Claude mentions specific technical warnings (Zod, React Hook Form)
- ✅ Claude acknowledges user preferences (additive, quality gates)
- ✅ Claude is ready to code immediately (no more questions)

---

## 📊 Success Metrics

**This prompt is successful if**:
- ⚡ Context restored in <2 minutes
- 🎯 Next task clear and ready to start
- 📚 All technical insights preserved
- 🚀 No back-and-forth questions needed
- ✅ Quality maintained across sessions

**This prompt needs improvement if**:
- ❌ Claude asks basic project questions
- ❌ Claude doesn't know what's next
- ❌ Claude repeats fixed bugs
- ❌ Claude forgets user preferences
- ❌ Claude asks for priority clarification

---

## 🔄 Maintenance

**Update this prompt when**:
- ✅ Sprint 14 completes (move to Sprint 15)
- ✅ Major milestones reached (v1.0.0 launch)
- ✅ Priorities change (user requests reorder)
- ✅ New critical warnings discovered
- ✅ User preferences change

**How to update**:
1. Update document file paths (if names change)
2. Update priority order (if user reorders)
3. Update current status (Sprint X, Y% complete)
4. Update next priority (new item number)
5. Add new critical warnings (if discovered)
6. Update date references (session dates)

---

## 📝 Version History

**v1.0** - November 25, 2025, 9:00 PM
- Initial creation
- References 4 comprehensive documents
- Includes NEW priority order (Items #4, #6, #7, #5, #8, #9, #10, #13)
- All critical warnings included
- User preferences documented
- Next priority: Item #4 (Amount Field UX)

---

**Last Updated**: November 25, 2025, 9:00 PM
**Status**: ✅ READY FOR USE
**Next Review**: After Sprint 14 completion or priority change
