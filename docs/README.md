# PayLog Documentation

This folder contains comprehensive documentation for the PayLog invoice management system.

---

## 📚 Document Index

### Core Documentation

#### 1. **QUICK_START.md**
**Purpose**: Fast onboarding for new development sessions
**Use when**: Starting a new coding session or onboarding a new developer

**Contains**:
- Current project status
- Development server setup
- Login credentials
- Email configuration
- Common commands
- Troubleshooting guide

**Read this first** if you're starting a new session!

---

#### 2. **SPRINTS.md**
**Purpose**: Complete sprint plan with technical implementation details
**Use when**: Planning work, understanding features, tracking progress

**Contains**:
- Sprint overview (12 sprints total)
- Story point tracking (88/179 complete)
- Detailed deliverables per sprint
- Technical highlights
- Acceptance criteria
- Implementation notes
- Files created/modified

**Sprint Status**:
- ✅ Sprint 1-6: Complete
- 🔲 Sprint 7-12: Planned

---

#### 3. **ATTACHMENTS.md**
**Purpose**: Technical documentation for file attachment system
**Use when**: Implementing, troubleshooting, or extending file upload functionality

**Contains**:
- Architecture overview (storage service, validation, UI components)
- Storage service interface and implementations
- Server Actions API reference
- API route endpoints
- UI component documentation
- Security measures (MIME validation, path traversal prevention)
- Testing guide (161 tests, 96.73% validation coverage)
- Configuration options
- Migration guide (local → S3/R2)
- Troubleshooting guide

**Key Topics**:
- Drag-and-drop upload
- Magic bytes MIME validation
- Permission-based access control
- Soft delete with audit trail
- Local filesystem storage (MVP)
- Cloud storage migration path

---

#### 4. **SESSION_HANDOFF_OCT15.md**
**Purpose**: Detailed session handoff from October 15, 2025 debugging session
**Use when**: Understanding email notification implementation, debugging email issues

**Contains**:
- Complete problem analysis (email notifications not working)
- Root cause investigation (workflow mismatch)
- Solution implementation (3 fixes applied)
- Technical challenges & solutions
- Email configuration guide (development & production)
- Testing & verification procedures
- Debugging workflow
- Known issues & limitations

**Key Topics**:
- Email notification debugging
- Resend integration
- Server Action lifecycle
- Fire-and-forget pattern
- Environment variable handling

---

## 🗂️ Document Hierarchy

```
docs/
├── README.md                      # This file - documentation index
├── QUICK_START.md                 # Fast onboarding guide
├── SPRINTS.md                     # Sprint plan & progress tracker
├── ATTACHMENTS.md                 # File attachments technical docs
└── SESSION_HANDOFF_OCT15.md       # Email notification debugging session
```

---

## 📖 Reading Order for New Sessions

### If you're starting fresh:
1. **QUICK_START.md** - Get the server running and understand current status
2. **SPRINTS.md** - Review Sprint 5 completion and Sprint 6 plan
3. **SESSION_HANDOFF_OCT15.md** - Understand the latest debugging session (if working on email features)

### If you're continuing email work:
1. **SESSION_HANDOFF_OCT15.md** - Complete context on email implementation
2. **SPRINTS.md** - Sprint 5 section for email notification details
3. **QUICK_START.md** - Email configuration reference

### If you're working on file attachments (Sprint 6):
1. **ATTACHMENTS.md** - Complete technical documentation
2. **QUICK_START.md** - User guide for uploading/downloading files
3. **SPRINTS.md** - Sprint 6 implementation summary

### If you're starting Sprint 7 (Advanced Features):
1. **QUICK_START.md** - Current status and Next Steps section
2. **SPRINTS.md** - Sprint 7 section for deliverables
3. **ATTACHMENTS.md** - (Optional) Learn from Sprint 6 implementation patterns

---

## 🎯 Document Purpose Summary

| Document | Length | Purpose | Update Frequency |
|----------|--------|---------|------------------|
| QUICK_START.md | 12 pages | Quick reference & onboarding | After major changes |
| SPRINTS.md | 30 pages | Sprint tracking & technical details | After each sprint |
| ATTACHMENTS.md | 45 pages | File attachments technical guide | When attachment system changes |
| SESSION_HANDOFF_OCT15.md | 30 pages | Debugging session chronicle | One-time (historical) |
| README.md | 4 pages | Documentation guide | When adding new docs |

---

## 🔍 Search Guide

### Find information about:

**Email notifications**:
- QUICK_START.md → "Current Email Configuration" section
- SESSION_HANDOFF_OCT15.md → Complete debugging guide
- SPRINTS.md → Sprint 5 → "Part A: Email Notifications"

**Server Actions**:
- SESSION_HANDOFF_OCT15.md → "Root Cause Analysis" section
- SPRINTS.md → Sprint 2 → "Invoice CRUD operations"

**Panel system**:
- QUICK_START.md → "Key Concepts" → "Panel System"
- SPRINTS.md → Sprint 2 → "Panel System Architecture"

