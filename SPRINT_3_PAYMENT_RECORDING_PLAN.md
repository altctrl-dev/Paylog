# Sprint 3: Payment Recording Implementation Plan

## Sprint Overview

### Goal
Implement a production-ready payment recording system that allows users to record full or partial payments against invoices through the existing stacked panel UI, with automatic invoice status updates and payment history tracking.

### Scope
**Included:**
- Payment recording form (Level 3 panel)
- Payment history list component
- Server actions for payment CRUD operations
- React Query hooks for payment data management
- Automatic invoice status updates (unpaid → partial → paid)
- Payment validation (amount cannot exceed remaining balance)
- Integration with existing invoice detail panel

**NOT Included:**
- Payment approval workflow (future sprint)
- Payment method configuration UI (using hardcoded list for now)
- Bulk payment recording
- Payment reports/analytics
- Payment reminders/notifications
- Export payment history

### Success Criteria
- [ ] User can record payment from invoice detail panel via "Record Payment" button
- [ ] Payment form validates amount against remaining balance
- [ ] Payment history shows all payments chronologically in invoice detail
- [ ] Invoice status updates automatically based on payment totals
- [ ] All panels close after successful payment recording
- [ ] Quality gates pass: lint, typecheck, build, test
- [ ] No regression in existing invoice functionality

### Estimated Duration
- **Total**: 8-10 hours (2 days)
- **Phase breakdown**: See individual phase estimates below

### Key Risks

| Risk | Likelihood | Impact | Mitigation | Rollback |
|------|------------|--------|------------|----------|
| Breaking invoice status logic | Medium | High | Comprehensive testing, preserve existing status transitions | Git checkpoint before status logic changes |
| Payment validation edge cases | High | Medium | Test overpayment, negative amounts, concurrent payments | Validate both client and server side |
| Panel state management issues | Low | Medium | Follow existing panel patterns exactly | Revert to previous panel configuration |
| Database transaction failures | Low | High | Use Prisma transactions for payment + invoice update | Manual rollback via admin panel |
| Performance degradation | Low | Low | Index payment queries, limit history to recent 50 | Remove new indexes if issues |

## Context Management Plan

### Working Set Target
- **Maximum**: 15,000 tokens
- **Compaction Trigger**: >12,000 tokens or >60% history

### Initial WSI Seed (Top 5 Files)
1. `schema.prisma` - Payment model structure (critical for types)
2. `app/actions/invoices.ts` - Pattern for server actions
3. `components/invoices/invoice-detail-panel.tsx` - Integration point
4. `types/invoice.ts` - Type patterns to follow
5. `hooks/use-invoices.ts` - React Query patterns

### JIT Retrieval Checklist
- [ ] Fetch payment model from schema when creating types
- [ ] Reference invoice actions when implementing payment actions
- [ ] Check panel renderer when integrating new panel
- [ ] Review existing validation patterns from invoice forms

### Agent Update Responsibilities
- **IE** (Implementation Engineer): Update NOTES.md after each phase completion
- **TA** (Test Architect): Document test coverage in NOTES.md
- **ICA** (Integration Auditor): Add integration findings to NOTES.md

---

## Phase 1: Data Layer Foundation

**Owner**: IE (Implementation Engineer)
**Duration**: 1.5 hours
**Dependencies**: None (can start immediately)

### Entry Criteria
- [ ] Project database accessible
- [ ] Prisma schema has Payment model
- [ ] TypeScript environment configured

### Detailed Checklist

#### 1.1 Create Payment Types (`types/payment.ts`)
- [ ] Define `PAYMENT_STATUS` constant object (pending, approved, rejected)
- [ ] Define `PAYMENT_METHOD` constant object (cash, check, wire_transfer, card, upi, other)
- [ ] Create `PaymentStatus` type from constant
- [ ] Create `PaymentMethod` type from constant
- [ ] Define `Payment` interface matching Prisma schema
- [ ] Define `PaymentWithRelations` interface including invoice and payment_type
- [ ] Define `PaymentFormData` interface for form submission
  - payment_date: Date (required, not null in form)
  - amount_paid: number
  - payment_method: PaymentMethod
  - reference_number?: string
  - notes?: string
