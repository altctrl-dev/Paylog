## 🔲 Sprint 5: Email Notifications & User-Created Master Data (26 SP)

**Goal**: Implement email notification system and enable users to request new master data with admin approval workflow

### Part A: Email Infrastructure (13 SP)

#### Email Core (5 SP)
- [ ] Email service abstraction
  - [ ] Service interface (send, sendBulk, sendTemplate)
  - [ ] Resend/SendGrid adapter implementation
  - [ ] Fallback provider support
  - [ ] Rate limiting (100/hour for free tier)
- [ ] Email queue system
  - [ ] Background job processor (using Node cron)
  - [ ] Retry logic with exponential backoff (3 attempts)
  - [ ] Dead letter queue for failed emails
  - [ ] Queue monitoring dashboard
- [ ] React Email template engine
  - [ ] Base email layout component
  - [ ] PayLog branded header/footer
  - [ ] Responsive email templates
  - [ ] Preview mode for development

#### Notification Triggers (4 SP)
- [ ] Invoice lifecycle notifications
  - [ ] Invoice created confirmation (to creator)
  - [ ] Invoice approved (to creator)
  - [ ] Invoice rejected (to creator with reason)
  - [ ] Invoice on hold (to creator with reason)
  - [ ] Payment received (to creator)
  - [ ] Invoice overdue (to admin team)
- [ ] Master data request notifications
  - [ ] Request submitted confirmation (to requester)
  - [ ] Request approved (to requester)
  - [ ] Request rejected (to requester with reason)
  - [ ] New request notification (to admins)
  - [ ] Resubmission received (to admins)

#### Email Templates (2 SP)
- [ ] Invoice templates
  - [ ] Invoice status change template
  - [ ] Payment confirmation template
  - [ ] Rejection reason template
  - [ ] Overdue reminder template
- [ ] Master data templates
  - [ ] Request confirmation template
  - [ ] Approval notification template
  - [ ] Rejection notification template
  - [ ] Admin notification template

#### Email Management (2 SP)
- [ ] User preferences
  - [ ] Email notification settings page
  - [ ] Opt-in/opt-out per notification type
  - [ ] Digest mode option (daily summary)
  - [ ] Frequency controls (immediate/hourly/daily)
- [ ] Email logging
  - [ ] Track all sent emails in database
  - [ ] Delivery status tracking (sent/delivered/bounced)
  - [ ] Click tracking for important CTAs
  - [ ] 90-day retention policy

### Part B: User-Created Master Data (13 SP)

#### Phase 1: Core Infrastructure (3 SP)
- [ ] MasterDataRequest Server Actions (`app/actions/master-data-requests.ts`)
  - [ ] `createRequest(entityType, data, userId)` - Create draft/pending request
  - [ ] `getUserRequests(userId, filters?)` - Get user's requests with filtering
  - [ ] `getRequestById(requestId)` - Get single request details
  - [ ] `updateRequest(requestId, data)` - Update draft request
  - [ ] `submitRequest(requestId)` - Change draft to pending
  - [ ] `deleteRequest(requestId)` - Delete draft request only
  - [ ] `resubmitRequest(requestId, updatedData)` - Resubmit rejected request
- [ ] Admin Server Actions (`app/actions/admin/master-data-approval.ts`)
  - [ ] `getAdminRequests(filters)` - Get all pending requests
  - [ ] `approveRequest(requestId, adminEdits?)` - Approve with optional edits
  - [ ] `rejectRequest(requestId, reason)` - Reject with reason
  - [ ] `bulkApprove(requestIds)` - Bulk approve multiple
  - [ ] `bulkReject(requestIds, reason)` - Bulk reject with single reason
- [ ] Duplicate detection API (`app/api/master-data/check-duplicates/route.ts`)
  - [ ] Fuzzy matching algorithm (Levenshtein distance)
  - [ ] Entity-specific matching rules (vendor: 85%, category: 90%)
  - [ ] Return potential matches with similarity scores
  - [ ] Debounced client-side integration

#### Phase 2: User-Facing UI (4 SP)
- [ ] Settings Page Enhancement
  - [ ] Add "My Requests" tab to SettingsTabs component
  - [ ] Tab badge showing pending request count
  - [ ] Mobile-responsive tab layout
- [ ] Request Forms (Level 2 Panels)
  - [ ] `VendorRequestForm` component
    - [ ] Fields: name, tin_number, contact info
    - [ ] Duplicate detection on name field
    - [ ] Draft save functionality
  - [ ] `CategoryRequestForm` component
    - [ ] Fields: name, description
    - [ ] Category type selector
  - [ ] `InvoiceProfileRequestForm` component
    - [ ] Fields: name, visibility (public/private)
    - [ ] Profile description
  - [ ] `PaymentTypeRequestForm` component
    - [ ] Fields: name, description
    - [ ] Payment method category
