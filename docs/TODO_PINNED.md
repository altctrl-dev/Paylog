# 📌 Pinned Tasks - PayLog

**Last Updated**: November 18, 2025
**Status**: ON HOLD (UI redesign in progress)

---

## 🎯 Sprint 13 Phase 4: Documentation & Release Prep (1 SP)

**Priority**: HIGH (Required for v1.0.0 launch)
**Estimated Time**: 3-4 hours

### Deliverables

- [ ] **Production Deployment Guide**
  - Environment variables (Railway)
  - Database setup and migrations
  - Build and deploy process
  - Rollback procedures

- [ ] **Complete USER_GUIDE.md**
  - Invoices section (create, edit, workflows)
  - Master Data section (vendors, categories, profiles)
  - Users section (admin user management)
  - Dashboard section (KPIs, reports)

- [ ] **API Documentation**
  - Document all Server Actions
  - Include request/response examples
  - Add authentication requirements
  - Error handling patterns

- [ ] **Changelog Generation**
  - Sprints 1-13 summary
  - v1.0.0 release entry
  - Breaking changes (if any)

- [ ] **v1.0.0 Release Notes**
  - Feature list (comprehensive)
  - Known limitations
  - Upgrade path from 0.x
  - Migration guide

---

## 🔐 Sprint 14: Post-Launch Enhancements (6 SP)

**Priority**: MEDIUM (Post-v1.0.0 features)
**Estimated Time**: 14-16 hours

### Phase 1: Database Schema Changes (1 SP)

- [ ] Add `force_password_change` boolean to User model
- [ ] Add `password_expires_at` timestamp to User model
- [ ] Create `SecuritySettings` table (singleton)
  - Password policy fields
  - Session timeout settings
  - Login rate limiting
  - Bcrypt cost configuration
- [ ] Create `LoginHistory` table
  - IP address, user agent, device tracking
  - Success/failure tracking
- [ ] Run migrations (zero downtime)

### Phase 2: Force Password Change (1.5 SP)

- [ ] Add checkbox to user creation form
- [ ] Update `createUser` server action
- [ ] Update `resetUserPassword` to set flag
- [ ] Implement login flow redirect
- [ ] Create `/settings/change-password` page
- [ ] Reset flag after password change
- [ ] Test navigation blocking

### Phase 3: Password Expiration (1.5 SP)

- [ ] Set 15-day expiration in `createUser`
- [ ] Set 15-day expiration in `resetUserPassword`
- [ ] Check expiration in NextAuth authorize callback
- [ ] Block login if expired
- [ ] Show countdown in user detail panel
- [ ] Show warning badge (<3 days)
- [ ] Show "Expired" badge

### Phase 4: Security Settings Page (2 SP)

**User View (All Users)**:
- [ ] Create `/settings/security` route
- [ ] Add "Security" tab to Settings sidebar
- [ ] Change Password form
- [ ] Two-Factor Authentication (placeholder)
- [ ] Active Sessions list (placeholder)
- [ ] Login History (last 10 logins)

**Admin View (Admin + Super Admin ONLY)**:
- [ ] Organization-wide Security Policies form
- [ ] Password Policy fields (length, complexity)
- [ ] Password Expiration selector
- [ ] Session Timeout selector
- [ ] Login Rate Limiting slider
- [ ] Bcrypt Cost slider
- [ ] Force 2FA toggle
- [ ] Save button with validation

**Server Actions**:
- [ ] `getSecuritySettings()` - fetch settings
- [ ] `updateSecuritySettings(data)` - admin only
- [ ] `getLoginHistory(userId, limit)` - fetch history
- [ ] `changePassword(currentPassword, newPassword)` - all users

### Phase 5: Testing & QA (1 SP)

- [ ] Test all database migrations
- [ ] Test force password change flow
- [ ] Test password expiration blocking
- [ ] Test security settings save/load
- [ ] Test RBAC (admin vs user views)
- [ ] Integration testing
- [ ] Quality gates (lint, typecheck, build)

---

## 🎨 Current Work: UI Redesign

**Status**: IN PROGRESS (Architecture planning)
**Approach**: TBD (pending user approval)

### Options Under Consideration:

1. **Separate Component Library** (Recommended)
   - Create `components/ui-v2/` or `components/themes/modern/`
   - New layouts in `components/layout-v2/`
   - Zero risk to existing UI
   - Easy A/B testing

2. **Theme System with Variants**
   - Theme switcher context
   - Variant components
   - Less duplication

3. **Route-Based Layout System**
   - Different layouts per route group
   - Complete separation
   - Duplicate components

---

## 📝 Notes

- **Resume After UI Redesign**: Once new UI is complete, return to Sprint 13 Phase 4
- **Launch Target**: v1.0.0 after Sprint 13 complete
- **Sprint 14 Target**: v1.1.0 (Post-launch enhancements)

---

## 🔗 Related Documentation

- Sprint Plan: `docs/SPRINTS_REVISED.md`
- Latest Session: `docs/SESSION_SUMMARY_2025_11_15.md`
- Architecture: `README.md`

---

**Reminder Command**: "Resume pinned tasks from TODO_PINNED.md"