- [ ] Define `PaymentListResponse` interface for paginated results
- [ ] Add JSDoc comments for all types
- [ ] Export all types and constants

#### 1.2 Create Payment Validations (`lib/validations/payment.ts`)
- [ ] Import zod and types from `types/payment.ts`
- [ ] Create `paymentFormSchema` with:
  - amount_paid: positive number, max 2 decimal places
  - payment_date: date (required)
  - payment_method: enum validation
  - reference_number: optional string, max 100 chars
  - notes: optional string, max 500 chars
- [ ] Create `paymentFiltersSchema` for list filtering
- [ ] Add custom refinements:
  - Amount must be > 0
  - Payment date cannot be in future
  - Reference required for check/wire_transfer
- [ ] Export schemas and inferred types
- [ ] Add error messages for all validations

### Exit Criteria
- [ ] All TypeScript types defined and exported
- [ ] Zod schemas match TypeScript types
- [ ] No TypeScript errors in new files
- [ ] Types follow existing patterns from `types/invoice.ts`

### Artifacts
- `/Users/althaf/Projects/paylog-3/types/payment.ts`
- `/Users/althaf/Projects/paylog-3/lib/validations/payment.ts`

### Dependencies
- **Depends on**: None
- **Blocks**: Phase 2 (Server Actions), Phase 3 (Hooks)

---

## Phase 2: Server Actions Implementation

**Owner**: IE (Implementation Engineer)
**Duration**: 2 hours
**Dependencies**: Phase 1 must be complete

### Entry Criteria
- [ ] Payment types and validations exist
- [ ] Database connection configured
- [ ] Auth utilities available

### Detailed Checklist

#### 2.1 Create Payment Server Actions (`app/actions/payments.ts`)
- [ ] Import dependencies (auth, db, types, validations)
- [ ] Copy `getCurrentUser` helper from invoice actions
- [ ] Define `paymentInclude` for relations
- [ ] Implement `getPaymentsByInvoiceId(invoiceId: number)`
  - Fetch all payments for invoice
  - Order by payment_date DESC
  - Include payment_type relation
  - Return as `ServerActionResult<Payment[]>`
- [ ] Implement `createPayment(invoiceId: number, data: unknown)`
  - Validate user authentication
  - Parse data with `paymentFormSchema`
  - Fetch invoice with current amount and existing payments
  - Calculate total paid so far
  - Validate new payment doesn't exceed remaining balance
  - Begin Prisma transaction:
    - Create payment record
    - Update invoice status based on new total
  - Commit transaction
  - Revalidate paths: `/invoices`, `/invoices/${invoiceId}`
  - Return created payment with relations
- [ ] Implement `calculateInvoicePaymentStatus(invoiceId: number)`
  - Sum all approved payments for invoice
  - Compare with invoice amount
  - Return appropriate status (unpaid/partial/paid)
- [ ] Implement `getPaymentSummary(invoiceId: number)`
  - Get invoice amount
  - Sum all payments
  - Calculate remaining balance
  - Return summary object
- [ ] Add comprehensive error handling
- [ ] Add logging for debugging

#### 2.2 Update Invoice Actions (`app/actions/invoices.ts`)
- [ ] Import payment-related types
- [ ] Update `invoiceInclude` to include payments relation
- [ ] Add `updateInvoiceStatusFromPayments` helper
- [ ] Modify `getInvoiceById` to include payment summary
- [ ] Add `getRemainingBalance` utility function

### Exit Criteria
- [ ] All server actions implemented
- [ ] Prisma transactions used for data consistency
- [ ] Proper error handling in place
- [ ] Path revalidation configured
- [ ] No TypeScript errors