- [ ] Request Management UI
  - [ ] `MyRequestsList` component
    - [ ] Filter by entity type (vendor/category/profile/payment)
    - [ ] Filter by status (draft/pending/approved/rejected)
    - [ ] Sort by date created/updated
    - [ ] Pagination (20 items per page)
  - [ ] `RequestDetailPanel` (Level 2)
    - [ ] View full request details
    - [ ] Resubmit button for rejected (if attempts < 3)
    - [ ] Delete button for drafts
    - [ ] Edit button for drafts
    - [ ] Rejection reason display
  - [ ] `RequestStatusBadge` component
    - [ ] Color coding: draft (gray), pending (yellow), approved (green), rejected (red)
    - [ ] Attempt counter for rejected (1/3, 2/3, 3/3)
  - [ ] `DuplicateWarning` component
    - [ ] Show potential matches
    - [ ] Allow override with confirmation
    - [ ] Link to view existing entity

#### Phase 3: Admin Review UI (3 SP)
- [ ] Admin Page Enhancement
  - [ ] Add "Master Data Requests" tab to admin navigation
  - [ ] Badge showing pending request count
  - [ ] Real-time updates via polling (10s interval)
- [ ] Admin Review Components
  - [ ] `AdminPendingApprovalsList`
    - [ ] Filter by entity type
    - [ ] Filter by requester
    - [ ] Sort by date/priority
    - [ ] Bulk selection checkboxes
    - [ ] Search by request content
  - [ ] `RequestReviewPanel` (Level 2)
    - [ ] Full request details display
    - [ ] Requester information (name, email, role)
    - [ ] Request history (previous attempts if resubmission)
    - [ ] Duplicate check results
    - [ ] Approve/Reject action buttons
  - [ ] `EditableField` component
    - [ ] Inline editing for admin modifications
    - [ ] Track changes (original vs edited)
    - [ ] Validation before approval
  - [ ] `ApproveConfirmationModal` (Level 3)
    - [ ] Show final entity to be created
    - [ ] Display any admin edits
    - [ ] Confirm button with loading state
  - [ ] `RejectReasonModal` (Level 3)
    - [ ] Predefined rejection reasons
    - [ ] Custom reason text area
    - [ ] Character limit (500 chars)
- [ ] Bulk Actions
  - [ ] Select all/none toggle
  - [ ] Bulk approve button (confirmation required)
  - [ ] Bulk reject button (reason modal)
  - [ ] Action status toast notifications

#### Phase 4: Inline Request Flows (2 SP)
- [ ] Invoice Form Integration
  - [ ] Vendor dropdown enhancement
    - [ ] "Request new vendor..." link at bottom
    - [ ] Opens VendorRequestForm in Level 3 panel
    - [ ] Pre-fills name from search term
    - [ ] Returns to invoice form after submission
  - [ ] Category dropdown enhancement
    - [ ] "Request new category..." link
    - [ ] Opens CategoryRequestForm in Level 3 panel
    - [ ] Context-aware category suggestions
  - [ ] Profile dropdown enhancement
    - [ ] "Request new profile..." link
    - [ ] Opens InvoiceProfileRequestForm in Level 3 panel
    - [ ] Visibility defaults based on user role
- [ ] Payment Form Integration
  - [ ] Payment type dropdown enhancement
    - [ ] "Request new payment type..." link
    - [ ] Opens PaymentTypeRequestForm in Level 3 panel
    - [ ] Common payment types suggested

#### Phase 5: Real-Time Notifications (1 SP)
- [ ] Toast Notification System
  - [ ] `NotificationManager` singleton component
    - [ ] WebSocket connection (with polling fallback)
    - [ ] Notification queue management
    - [ ] Priority-based display
  - [ ] `ApprovalToast` component
    - [ ] Success message with entity name
    - [ ] Green color scheme
    - [ ] 5-second auto-dismiss
    - [ ] "Use Now" action button
  - [ ] `RejectionToast` component
    - [ ] Rejection message with reason preview
    - [ ] Red color scheme
    - [ ] 10-second auto-dismiss
    - [ ] "View Details" action button
  - [ ] Notification persistence
    - [ ] Store last 20 notifications
    - [ ] Mark as read functionality
    - [ ] Notification center dropdown

### Technical Highlights

#### Email System Architecture
- **Provider Abstraction**: Swappable email providers (Resend primary, SendGrid fallback)
- **Queue Processing**: Node cron-based job processor with 1-minute intervals
- **Template Engine**: React Email for type-safe, testable email templates
- **Monitoring**: Email dashboard showing queue depth, success rate, recent failures

#### Master Data Request Architecture
- **Single Table Design**: `MasterDataRequest` table handles all entity types via `entity_type` enum
- **Audit Trail**: Admin edits stored as JSON diff in `admin_edits` column
- **Resubmission Chain**: `previous_attempt_id` links attempts for full history
- **State Machine**: draft → pending → approved/rejected (with resubmission loop)
- **Panel Nesting**: Leverages Sprint 2's Level 3 panels for inline requests