**Database schema**:
- QUICK_START.md → "Common Development Tasks" → "Reset Database"
- SPRINTS.md → Each sprint's "Database enhancements" section

**Workflows**:
- QUICK_START.md → "Key Concepts" → "Invoice Workflow" / "Master Data Request Workflow"
- SPRINTS.md → Sprint 3 & Sprint 5 sections

**File attachments**:
- ATTACHMENTS.md → Complete technical documentation
- QUICK_START.md → "File Attachments (Sprint 6)" section
- SPRINTS.md → Sprint 6 → Implementation summary

**Troubleshooting**:
- QUICK_START.md → "Troubleshooting" section
- ATTACHMENTS.md → "Troubleshooting" section (file upload issues)
- SESSION_HANDOFF_OCT15.md → "Debugging Workflow" section

---

## 📝 Documentation Standards

### When to Create New Session Handoff Documents

Create a new `SESSION_HANDOFF_[DATE].md` when:
1. Major debugging session with valuable learnings
2. Significant architecture decisions made
3. Complex problem-solving that future sessions should reference
4. Multiple hours spent on a specific issue with clear resolution

### When to Update Existing Documents

**QUICK_START.md**: Update when:
- Email configuration changes
- New environment variables added
- Common commands change
- Project structure changes

**SPRINTS.md**: Update when:
- Sprint completes (mark with ✅)
- Story points adjust
- New technical implementation notes
- Acceptance criteria verified

**ATTACHMENTS.md**: Update when:
- Storage provider changes (local → S3/R2)
- New file types added
- Security measures updated
- API changes to Server Actions
- New UI components added

**SESSION_HANDOFF_*.md**: These are **historical snapshots** - never update, only create new ones.

---

## 🚀 Quick Links

### External Documentation
- **Next.js 14**: https://nextjs.org/docs
- **Prisma**: https://www.prisma.io/docs
- **NextAuth v5**: https://authjs.dev
- **Shadcn/ui**: https://ui.shadcn.com
- **Resend**: https://resend.com/docs
- **Recharts**: https://recharts.org/en-US/

### Development Tools
- **Resend Dashboard**: https://resend.com/domains
- **Resend Logs**: https://resend.com/logs
- **Prisma Studio**: `npx prisma studio` (http://localhost:5555)

### Code References
- Email Service: `/lib/email/service.ts:26-396`
- Email Config: `/lib/email/config.ts`
- Master Data Requests: `/app/actions/master-data-requests.ts`
- Panel System: `/components/panels/`
- Storage Service: `/lib/storage/`
- Attachment Actions: `/app/actions/attachments.ts`
- Attachment Components: `/components/attachments/`

---

## 📊 Project Status (As of October 15, 2025)

**Current Sprint**: 6 of 12 ✅ Complete
**Story Points**: 100/179 (55.9% complete)
**Next Sprint**: Sprint 7 - Advanced Invoice Features (14 SP)

**Completed Features**:
1. ✅ Authentication & RBAC
2. ✅ Stacked panel system
3. ✅ Invoice CRUD (12 fields)
4. ✅ Payment tracking & workflow
5. ✅ Search, filters, reporting with charts
6. ✅ Email notifications (Resend)
7. ✅ User-created master data requests
8. ✅ Admin approval workflow
9. ✅ File attachments (drag-drop upload, secure storage)

**Working Features**:
- Email notifications via Resend (`onboarding@resend.dev`)
- Real-time invoice status updates
- Due date intelligence system
- Master data request workflow
- Admin approval/rejection with email notifications
- File upload with drag-and-drop (PDF, PNG, JPG, DOCX)
- Secure file download and delete
- Magic bytes MIME validation
- Path traversal prevention

---

## 💡 Tips for Using These Docs

### For Quick Answers
Use **QUICK_START.md** - it's optimized for fast lookups

### For Deep Understanding
Read **SPRINTS.md** sprint sections in order - they build on each other

### For Debugging
Check **SESSION_HANDOFF_OCT15.md** - it shows a real debugging workflow from problem to solution

### For New Features
1. Check **SPRINTS.md** for planned sprints
2. Use **SESSION_HANDOFF_*.md** documents to learn from past challenges
3. Update **QUICK_START.md** after implementation

---

## 📞 Getting Help

### If something isn't working:
1. Check **QUICK_START.md** → Troubleshooting section
2. Review **SESSION_HANDOFF_OCT15.md** → Debugging Workflow
3. Check server logs for error messages
4. Verify environment variables in `.env`

### If you need to understand a feature:
1. Find the sprint in **SPRINTS.md**
2. Read the "Technical Highlights" section
3. Check "Files Created/Modified" for code references
4. Review acceptance criteria to understand requirements

### If you're planning new work:
1. Review **SPRINTS.md** → Next Sprint section
2. Check "Prerequisites" and "Key Decisions Needed"
3. Reference completed sprints for similar patterns
4. Update **QUICK_START.md** after completion

---

**Last Updated**: October 15, 2025
**Maintained By**: Development Team
**Status**: Current and up-to-date