### Artifacts
- `/Users/althaf/Projects/paylog-3/app/actions/payments.ts`
- Updated `/Users/althaf/Projects/paylog-3/app/actions/invoices.ts`

### Dependencies
- **Depends on**: Phase 1 (Types and Validations)
- **Blocks**: Phase 3 (Hooks), Phase 4 (UI Components)

---

## Phase 3: React Query Hooks Layer

**Owner**: IE (Implementation Engineer)
**Duration**: 1 hour
**Dependencies**: Phase 2 must be complete

### Entry Criteria
- [ ] Server actions implemented
- [ ] React Query configured in project
- [ ] Types available

### Detailed Checklist

#### 3.1 Create Payment Hooks (`hooks/use-payments.ts`)
- [ ] Import React Query utilities
- [ ] Import server actions from `app/actions/payments.ts`
- [ ] Import types from `types/payment.ts`
- [ ] Implement `usePayments(invoiceId: number)`
  - Use `useQuery` with key `['payments', invoiceId]`
  - Call `getPaymentsByInvoiceId`
  - Set appropriate stale time
  - Handle loading and error states
- [ ] Implement `useCreatePayment()`
  - Use `useMutation`
  - Call `createPayment` server action
  - Invalidate queries on success:
    - `['payments', invoiceId]`
    - `['invoice', invoiceId]`
    - `['invoices']`
  - Show success toast
  - Handle error with toast
- [ ] Implement `usePaymentSummary(invoiceId: number)`
  - Query payment summary data
  - Auto-refresh on payment changes
- [ ] Export all hooks
- [ ] Add JSDoc comments

### Exit Criteria
- [ ] All hooks implemented and exported
- [ ] Proper cache invalidation configured
- [ ] Toast notifications integrated
- [ ] TypeScript types properly inferred

### Artifacts
- `/Users/althaf/Projects/paylog-3/hooks/use-payments.ts`

### Dependencies
- **Depends on**: Phase 2 (Server Actions)
- **Blocks**: Phase 4 (UI Components)

---

## Phase 4: UI Components Implementation

**Owner**: IE (Implementation Engineer) + SUPB (UI Builder)
**Duration**: 3 hours
**Dependencies**: Phase 3 must be complete

### Entry Criteria
- [ ] Hooks layer complete
- [ ] Shadcn UI components available
- [ ] Panel system understood

### Detailed Checklist

#### 4.1 Create Payment Form Panel (`components/payments/payment-form-panel.tsx`)
- [ ] Import React Hook Form and Controller
- [ ] Import Shadcn UI components (Sheet, Form, Input, Button, Select, etc.)
- [ ] Import payment hooks and types
- [ ] Define component props:
  - invoiceId: number
  - invoiceAmount: number
  - remainingBalance: number
  - onClose: () => void
- [ ] Set up form with `useForm` and `zodResolver`
- [ ] Implement form fields:
  - Payment Date (DatePicker via Controller)
  - Amount (Input with currency formatting)
  - Payment Method (Select with options)
  - Reference Number (Input, conditional on method)
  - Notes (Textarea, optional)
- [ ] Display remaining balance prominently
- [ ] Add real-time validation for amount
- [ ] Implement form submission:
  - Call `createPayment` mutation
  - Close all panels on success
  - Show error if validation fails
- [ ] Add loading states
- [ ] Style with Tailwind classes
- [ ] Make responsive

#### 4.2 Create Payment History List (`components/payments/payment-history-list.tsx`)
- [ ] Import Shadcn Table components
- [ ] Import payment hooks
- [ ] Define props: invoiceId: number
- [ ] Fetch payments with `usePayments` hook
- [ ] Implement table with columns:
  - Date (formatted)
  - Amount (currency)
  - Method
  - Reference
  - Status badge
  - Balance after payment
- [ ] Add empty state for no payments
- [ ] Add loading skeleton
- [ ] Add error state
- [ ] Sort by date (newest first)
- [ ] Style consistently with invoice tables