### Acceptance Criteria

#### Email Notifications
- [ ] Emails sent within 30 seconds of trigger event
- [ ] Templates render correctly in Gmail, Outlook, Apple Mail
- [ ] Users can opt-out of any notification type
- [ ] Failed emails retry 3 times with exponential backoff
- [ ] Email logs accessible to super admins
- [ ] Queue processes 100+ emails per minute

#### Master Data Requests
- [ ] Standard user can request all 4 entity types from Settings
- [ ] Standard user can request inline from invoice/payment forms
- [ ] Request shows in "My Requests" within 2 seconds
- [ ] Admin sees new requests in real-time (10s max delay)
- [ ] Admin can edit any field before approval
- [ ] Approval creates entity and notifies user within 5 seconds
- [ ] Rejection shows reason and allows resubmission (max 3)
- [ ] Duplicate detection warns on ≥85% similarity
- [ ] Draft requests auto-save every 30 seconds
- [ ] Level 3 panels maintain context when requesting inline

### Dependencies
- ✅ **Sprint 1**: Authentication and role system
- ✅ **Sprint 2**: Stacked panel system (Levels 1-3)
- ✅ **Sprint 2**: Server Actions pattern
- ✅ **Database**: MasterDataRequest + PaymentType tables (migration applied)
- ⚠️ **External**: Email provider API key (Resend or SendGrid)
- ⚠️ **External**: Redis for queue (optional, can use SQLite)

### Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|---------|------------|
| **Email Provider Limits** | Medium | High | Implement provider fallback, rate limiting, and queue backpressure |
| **Duplicate Detection Performance** | Low | Medium | Cache comparison set, limit to 100 most recent entities, use database indexes |
| **Resubmission Abuse** | Low | Low | Hard limit at 3 attempts, track IP for rate limiting, admin can block user |
| **Panel Stack Overflow** | Low | Medium | Level 3 maximum depth enforced, escape closes only top panel |
| **Notification Spam** | Medium | Medium | Batch similar notifications, 1-minute cooldown per notification type |
| **Admin Edit Conflicts** | Low | Low | Optimistic locking, show "already approved" if collision |

### Story Point Justification

#### Email (13 SP)
- **Infrastructure (5 SP)**: Complex queue system, provider abstraction, retry logic
- **Triggers (4 SP)**: 11 different trigger points across two features
- **Templates (2 SP)**: 8 responsive templates with React Email
- **Management (2 SP)**: Preferences UI, logging, retention policies

#### Master Data (13 SP)
- **Infrastructure (3 SP)**: 13 Server Actions, duplicate detection API, state machine
- **User UI (4 SP)**: 4 request forms, list/detail views, status management
- **Admin UI (3 SP)**: Review panel, inline editing, bulk operations, 2 modals
- **Inline Flows (2 SP)**: 4 dropdown integrations with Level 3 panels
- **Notifications (1 SP)**: Real-time toasts, WebSocket/polling, notification center

**Total: 26 SP** (13 + 13)

This represents ~84% increase from original 18 SP, justified by:
- Two complete feature sets that integrate but can be developed in parallel
- Reusable components (forms, notifications) that benefit future sprints
- Foundation for Sprint 6 (file attachments can trigger emails)
- Sets up Sprint 8 (admin manages what users request)

### Implementation Order

1. **Week 1**: Email infrastructure + MasterDataRequest Server Actions
2. **Week 2**: Email templates + User request forms
3. **Week 3**: Notification triggers + Admin review UI
4. **Week 4**: User preferences + Inline request flows
5. **Week 5**: Email logging + Real-time notifications
6. **Week 6**: Testing, polish, and integration

### Testing Strategy

**Unit Tests** (40% of testing effort):
- Server Action logic (create, approve, reject)
- Duplicate detection algorithm
- Email queue processor
- Resubmission counter logic

**Integration Tests** (40% of testing effort):
- Request → Approval → Entity creation flow
- Email trigger → Queue → Send flow
- Panel nesting (Level 1 → 2 → 3)
- Notification delivery via WebSocket

**E2E Tests** (20% of testing effort):
- User requests vendor → Admin approves → User selects in invoice
- Rejection → Resubmission → Approval flow
- Bulk operations with mixed selections
- Email preference changes affect delivery

### Success Metrics

- **Adoption**: 50%+ of new vendors come through request flow (vs. direct admin creation)
- **Efficiency**: 80%+ of requests approved within 24 hours
- **Quality**: <10% rejection rate after duplicate warnings
- **Performance**: All UI actions complete in <500ms
- **Reliability**: 99%+ email delivery success rate
- **User Satisfaction**: <5% resubmission rate (indicates clear requirements)