#### 4.3 Update Invoice Detail Panel (`components/invoices/invoice-detail-panel.tsx`)
- [ ] Import PaymentHistoryList component
- [ ] Import usePaymentSummary hook
- [ ] Add "Record Payment" button (only if not fully paid)
- [ ] Display payment summary:
  - Total Paid: $X
  - Remaining Balance: $Y
- [ ] Embed PaymentHistoryList component
- [ ] Handle opening payment form panel (Level 3)
- [ ] Update status badge logic
- [ ] Ensure proper data refresh after payment

#### 4.4 Update Panel Renderer (`components/invoices/invoice-panel-renderer.tsx`)
- [ ] Import PaymentFormPanel
- [ ] Add payment panel type to panel state
- [ ] Add case for rendering payment form panel
- [ ] Ensure proper panel stacking (Level 3)
- [ ] Pass required props (invoiceId, amounts, etc.)

### Exit Criteria
- [ ] Payment form fully functional
- [ ] Payment history displays correctly
- [ ] Integration with invoice detail complete
- [ ] All panels close on successful payment
- [ ] UI responsive and styled consistently

### Artifacts
- `/Users/althaf/Projects/paylog-3/components/payments/payment-form-panel.tsx`
- `/Users/althaf/Projects/paylog-3/components/payments/payment-history-list.tsx`
- Updated `/Users/althaf/Projects/paylog-3/components/invoices/invoice-detail-panel.tsx`
- Updated `/Users/althaf/Projects/paylog-3/components/invoices/invoice-panel-renderer.tsx`

### Dependencies
- **Depends on**: Phase 3 (Hooks)
- **Blocks**: Phase 5 (Testing)

---

## Phase 5: Testing & Validation

**Owner**: TA (Test Architect)
**Duration**: 1.5 hours
**Dependencies**: Phase 4 must be complete

### Entry Criteria
- [ ] All components implemented
- [ ] Dev server running
- [ ] Test data available

### Detailed Checklist

#### 5.1 Manual Testing Scenarios
- [ ] Test payment recording flow:
  - Open invoice list
  - Select unpaid invoice
  - Click "Record Payment"
  - Fill form with valid data
  - Submit and verify success
- [ ] Test partial payment:
  - Record payment less than invoice amount
  - Verify status changes to "partial"
  - Verify remaining balance updates
- [ ] Test full payment:
  - Record payment equal to remaining balance
  - Verify status changes to "paid"
  - Verify "Record Payment" button hidden
- [ ] Test validation:
  - Try amount > remaining balance
  - Try negative amount
  - Try future date
  - Try missing required fields
- [ ] Test payment history:
  - Record multiple payments
  - Verify chronological order
  - Verify balance calculations
- [ ] Test panel interactions:
  - Open all 3 panel levels
  - Close payment panel
  - Verify all panels close on success
- [ ] Test data refresh:
  - Record payment
  - Verify invoice list updates
  - Verify detail panel updates

#### 5.2 Edge Cases
- [ ] Concurrent payments (two users, same invoice)
- [ ] Decimal precision (0.01 remaining)
- [ ] Maximum payment amount
- [ ] Very long reference numbers
- [ ] Special characters in notes
- [ ] Rapid form submissions

#### 5.3 Regression Testing
- [ ] Existing invoice CRUD still works
- [ ] Invoice filtering unaffected
- [ ] Hold functionality still works
- [ ] Panel navigation unchanged
- [ ] No console errors/warnings

### Exit Criteria
- [ ] All test scenarios pass
- [ ] No regressions identified
- [ ] Edge cases handled gracefully
- [ ] Performance acceptable (<200ms response)

### Artifacts
- Test results documented in NOTES.md
- Screenshots of key flows (optional)

### Dependencies
- **Depends on**: Phase 4 (UI Implementation)
- **Blocks**: Phase 6 (Quality Gates)

---

## Phase 6: Quality Gates & Integration

**Owner**: PRV (PR Validator) + ICA (Integration Auditor)
**Duration**: 1 hour
**Dependencies**: Phase 5 must be complete

### Entry Criteria
- [ ] All code implemented
- [ ] Manual testing complete
- [ ] No known blockers

### Detailed Checklist

#### 6.1 Code Quality Checks
- [ ] Run `npm run lint`
  - Fix any linting errors
  - Ensure consistent code style
- [ ] Run `npm run typecheck`
  - Fix any TypeScript errors
  - Ensure all types properly defined
- [ ] Run `npm run build`
  - Ensure production build succeeds
  - Check bundle size impact
- [ ] Run `npm test` (if tests exist)
  - All existing tests pass
  - No test regressions

#### 6.2 Integration Verification
- [ ] Payment actions integrate with invoice status
- [ ] Hooks properly invalidate caches
- [ ] Panel system handles new panel type
- [ ] Database transactions work correctly
- [ ] No circular dependencies
- [ ] API contracts maintained

#### 6.3 Code Review Preparation
- [ ] Remove console.log statements
- [ ] Add missing comments
- [ ] Ensure consistent naming
- [ ] Check for duplicate code
- [ ] Verify error handling

### Exit Criteria
- [ ] All quality gates PASS
- [ ] No integration issues
- [ ] Code review-ready
- [ ] Documentation updated

### Artifacts
- Quality gate results in NOTES.md
- Updated package-lock.json (if dependencies added)

### Dependencies
- **Depends on**: Phase 5 (Testing)
- **Blocks**: Phase 7 (Documentation)

---

## Phase 7: Documentation & Release

**Owner**: DA (Documentation Agent)
**Duration**: 30 minutes
**Dependencies**: Phase 6 must be complete

### Entry Criteria
- [ ] All code complete and tested
- [ ] Quality gates passed
- [ ] Feature working end-to-end

### Detailed Checklist

#### 7.1 Update Documentation
- [ ] Update README.md with payment feature
- [ ] Add payment recording to feature list
- [ ] Document any new environment variables
- [ ] Update API documentation (if separate)
- [ ] Add screenshots to docs/ folder

#### 7.2 Create Release Notes
- [ ] Document new features:
  - Payment recording via stacked panels
  - Automatic status updates
  - Payment history tracking
- [ ] List any breaking changes (none expected)
- [ ] Note any migration steps (none required)
- [ ] Credit contributors

#### 7.3 Prepare Evidence Pack
- [ ] List all created files
- [ ] List all modified files
- [ ] Document key decisions
- [ ] Note any technical debt
- [ ] Suggest future improvements

### Exit Criteria
- [ ] Documentation complete
- [ ] Release notes ready
- [ ] Evidence pack prepared

### Artifacts
- Updated README.md
- RELEASE_NOTES_SPRINT3.md
- Evidence pack in NOTES.md

### Dependencies
- **Depends on**: Phase 6 (Quality Gates)
- **Blocks**: Merge to main branch

---

## Evidence Pack Template

```markdown
## Evidence Pack: Sprint 3 - Payment Recording

### Plan vs. Actual
- **Planned files touched**: 8
- **Actual files touched**: [TO BE FILLED]
- **Planned new files**: 4
- **Actual new files**: [TO BE FILLED]
- **Variance explanation**: [TO BE FILLED]

### Quality Gates Results
- **Lint**: ✅/❌ [output summary]
- **Typecheck**: ✅/❌ [output summary]
- **Build**: ✅/❌ [output summary]
- **Tests**: ✅/❌ [coverage before/after, new tests added]

### Implementation Summary
- **What changed**: Added payment recording system with automatic invoice status updates
- **Why**: Enable users to track payments against invoices
- **Key decisions**:
  - Used transactions for payment+status update atomicity
  - Implemented as Level 3 panel for consistency
  - Server-side validation for payment amounts

### Testing Evidence
- **Test scenarios covered**:
  - Full payment flow
  - Partial payment flow
  - Validation edge cases
  - Panel integration
- **Manual testing performed**: Yes
- **Edge cases covered**: Concurrent payments, decimal precision

### Documentation Updates
- **Files updated**: README.md, NOTES.md
- **New docs created**: SPRINT_3_PAYMENT_RECORDING_PLAN.md
- **Screenshots added**: [if applicable]

### Breaking Changes Statement
- **Breaking changes**: No
- **Backward compatibility**: Fully maintained
- **Migration required**: No

### Follow-up Work
- **Technical debt**: None identified
- **Future improvements**:
  - Payment approval workflow
  - Bulk payment recording
  - Payment reminders
  - Export payment history
- **Known limitations**:
  - Payment methods hardcoded (not configurable via UI)
  - No payment editing/deletion yet
```

---

## Implementation Order & Time Estimates

### Recommended Execution Sequence

1. **Phase 1**: Data Layer (1.5 hours)
   - Morning Day 1
   - Single developer

2. **Phase 2**: Server Actions (2 hours)
   - Morning Day 1 (continued)
   - Same developer

3. **Phase 3**: Hooks Layer (1 hour)
   - Afternoon Day 1
   - Same developer

4. **Phase 4**: UI Components (3 hours)
   - Afternoon Day 1 + Morning Day 2
   - Can parallelize if 2 developers available

5. **Phase 5**: Testing (1.5 hours)
   - Morning Day 2
   - QA or different developer

6. **Phase 6**: Quality Gates (1 hour)
   - Afternoon Day 2
   - Original developer

7. **Phase 7**: Documentation (30 minutes)
   - Afternoon Day 2
   - Any team member

### Critical Path
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7

No phases can be parallelized except within Phase 4 (UI components can be built simultaneously).

---

## Risk Mitigation Strategies

### Before Starting
- [ ] Create git branch: `feat/payment-recording`
- [ ] Create database backup
- [ ] Review existing invoice status logic
- [ ] Confirm payment methods list with stakeholders

### During Implementation
- [ ] Commit after each phase completion
- [ ] Test incrementally (don't wait until end)
- [ ] Keep existing code working at all times
- [ ] Use TypeScript strict mode

### After Completion
- [ ] Run full regression test suite
- [ ] Get code review from senior developer
- [ ] Deploy to staging first
- [ ] Monitor for errors post-deployment

---

## Clarifications Needed

Before starting implementation, confirm:

1. **Payment Methods**: Is the hardcoded list sufficient?
   - Cash, Check, Wire Transfer, Card, UPI, Other

2. **Overpayment Handling**: Should we allow payments exceeding invoice amount?
   - Current plan: Prevent overpayments

3. **Payment Editing**: Need to edit/delete payments in this sprint?
   - Current plan: No editing/deletion (future sprint)

4. **Payment Approval**: Any approval workflow needed?
   - Current plan: Payments recorded as "pending" status

5. **Currency Display**: Format for currency display?
   - Current plan: $1,234.56 format

---

## Success Metrics

After implementation, we should see:

- ✅ Zero regression in existing invoice features
- ✅ Payment recording time < 30 seconds
- ✅ 100% validation coverage (client + server)
- ✅ All quality gates passing
- ✅ User can complete payment flow without documentation
- ✅ Status updates happen automatically
- ✅ Payment history loads in < 200ms

---

## Rollback Plan

If critical issues discovered post-deployment:

1. **Immediate**: Revert git commits
2. **Database**: Payments table is isolated, can truncate if needed
3. **UI**: Feature flag to hide "Record Payment" button
4. **Status Logic**: Revert invoice status calculation to ignore payments
5. **Full Rollback**: Restore from pre-sprint checkpoint

---

This plan provides a comprehensive, phased approach to implementing the Payment Recording feature with clear checkpoints, risk mitigation, and success criteria. Each phase builds upon the previous one with explicit dependencies and deliverables.