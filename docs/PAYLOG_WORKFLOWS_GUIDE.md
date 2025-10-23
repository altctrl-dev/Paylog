# PayLog User Workflows & Navigation Guide

**Version**: 1.0
**Last Updated**: October 23, 2025
**Sprint Version**: Sprint 9A (In Progress)
**Database**: PostgreSQL 17

---

## 1. Overview

### Purpose of This Guide

This guide provides comprehensive documentation of PayLog's user workflows, navigation structure, and role-based access control. It is designed for:

- **New Users**: Understand what features you can access and how to use them
- **Administrators**: Learn administrative capabilities and approval workflows
- **Super Admins**: Comprehensive system management reference
- **Developers**: Technical reference for navigation structure and access patterns

### User Role Hierarchy

PayLog implements a three-tier role-based access control (RBAC) system:

```
Super Admin (super_admin)
    ├─ Full system access
    ├─ User management capabilities
    └─ All admin capabilities

Admin (admin)
    ├─ Master data management
    ├─ Request approval workflows
    └─ Activation/deactivation powers

Standard User (standard_user)
    ├─ Invoice CRUD operations
    ├─ Master data requests
    └─ Personal settings
```

### Navigation Structure

PayLog uses a sidebar-based navigation with role-based visibility:

- **Dashboard**: System overview and quick actions
- **Invoices**: Invoice management hub
- **Reports**: Analytics and reporting (planned)
- **Settings**: Personal profile and requests
- **Admin**: Master data and system administration (admin+ only)

---

## 2. Sidebar Navigation Structure

### Navigation Items

| Menu Item | Route | Access Level | Purpose |
|-----------|-------|--------------|---------|
| Dashboard | `/dashboard` | All Roles | Overview, KPIs, recent activity |
| Invoices | `/invoices` | All Roles | Create, view, manage invoices |
| Reports | `/reports` | All Roles | Analytics and reporting |
| Settings | `/settings` | All Roles | Profile and master data requests |
| Admin | `/admin` | Admin + Super Admin | System administration |

### Role-Based Visibility

- **Standard Users**: See Dashboard, Invoices, Reports, Settings
- **Admin Users**: See all items including Admin
- **Super Admin Users**: See all items including Admin

The Admin menu item is **automatically hidden** for standard users.

### User Profile Section

Located at the bottom of the sidebar:

- **User Avatar**: Displays user initials
- **User Name**: Full name or email
- **Role Badge**: Formatted role (e.g., "ADMIN", "SUPER ADMIN")
- **Sign Out Button**: Logout with redirect to `/login`

### Responsive Behavior

- **Desktop (>1280px)**: Sidebar expanded by default (240px width)
- **Tablet/Mobile (<1280px)**: Sidebar collapsed by default (88px width)
- **Toggle Button**: Manual expand/collapse available at all screen sizes

---

## 3. Route Documentation

### 3.1 Dashboard (`/dashboard`)

**Access**: All roles
**Purpose**: System overview and quick actions

**Key Features**:
- KPI summary cards (planned Sprint 11)
- Recent invoice activity
- Pending approvals (admin only)
- Quick action buttons

**Tabs**: None (single page)

---

### 3.2 Invoices (`/invoices`)

**Access**: All roles
**Purpose**: Complete invoice management

**Key Features**:
- Invoice list with filtering and sorting
- Create new invoice (panel-based)
- View invoice details (panel-based)
- Edit invoice (panel-based)
- Status transitions (pending → on hold → approved → paid)
- File attachments (Sprint 6)
- Comments and collaboration (Sprint 7)

**User Capabilities by Role**:

| Action | Standard User | Admin | Super Admin |
|--------|--------------|-------|-------------|
| View own invoices | ✓ | ✓ | ✓ |
| View all invoices | ✗ | ✓ | ✓ |
| Create invoice | ✓ | ✓ | ✓ |
| Edit invoice | Own only | All | All |
| Delete invoice | ✗ | ✗ | ✗ |
| Place on hold | ✗ | ✓ | ✓ |
| Release from hold | ✗ | ✓ | ✓ |
| Hide invoice | ✗ | ✓ | ✓ |

**Tabs**: None (uses panel system for details)

---

### 3.3 Reports (`/reports`)

**Access**: All roles
**Purpose**: Analytics and reporting

**Status**: Planned for Sprint 11
**Key Features** (planned):
- Invoice status breakdown
- Payment trends
- Vendor spending analysis
- Monthly volume charts

**Tabs**: TBD

---

### 3.4 Settings (`/settings`)

**Access**: All roles
**Purpose**: Personal settings and master data requests

**Tabs**:

#### Tab 1: Profile (All Users)
- User profile management
- Personal information
- Password change
- Email preferences

**Status**: UI placeholder (functionality planned Sprint 10)

#### Tab 2: My Requests (All Users)
- View master data requests
- Create new requests
- Track request status
- Resubmit rejected requests

**Available Request Types**:
- Request Vendor
- Request Category
- Request Invoice Profile
- Request Payment Type

**Request Statuses**:
- **Draft**: Saved but not submitted
- **Pending**: Awaiting admin review
- **Approved**: Admin approved and entity created
- **Rejected**: Admin rejected with reason

**Request Actions**:
- **Filter**: By entity type (all, vendor, category, profile, payment type)
- **Refresh**: Reload request list
- **View Details**: Click any request card
- **Resubmit**: Available for rejected requests (max 3 attempts)

---

### 3.5 Admin Console (`/admin`)

**Access**: Admin + Super Admin only
**RBAC Protection**: 403 Forbidden for standard users
**Purpose**: System administration and master data management

**Main Tabs**:

#### Tab 1: Dashboard (All Admins)
**Purpose**: Admin-specific overview

**Key Sections**:
- Pending approval counts
- Master data statistics
- Recent admin activity
- System health metrics

**Features**:
- Quick action buttons
- System alerts
- User activity summary

---

#### Tab 2: Master Data Requests (All Admins)
**Purpose**: Review and approve user-submitted master data requests

**Key Features**:
- Filter by entity type (vendor, category, profile, payment type)
- Filter by status (pending, approved, rejected)
- Sort by submission date
- Bulk actions (planned)

**Admin Actions**:
- **Approve**: Create entity and notify user
- **Reject**: Provide rejection reason and notify user
- **Edit Before Approval**: Modify request data before creating entity
- **Add Admin Notes**: Internal comments for tracking

**Approval Workflow**:
1. User submits request in Settings → My Requests
2. Request appears in Admin → Master Data Requests (pending)
3. Admin reviews request details
4. Admin approves or rejects with reason
5. On approval: Entity created in respective master data table
6. User notified of decision
7. Request marked as approved/rejected with timestamp

**Resubmission Handling**:
- Max 3 submission attempts per user
- Resubmission counter displayed
- Original request linked for context
- Rejection reason preserved for reference

---

#### Tab 3: Master Data (All Admins)
**Purpose**: Direct management of all master data entities

**Sub-Tabs** (6 total):

##### 3.1 Vendors
**Purpose**: Manage vendor master data

**Fields**:
- Name (required, string)
- Address (optional, text)
- GST Exemption (required, boolean, default: false)
- Bank Details (optional, text, max 1000 chars)
- Status (active/inactive, toggle via trash icon)

**Actions**:
- Create vendor (+ New Vendor button)
- Edit vendor (pencil icon)
- Archive/Unarchive (trash icon toggle)
- Search vendors
- Sort by name, creation date

**Quick Create from Invoice Form**:
- Admin-only feature
- Opens Level 3 panel (500px width)
- Creates vendor immediately
- Auto-selects in invoice form dropdown
- No "+ Request New Vendor" link for admins

**Standard User Workflow**:
- Must request vendor via Settings → My Requests
- No direct creation access
- No quick-create link in invoice form

---

##### 3.2 Categories
**Purpose**: Manage expense categories

**Fields**:
- Name (required, string)
- Description (required, text, enhanced in Sprint 9A)
- Status (active/inactive, toggle via trash icon)

**Actions**:
- Create category
- Edit category
- Archive/Unarchive (trash icon toggle)
- Search categories
- Sort by name, creation date

**Standard User Workflow**:
- Must request category via Settings → My Requests
- No direct creation access

---

##### 3.3 Entities
**Purpose**: Manage organizational entities (NEW in Sprint 9A)

**Background**:
- Replaces SubEntity with enhanced fields
- SubEntity table preserved for backward compatibility
- Migration path established for Sprint 9B

**Fields**:
- Name (required, string, max 255 chars)
- Description (optional, text)
- Address (required, text)
- Country (required, ISO 3166-1 alpha-2 code: US, IN, GB, etc.)
- Status (active/inactive, toggle via trash icon)

**Actions**:
- Create entity
- Edit entity
- Archive/Unarchive (trash icon toggle)
- Search entities
- Sort by name, country

**Country Field**:
- Stored as ISO alpha-2 codes (2 chars: US, IN, GB)
- Displayed as full country names
- Searchable dropdown with autocomplete

**Migration Notes**:
- 3 entities migrated from SubEntity with placeholder addresses
- Admins must update addresses and countries post-migration
- Placeholder address: "Migration: Address pending"
- Default country: 'US' (must be corrected)

---

##### 3.4 Payment Types
**Purpose**: Manage payment methods

**Fields**:
- Name (required, string)
- Description (required, text, retained in Sprint 9A)
- Requires Reference (required, boolean, default: false)
- Status (active/inactive, toggle via trash icon)

**Actions**:
- Create payment type
- Edit payment type
- Archive/Unarchive (trash icon toggle)
- Search payment types
- Sort by name, creation date

**Requires Reference Flag**:
- If true: Payment requires additional reference (check number, UPI ID, wire transfer ID)
- If false: No reference required

**Standard User Workflow**:
- Must request payment type via Settings → My Requests
- No direct creation access

---

##### 3.5 Currencies
**Purpose**: Manage active currencies (NEW in Sprint 9A)

**Background**:
- 50 ISO 4217 currencies pre-seeded
- All currencies start **inactive** (is_active = false)
- Admins explicitly activate currencies as needed
- No creation or deletion allowed (fixed set)

**Pre-Seeded Currencies** (50 total):
- Major: USD, EUR, GBP, JPY, CNY, INR, AUD, CAD, CHF
- Regional: BRL, KRW, MXN, RUB, SGD, HKD, SEK, NOK, ZAR, TRY, NZD
- Additional: 30 more regional currencies

**Fields** (read-only except status):
- Code (ISO 4217, 3 chars: USD, EUR, INR)
- Name (full currency name)
- Symbol (currency symbol: $, €, ₹)
- Status (active/inactive, toggle only)

**Actions**:
- **Activate**: Enable currency for use in invoices (toggle)
- **Deactivate**: Disable currency (toggle)
- **Search**: By code or name
- **Sort**: By code, name

**Important Restrictions**:
- ❌ Cannot create new currencies
- ❌ Cannot delete currencies
- ❌ Cannot edit code, name, or symbol
- ✓ Can only toggle activation status

**Activation Workflow**:
1. Admin navigates to Admin → Master Data → Currencies
2. Searches for desired currency (e.g., "USD")
3. Clicks activation toggle (trash icon = inactive, checkmark = active)
4. Currency immediately available in invoice forms

**Invoice Integration**:
- Invoice.currency_id: Optional in Sprint 9A-9B
- Will become required in Sprint 9C
- Searchable dropdown with symbol + name (e.g., "USD - United States Dollar ($)")

---

##### 3.6 Invoice Profiles
**Purpose**: Manage invoice templates

**Current Fields** (Sprint 9A):
- Name (required, string)
- Description (optional, text)
- Visible to All (required, boolean, default: true)

**Enhanced Fields** (planned Sprint 9B):
- Entity (required, foreign key)
- Vendor (required, foreign key)
- Category (required, foreign key)
- Currency (required, foreign key)
- Prepaid/Postpaid (optional, enum)
- TDS Applicable (required, boolean)
- TDS Percentage (optional, float, required if TDS applicable)

**Actions**:
- Create invoice profile
- Edit invoice profile
- Archive/Unarchive (trash icon toggle)
- Manage visibility permissions
- Search profiles
- Sort by name, creation date

**Visibility Management**:
- **Visible to All = true**: All users see profile
- **Visible to All = false**: Only granted users see profile
- Grant access via UserProfileVisibility records

**Standard User Workflow**:
- Must request invoice profile via Settings → My Requests
- No direct creation access

---

#### Tab 4: User Management (Super Admin Only)
**Purpose**: Manage system users

**Access**: Super Admin only
**Status**: Planned for Sprint 10

**Key Features** (planned):
- Create users
- Edit users (name, email, role)
- Deactivate users
- Reset passwords
- Assign roles
- Manage profile visibility grants
- View user activity logs

**Protection Rules**:
- Cannot deactivate last super admin
- Password reset sends email notification
- Role changes logged in audit trail

---

## 4. Admin Console Detailed Breakdown

### Tab Navigation Structure

```
/admin
├─ ?tab=dashboard           (All Admins) - Admin overview
├─ ?tab=requests            (All Admins) - Master data requests
├─ ?tab=master-data         (All Admins) - Master data management
│   ├─ Sub-tab: Vendors
│   ├─ Sub-tab: Categories
│   ├─ Sub-tab: Entities
│   ├─ Sub-tab: Payment Types
│   ├─ Sub-tab: Currencies
│   └─ Sub-tab: Invoice Profiles
└─ ?tab=users               (Super Admin Only) - User management
```

### RBAC Middleware Protection

**Middleware Configuration** (`middleware.ts`):
- Protects all `/admin/*` routes
- Checks user role: `admin` or `super_admin`
- Returns 403 Forbidden for unauthorized access
- No redirect (clearer error, prevents bookmark loops)

**403 Forbidden Page**:
- Error message: "Access denied - Admin access required"
- Contact admin instructions
- Return to dashboard link

---

## 5. Settings Page Breakdown

### Page Structure

**Location**: `/settings`
**Access**: All roles

**Tabs**:
1. **Profile** - Personal account settings
2. **My Requests** - Master data request management

**Key Changes in Sprint 9A**:
- ❌ Removed "Master Data" tab (moved to Admin menu)
- ✓ Retained Profile and My Requests tabs
- ✓ Simplified for standard user focus

---

### Profile Tab

**Purpose**: Manage personal account settings

**Sections** (planned Sprint 10):
- Personal Information
  - Full Name
  - Email Address
  - Phone Number (optional)
- Password Management
  - Change Password
  - Password requirements display
- Preferences
  - Email notifications
  - Language preference (future)
  - Timezone (future)

**Status**: UI placeholder (functionality Sprint 10)

---

### My Requests Tab

**Purpose**: Track master data creation requests

**Features**:
- View all submitted requests
- Filter by entity type (all, vendor, category, profile, payment type)
- Sort by submission date
- View request details (click card)
- Create new requests (request buttons)
- Track approval status
- Resubmit rejected requests

**Request Buttons**:
- **Request Vendor**: Opens vendor request form panel
- **Request Category**: Opens category request form panel
- **Request Invoice Profile**: Opens profile request form panel
- **Request Payment Type**: Opens payment type request form panel

**Request Card Display**:
- Status badge (draft, pending, approved, rejected)
- Entity type label
- Request name (entity name)
- Submission date
- Rejection reason (if rejected)
- Created entity ID (if approved)
- Resubmission counter (if >0)
- Resubmission limit warning (at 2/3)

**Resubmission Workflow**:
1. Request rejected by admin with reason
2. User views rejection reason in request card
3. User clicks request card to view details
4. User edits request data
5. User resubmits (max 3 total attempts)
6. Resubmission counter increments
7. Request returns to pending status
8. Admin reviews resubmission

**Resubmission Limits**:
- Max 3 submission attempts per request
- Visual warning at 2nd resubmission
- Error message at 3rd rejection (cannot resubmit)
- Counter displayed: "Resubmission #1", "Resubmission #2 (Limit Reached)"

---

## 6. User Role Workflows

### 6.1 Standard User Workflows

#### What Standard Users Can Access

**Navigation**:
- ✓ Dashboard
- ✓ Invoices (own invoices only)
- ✓ Reports (planned)
- ✓ Settings (Profile + My Requests)
- ✗ Admin (hidden from sidebar)

**Invoice Operations**:
- ✓ Create invoices
- ✓ View own invoices
- ✓ Edit own invoices (if pending/rejected)
- ✓ Add file attachments (Sprint 6)
- ✓ Add comments (Sprint 7)
- ✗ View other users' invoices
- ✗ Approve invoices
- ✗ Place invoices on hold
- ✗ Delete invoices

**Master Data Operations**:
- ✗ View master data management UI
- ✗ Create vendors/categories/payment types directly
- ✗ Edit master data entities
- ✗ Archive/unarchive entities
- ✓ Request new master data via Settings → My Requests
- ✓ Track request approval status
- ✓ Resubmit rejected requests (max 3 attempts)

---

#### Standard User Invoice Creation Workflow

**Navigation**: Dashboard → Invoices → + New Invoice

**Step-by-Step**:

1. **Open Invoice Form**
   - Click "+ New Invoice" button in invoices page
   - Level 2 panel opens (900px width)

2. **Select Invoice Profile** (optional)
   - Dropdown: All visible invoice profiles
   - If visible_to_all = false, only granted profiles shown
   - No quick-create link (must request via Settings)

3. **Select Vendor** (required)
   - Searchable dropdown: All active vendors
   - No quick-create link (admin-only feature removed in Sprint 9A)
   - Standard users must request vendor via Settings → My Requests

4. **Select Entity** (optional, Sprint 9A)
   - Dropdown: All active entities
   - New field in Sprint 9A
   - Replaces SubEntity selection

5. **Select Currency** (optional, Sprint 9A)
   - Searchable dropdown: All active currencies
   - Displays code, name, symbol (e.g., "USD - United States Dollar ($)")
   - Only shows currencies activated by admin

6. **Enter Invoice Details**
   - Invoice Number (required, unique)
   - Invoice Date (optional)
   - Due Date (optional)
   - Invoice Amount (required, float)
   - Period Start/End (optional, Sprint 6)
   - TDS Applicable (checkbox, default: false)
   - TDS Percentage (conditional, shown if TDS applicable)
   - Notes (optional, textarea)

7. **Select Category** (required)
   - Dropdown: All active categories
   - No quick-create link (must request via Settings)

8. **Add Payment Details** (planned Sprint 3)
   - Payment Type (required)
   - Payment Method (optional)
   - Payment Reference (conditional, if payment type requires reference)

9. **Submit Invoice**
   - Validation checks
   - Status set to "pending_approval"
   - submission_count initialized to 1
   - Creator recorded (created_by)
   - Success notification
   - Panel closes
   - Invoice list refreshes

---

#### Standard User Request Workflow

**Purpose**: Request creation of new master data entities

**Navigation**: Settings → My Requests → Request Buttons

**Request Types**:
- Request Vendor
- Request Category
- Request Invoice Profile
- Request Payment Type

**Step-by-Step** (using Vendor as example):

1. **Open Request Form**
   - Settings → My Requests → "Request Vendor" button
   - Level 2 panel opens (600px width)

2. **Fill Request Form**
   - Vendor Name (required)
   - Vendor Address (optional)
   - GST Exemption (checkbox, default: false)
   - Bank Details (optional, textarea)
   - Status set to "pending_approval" automatically

3. **Save or Submit**
   - **Save as Draft**: Status = "draft", can edit later
   - **Submit for Approval**: Status = "pending_approval"

4. **Track Request**
   - Request appears in My Requests tab
   - Status badge: Pending
   - Submission date displayed
   - Requester (self)

5. **Admin Review**
   - Admin sees request in Admin → Master Data Requests
   - Admin approves or rejects with reason

6. **User Notification**
   - Status updated to "approved" or "rejected"
   - If approved: Created entity ID shown (e.g., "VEN-1234")
   - If rejected: Rejection reason displayed

7. **Resubmission** (if rejected)
   - Click request card to view details
   - Edit request data
   - Resubmit (max 3 total attempts)
   - Resubmission counter increments

---

### 6.2 Admin User Workflows

#### Additional Admin Capabilities

**Everything Standard Users Can Do, Plus**:

**Navigation**:
- ✓ Admin Console (sidebar menu item)
- ✓ Master Data Requests (review/approve)
- ✓ Master Data Management (direct CRUD)

**Invoice Operations**:
- ✓ View all invoices (not just own)
- ✓ Edit any invoice
- ✓ Place invoices on hold
- ✓ Release invoices from hold
- ✓ Hide/unhide invoices
- ✗ Delete invoices (soft delete only)

**Master Data Operations**:
- ✓ Create master data entities directly
- ✓ Edit master data entities
- ✓ Archive/unarchive entities (soft delete)
- ✓ Review master data requests
- ✓ Approve/reject requests
- ✓ Add admin notes to requests

**Quick Create from Invoice Form**:
- ✓ "+ Add New Vendor" link in invoice form
- Opens Level 3 panel (500px width)
- Creates vendor immediately
- Auto-selects in invoice form dropdown

---

#### Admin Vendor Creation Workflow (Direct)

**Navigation**: Admin → Master Data → Vendors → + New Vendor

**Step-by-Step**:

1. **Open Vendor Form**
   - Admin → Master Data tab → Vendors sub-tab
   - Click "+ New Vendor" button
   - Level 2 panel opens (600px width)

2. **Fill Vendor Details**
   - Name (required, string)
   - Address (optional, text)
   - GST Exemption (checkbox, default: false)
   - Bank Details (optional, textarea, max 1000 chars)

3. **Submit**
   - No status field (defaults to active)
   - Validation checks
   - Vendor created in database
   - Success notification
   - Panel closes
   - Vendor list refreshes

4. **Archive/Unarchive**
   - Trash icon in vendor table row
   - Toggle is_active flag (soft delete)
   - No confirmation dialog (instant toggle)
   - Status updated immediately

**Important**: No `is_active` checkbox in form (Sprint 9A design change)

---

#### Admin Quick Vendor Creation from Invoice Form

**Purpose**: Create vendor while creating invoice (admin-only convenience feature)

**Navigation**: Invoices → + New Invoice → "+ Add New Vendor" link

**Step-by-Step**:

1. **Trigger from Invoice Form**
   - Creating/editing invoice
   - Vendor dropdown: Click "+ Add New Vendor" link
   - Level 3 panel opens (500px width)

2. **Fill Vendor Details**
   - Name (required)
   - Address (optional)
   - GST Exemption (checkbox)
   - Bank Details (optional)

3. **Create Vendor**
   - Click "Create" button
   - Vendor created immediately
   - Level 3 panel closes
   - Vendor auto-selected in Level 2 invoice form dropdown
   - Continue invoice creation workflow

**Benefits**:
- No need to leave invoice form
- Immediate availability
- Streamlined workflow for admins

**Standard User Note**: This link is **hidden** for standard users (admin-only feature)

---

#### Admin Request Approval Workflow

**Navigation**: Admin → Master Data Requests tab

**Step-by-Step**:

1. **View Pending Requests**
   - Admin → Master Data Requests tab
   - Filter: Status = Pending (default)
   - Sort: Most recent first
   - Pending count badge displayed

2. **Select Request**
   - Click request card
   - Request detail panel opens (Level 2, 600px)

3. **Review Request Details**
   - Request type (vendor, category, profile, payment type)
   - Requester name and email
   - Submission date
   - Resubmission count (if >0)
   - Request data (entity fields)
   - Previous rejection reason (if resubmission)

4. **Admin Actions**:

   **Option A: Approve**
   - Click "Approve" button
   - Entity created in respective master data table
   - created_entity_id set (e.g., "VEN-1234")
   - Status updated to "approved"
   - User notified (future: email notification)
   - Panel closes

   **Option B: Reject**
   - Click "Reject" button
   - Rejection reason dialog opens
   - Enter rejection reason (required)
   - Status updated to "rejected"
   - rejection_reason saved
   - rejected_by and rejected_at set
   - User notified (future: email notification)
   - Panel closes

   **Option C: Edit Before Approval** (future feature)
   - Click "Edit" button
   - Modify request data fields
   - admin_edits JSON saved
   - Click "Approve"
   - Entity created with edited data
   - User notified of approval with edits

   **Option D: Add Admin Notes**
   - Admin notes field (internal use)
   - Not visible to requester
   - Saved with request for tracking

5. **Post-Approval Actions**
   - Request removed from pending list
   - Request moved to approved/rejected history
   - User sees updated status in Settings → My Requests
   - Entity available immediately (if approved)

---

#### Admin Entity Management Workflow (Sprint 9A)

**Purpose**: Manage organizational entities with address and country

**Navigation**: Admin → Master Data → Entities

**Post-Migration Tasks**:

1. **Update Migrated Entities**
   - 3 entities migrated from SubEntity
   - Placeholder addresses: "Migration: Address pending"
   - Default countries: 'US' (must be corrected)

2. **Edit Entity**
   - Click pencil icon in entity table row
   - Entity edit panel opens (Level 2, 600px)
   - Update address (required, text)
   - Update country (required, searchable dropdown)
   - Save changes

3. **Create New Entity**
   - Click "+ New Entity" button
   - Entity creation panel opens
   - Fill details:
     - Name (required, max 255 chars)
     - Description (optional, text)
     - Address (required, text)
     - Country (required, ISO alpha-2 dropdown)
   - Submit

4. **Country Selection**
   - Searchable dropdown
   - Full country names displayed
   - Stored as ISO alpha-2 codes (US, IN, GB, etc.)
   - Validation ensures valid ISO code

5. **Archive/Unarchive**
   - Trash icon toggle in table row
   - Updates is_active flag
   - Archived entities hidden by default
   - Show archived toggle available

---

#### Admin Currency Activation Workflow (Sprint 9A)

**Purpose**: Enable currencies for use in invoices

**Navigation**: Admin → Master Data → Currencies

**Step-by-Step**:

1. **View Currency List**
   - All 50 ISO 4217 currencies displayed
   - Status: Most start inactive (is_active = false)
   - Search by code or name
   - Sort by code, name

2. **Search for Currency**
   - Search field: Type "USD" or "United States"
   - Results filter dynamically
   - Symbol displayed (e.g., "$")

3. **Activate Currency**
   - Click activation toggle (trash → checkmark)
   - is_active set to true
   - Success notification
   - Currency immediately available in invoice forms

4. **Deactivate Currency**
   - Click deactivation toggle (checkmark → trash)
   - is_active set to false
   - Currency removed from invoice form dropdowns
   - Existing invoices with currency unchanged

**Important Restrictions**:
- ❌ Cannot create new currencies (fixed set of 50)
- ❌ Cannot delete currencies
- ❌ Cannot edit code, name, or symbol
- ✓ Can only toggle activation status

**Recommended Activations**:
- Activate currencies used by your organization
- Example: USD, EUR, INR for international operations
- Example: USD only for US-only operations

---

### 6.3 Super Admin Workflows

#### Super Admin Exclusive Capabilities

**Everything Admins Can Do, Plus**:

**User Management** (Sprint 10):
- ✓ Create users
- ✓ Edit users (name, email, role)
- ✓ Deactivate users
- ✓ Reset passwords
- ✓ Assign roles (standard_user, admin, super_admin)
- ✓ Manage profile visibility grants
- ✓ View user activity logs

**Protection Rules**:
- ✓ System prevents deactivating last super admin
- ✓ Database trigger enforces protection
- ✓ Cannot downgrade own role if last super admin

**Admin Tab Access**:
- ✓ User Management tab visible (Tab 4)
- ✓ All other admin tabs accessible

---

#### Super Admin User Management Workflow (Sprint 10)

**Navigation**: Admin → User Management tab

**Status**: Planned for Sprint 10

**Create User Workflow**:
1. Admin → User Management → + New User
2. Fill user details:
   - Full Name (required)
   - Email (required, unique)
   - Role (required: standard_user, admin, super_admin)
   - Initial Password (auto-generated or manual)
3. Submit
4. User created with is_active = true
5. Welcome email sent with temporary password
6. User prompted to change password on first login

**Edit User Workflow**:
1. Admin → User Management → Select user
2. Edit fields:
   - Full Name
   - Email
   - Role (dropdown)
3. Save changes
4. User notified of changes (if email changed)

**Deactivate User Workflow**:
1. Admin → User Management → Select user
2. Click "Deactivate" button
3. Confirmation dialog
4. is_active set to false
5. User cannot log in
6. User data preserved

**Role Assignment Workflow**:
1. Admin → User Management → Select user
2. Role dropdown: standard_user, admin, super_admin
3. Change role
4. Save
5. Role updated immediately
6. User must re-login for new permissions

**Last Super Admin Protection**:
- System counts active super admins
- If count = 1, deactivation blocked
- Error message: "Cannot deactivate last super admin"
- Database trigger enforces protection

---

## 7. Creation Workflows (Step-by-Step)

### 7.1 Creating an Invoice

**User**: All roles
**Navigation**: Dashboard → Invoices → + New Invoice

**Step-by-Step**:

1. **Open Invoice Form**
   - Click "+ New Invoice" button
   - Level 2 panel opens (900px width)
   - Form title: "Create Invoice"

2. **Basic Details**
   - **Invoice Number** (required)
     - Unique identifier
     - Validation: Must not exist
     - Example: "INV-2025-001"

   - **Invoice Date** (optional)
     - Date picker
     - Default: Today
     - Format: YYYY-MM-DD

   - **Due Date** (optional)
     - Date picker
     - Validation: Must be ≥ invoice date
     - Smart suggestions (Sprint 3):
       - Net 15 (15 days from invoice date)
       - Net 30 (30 days)
       - Net 45 (45 days)

3. **Select Invoice Profile** (optional)
   - Dropdown: All visible invoice profiles
   - Filters by user access (if visible_to_all = false)
   - **Standard User**: No quick-create link
   - **Admin**: No quick-create link (profiles created in Admin menu)

4. **Select Vendor** (required)
   - Searchable dropdown
   - All active vendors (is_active = true)
   - **Standard User**: No quick-create link
   - **Admin**: "+ Add New Vendor" link
     - Opens Level 3 panel (500px)
     - Create vendor inline
     - Auto-selects in dropdown

5. **Select Entity** (optional, Sprint 9A)
   - Dropdown: All active entities
   - New in Sprint 9A (replaces SubEntity)
   - Example: "Marketing Division", "US Operations"

6. **Select Currency** (optional, Sprint 9A)
   - Searchable dropdown
   - Only active currencies shown
   - Displays: "USD - United States Dollar ($)"
   - Search by code or name
   - Symbol shown for easy identification

7. **Invoice Amount** (required)
   - Number input
   - Validation: Must be > 0
   - Format: Decimal (2 places)
   - Example: 1500.00

8. **Invoice Period** (optional, Sprint 6)
   - **Period Start** (date picker)
   - **Period End** (date picker)
   - Validation: period_end ≥ period_start
   - Use case: Recurring services (e.g., Jan-Mar maintenance)

9. **TDS Configuration** (optional, Sprint 6)
   - **TDS Applicable** (checkbox)
     - Default: false (inherited from profile if selected)
   - **TDS Percentage** (number input)
     - Conditional: Only shown if TDS applicable
     - Validation: 0-100
     - Example: 10.0 for 10%

10. **Select Category** (required)
    - Dropdown: All active categories
    - Example: "Software Licenses", "Utilities"
    - **Standard User**: No quick-create link
    - **Admin**: No quick-create link (categories created in Admin menu)

11. **Internal Notes** (optional)
    - Textarea
    - Max length: No limit
    - Example: "Invoice covers Q1 2025 software subscriptions"

12. **Payment Details** (planned Sprint 3)
    - **Payment Type** (required)
      - Dropdown: All active payment types
      - Example: "Bank Transfer", "Credit Card"
    - **Payment Method** (optional)
      - Text input
      - Example: "Wire transfer"
    - **Payment Reference** (conditional)
      - Shown if payment type requires reference
      - Example: Check number, UPI ID

13. **File Attachments** (Sprint 6)
    - **Upload Invoice PDF** (optional)
      - Click "Upload" button
      - Max size: 10 MB
      - Allowed types: PDF, PNG, JPG, JPEG
      - Multiple files supported
    - **Virus Scan** (automatic)
      - Scan status: pending, clean, infected, error
      - Infected files rejected

14. **Submit Invoice**
    - Click "Create Invoice" button
    - Validation checks:
      - Required fields filled
      - Invoice number unique
      - Dates valid (due ≥ invoice, period_end ≥ period_start)
      - TDS percentage provided if applicable
    - Invoice created:
      - status = "pending_approval"
      - submission_count = 1
      - created_by = current user
      - created_at = now
    - Success notification
    - Panel closes
    - Invoice list refreshes

---

### 7.2 Creating an Invoice Profile

**User**: Admin + Super Admin
**Standard User**: Must request via Settings → My Requests
**Navigation**: Admin → Master Data → Invoice Profiles → + New Profile

**Current Fields** (Sprint 9A):

1. **Profile Name** (required)
   - Text input
   - Unique identifier
   - Example: "Monthly Software Licenses"

2. **Description** (optional)
   - Textarea
   - Detailed explanation
   - Example: "Standard profile for all recurring software subscription invoices"

3. **Visible to All** (checkbox)
   - Default: true (all users see profile)
   - If false: Managed via UserProfileVisibility grants

4. **Submit**
   - Validation: Name required
   - Profile created with is_active = true (default)
   - Success notification
   - Panel closes

**Enhanced Fields** (planned Sprint 9B):

5. **Entity** (required)
   - Dropdown: All active entities
   - Will lock entity in invoice form

6. **Vendor** (required)
   - Searchable dropdown
   - Will lock vendor in invoice form

7. **Category** (required)
   - Dropdown: All active categories
   - Pre-filled but editable in invoice form

8. **Currency** (required)
   - Searchable dropdown
   - Will set currency in invoice form

9. **Prepaid/Postpaid** (optional)
   - Radio buttons: "Prepaid" or "Postpaid"
   - Example: Prepaid for licenses, Postpaid for utilities

10. **TDS Applicable** (checkbox)
    - Default: false
    - Pre-filled but editable in invoice form

11. **TDS Percentage** (conditional)
    - Number input (0-100)
    - Only shown if TDS applicable
    - Pre-filled but editable in invoice form

**Profile Usage in Invoice Creation** (Sprint 9B):
- **Locked Fields**: Vendor, Entity (disabled dropdowns with lock icon)
- **Editable Fields**: Category, TDS Applicable, TDS Percentage, Currency
- Visual indicators: Gray background for locked fields
- Tooltip on locked fields: "Locked by invoice profile: [Profile Name]"

---

### 7.3 Creating a Vendor

**Admin User**: Direct creation
**Standard User**: Request via Settings → My Requests

#### Admin Direct Creation

**Navigation**: Admin → Master Data → Vendors → + New Vendor

**Step-by-Step**:

1. **Open Vendor Form**
   - Click "+ New Vendor" button
   - Level 2 panel opens (600px width)

2. **Vendor Name** (required)
   - Text input
   - Example: "Acme Corporation"
   - Validation: Must not be empty

3. **Vendor Address** (optional, Sprint 9A)
   - Textarea
   - Free-form text
   - Example:
     ```
     123 Business Ave
     Suite 400
     New York, NY 10001
     USA
     ```

4. **GST Exemption** (checkbox, Sprint 9A)
   - Default: false (not exempt)
   - GST/VAT exemption flag
   - Example: Checked for government entities

5. **Bank Details** (optional, Sprint 9A)
   - Textarea
   - Max 1000 characters
   - Example:
     ```
     Bank Name: Wells Fargo
     Account Number: 1234567890
     Routing Number: 987654321
     SWIFT: WFBIUS6S
     ```

6. **Submit**
   - No status field (defaults to active)
   - Vendor created with is_active = true
   - Success notification
   - Panel closes
   - Vendor list refreshes

7. **Archive/Unarchive** (post-creation)
   - Trash icon in vendor table row
   - Toggles is_active flag
   - No confirmation dialog

---

#### Admin Quick Create from Invoice Form

**Navigation**: Invoices → + New Invoice → Vendor dropdown → "+ Add New Vendor"

**Step-by-Step**:

1. **Trigger from Invoice Form**
   - Creating invoice
   - Vendor dropdown: Click "+ Add New Vendor" link
   - Level 3 panel opens (500px width)

2. **Fill Vendor Details** (same fields as direct creation)
   - Name (required)
   - Address (optional)
   - GST Exemption (checkbox)
   - Bank Details (optional)

3. **Create Vendor**
   - Click "Create" button
   - Vendor created immediately
   - Level 3 panel closes
   - Vendor auto-selected in Level 2 invoice form dropdown
   - Continue invoice creation

**Benefits**:
- No need to leave invoice form
- Immediate availability
- Streamlined workflow

---

#### Standard User Request Workflow

**Navigation**: Settings → My Requests → "Request Vendor" button

**Step-by-Step**:

1. **Open Request Form**
   - Click "Request Vendor" button
   - Level 2 panel opens (600px width)

2. **Fill Request Form**
   - Vendor Name (required)
   - Vendor Address (optional)
   - GST Exemption (checkbox)
   - Bank Details (optional)

3. **Save or Submit**
   - **Save as Draft**: Status = "draft"
   - **Submit for Approval**: Status = "pending_approval"

4. **Track Request**
   - Request appears in My Requests tab
   - Status badge: Pending
   - Submission date displayed

5. **Admin Approves**
   - Admin reviews in Admin → Master Data Requests
   - Admin clicks "Approve"
   - Vendor created in Vendors table
   - created_entity_id set (e.g., "VEN-1234")

6. **User Notified**
   - Status updated to "approved"
   - Created entity ID displayed
   - Vendor available in invoice forms

---

### 7.4 Creating a Category

**Admin User**: Direct creation
**Standard User**: Request via Settings → My Requests

#### Admin Direct Creation

**Navigation**: Admin → Master Data → Categories → + New Category

**Step-by-Step**:

1. **Open Category Form**
   - Click "+ New Category" button
   - Level 2 panel opens (600px width)

2. **Category Name** (required)
   - Text input
   - Example: "Software Licenses"
   - Validation: Must not be empty

3. **Category Description** (required, Sprint 9A)
   - Textarea
   - Detailed explanation
   - Example: "All software subscription and license purchases"
   - **Required** in Sprint 9A (was optional)

4. **Submit**
   - No status field (defaults to active)
   - Category created with is_active = true
   - Success notification
   - Panel closes
   - Category list refreshes

5. **Archive/Unarchive** (post-creation)
   - Trash icon in category table row
   - Toggles is_active flag
   - No confirmation dialog

---

#### Standard User Request Workflow

**Navigation**: Settings → My Requests → "Request Category" button

**Step-by-Step**:

1. **Open Request Form**
   - Click "Request Category" button
   - Level 2 panel opens (600px width)

2. **Fill Request Form**
   - Category Name (required)
   - Category Description (required)

3. **Save or Submit**
   - **Save as Draft**: Status = "draft"
   - **Submit for Approval**: Status = "pending_approval"

4. **Track Request**
   - Request appears in My Requests tab
   - Status badge: Pending

5. **Admin Approves**
   - Admin reviews in Admin → Master Data Requests
   - Admin clicks "Approve"
   - Category created in Categories table
   - created_entity_id set (e.g., "CAT-5678")

6. **User Notified**
   - Status updated to "approved"
   - Created entity ID displayed
   - Category available in invoice forms

---

### 7.5 Creating a Payment Type

**Admin User**: Direct creation
**Standard User**: Request via Settings → My Requests

#### Admin Direct Creation

**Navigation**: Admin → Master Data → Payment Types → + New Payment Type

**Step-by-Step**:

1. **Open Payment Type Form**
   - Click "+ New Payment Type" button
   - Level 2 panel opens (600px width)

2. **Payment Type Name** (required)
   - Text input
   - Example: "Bank Wire Transfer"
   - Validation: Must not be empty

3. **Description** (required, Sprint 9A)
   - Textarea
   - Detailed explanation
   - Example: "Direct wire transfer to vendor bank account"
   - **Retained as required** in Sprint 9A

4. **Requires Reference** (checkbox)
   - Default: false
   - If true: Payment form requires additional reference field
   - Example: Checked for "Check Payment" (check number required)

5. **Submit**
   - No status field (defaults to active)
   - Payment type created with is_active = true
   - Success notification
   - Panel closes
   - Payment type list refreshes

6. **Archive/Unarchive** (post-creation)
   - Trash icon in payment type table row
   - Toggles is_active flag
   - No confirmation dialog

---

#### Standard User Request Workflow

**Navigation**: Settings → My Requests → "Request Payment Type" button

**Step-by-Step**:

1. **Open Request Form**
   - Click "Request Payment Type" button
   - Level 2 panel opens (600px width)

2. **Fill Request Form**
   - Payment Type Name (required)
   - Description (required)
   - Requires Reference (checkbox)

3. **Save or Submit**
   - **Save as Draft**: Status = "draft"
   - **Submit for Approval**: Status = "pending_approval"

4. **Track Request**
   - Request appears in My Requests tab
   - Status badge: Pending

5. **Admin Approves**
   - Admin reviews in Admin → Master Data Requests
   - Admin clicks "Approve"
   - Payment type created in PaymentTypes table
   - created_entity_id set (e.g., "PMT-3456")

6. **User Notified**
   - Status updated to "approved"
   - Created entity ID displayed
   - Payment type available in invoice payment forms

---

### 7.6 Creating an Entity (Sprint 9A)

**User**: Admin + Super Admin only
**Standard User**: No request workflow (admin-only feature)
**Navigation**: Admin → Master Data → Entities → + New Entity

**Step-by-Step**:

1. **Open Entity Form**
   - Click "+ New Entity" button
   - Level 2 panel opens (600px width)

2. **Entity Name** (required)
   - Text input
   - Max 255 characters
   - Example: "US Operations Division"
   - Validation: Must not be empty

3. **Description** (optional)
   - Textarea
   - Example: "Primary operational entity for United States market"

4. **Address** (required, Sprint 9A)
   - Textarea
   - Full organizational address
   - Example:
     ```
     500 Business Park Drive
     Building C, Floor 3
     Austin, TX 78701
     United States
     ```

5. **Country** (required, Sprint 9A)
   - Searchable dropdown
   - ISO 3166-1 alpha-2 codes
   - Displays full country names
   - Stores 2-char codes (US, IN, GB, etc.)
   - Example: "United States" (stored as "US")

6. **Submit**
   - No status field (defaults to active)
   - Entity created with is_active = true
   - Success notification
   - Panel closes
   - Entity list refreshes

7. **Archive/Unarchive** (post-creation)
   - Trash icon in entity table row
   - Toggles is_active flag
   - No confirmation dialog

**Migration Note**: Standard users **cannot request entities** (admin-only master data)

---

### 7.7 Managing Currencies (Sprint 9A)

**User**: Admin + Super Admin only
**Standard User**: No access
**Navigation**: Admin → Master Data → Currencies

**Important**: Currencies cannot be created or deleted (fixed set of 50 ISO 4217 currencies)

**Activation Workflow**:

1. **View Currency List**
   - All 50 ISO 4217 currencies displayed
   - Status: Most start inactive (is_active = false)
   - Columns: Code, Name, Symbol, Status

2. **Search for Currency**
   - Search field: Type "USD" or "Dollar"
   - Results filter dynamically
   - Example search terms: "Euro", "Rupee", "Yen"

3. **Activate Currency**
   - **Method**: Click activation toggle in table row
   - Toggle changes from trash icon (inactive) to checkmark (active)
   - is_active set to true immediately
   - Success notification
   - Currency available in invoice forms

4. **Deactivate Currency**
   - **Method**: Click deactivation toggle in table row
   - Toggle changes from checkmark (active) to trash icon (inactive)
   - is_active set to false immediately
   - Currency removed from invoice form dropdowns
   - **Existing invoices with currency unchanged**

**Restrictions**:
- ❌ Cannot create new currencies
- ❌ Cannot delete currencies
- ❌ Cannot edit code, name, or symbol
- ✓ Can only toggle activation status

**Pre-Seeded Currencies** (50 total):
- USD - United States Dollar ($)
- EUR - Euro (€)
- GBP - British Pound (£)
- JPY - Japanese Yen (¥)
- CNY - Chinese Yuan (¥)
- INR - Indian Rupee (₹)
- AUD - Australian Dollar ($)
- CAD - Canadian Dollar ($)
- CHF - Swiss Franc (CHF)
- BRL - Brazilian Real (R$)
- ... (40 more regional currencies)

**Invoice Integration**:
- Invoice.currency_id: Optional in Sprint 9A-9B
- Will become required in Sprint 9C
- Dropdown displays: "USD - United States Dollar ($)"
- Search by code or name

---

## 8. Master Data Request & Approval Workflow

### Complete Workflow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    Standard User                             │
│                                                              │
│  1. Settings → My Requests → Request Buttons                │
│  2. Fill request form (entity-specific fields)              │
│  3. Save as Draft or Submit for Approval                    │
│  4. Track request status in My Requests tab                 │
│                                                              │
│  Status: draft → pending_approval                           │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────┐
│                    Admin Console                             │
│                                                              │
│  5. Request appears in Admin → Master Data Requests         │
│  6. Admin filters by type/status                            │
│  7. Admin clicks request card to review                     │
│  8. Admin sees request details:                             │
│     - Requester info                                        │
│     - Entity type                                           │
│     - Request data (fields)                                 │
│     - Submission date                                       │
│     - Resubmission count                                    │
│                                                              │
│  Status: pending_approval → (review)                        │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   ▼
           ┌───────┴───────┐
           │               │
      [APPROVE]       [REJECT]
           │               │
           │               └─────────┐
           │                         │
           ▼                         ▼
┌─────────────────────┐    ┌─────────────────────┐
│  Approval Actions   │    │  Rejection Actions  │
│                     │    │                     │
│  9a. Create entity  │    │  9b. Enter reason   │
│      in master data │    │      (required)     │
│  10a. Set entity ID │    │  10b. Save reason   │
│       (VEN-1234)    │    │  11b. Update status │
│  11a. Update status │    │       to rejected   │
│       to approved   │    │  12b. Notify user   │
│  12a. Notify user   │    │                     │
└─────────┬───────────┘    └──────────┬──────────┘
          │                           │
          └───────────┬───────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────┐
│                    User Notification                         │
│                                                              │
│  13. User sees updated status in My Requests                │
│                                                              │
│  IF APPROVED:                                               │
│    - Status badge: Approved (green)                         │
│    - Created entity ID: VEN-1234                            │
│    - Entity available in dropdowns immediately              │
│                                                              │
│  IF REJECTED:                                               │
│    - Status badge: Rejected (red)                           │
│    - Rejection reason displayed                             │
│    - Resubmit button available (if <3 attempts)             │
│    - Resubmission counter: "Resubmission #1"                │
│                                                              │
│  14. End of workflow OR Resubmission                        │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   │ (IF REJECTED AND <3 ATTEMPTS)
                   │
                   ▼
┌──────────────────────────────────────────────────────────────┐
│                    Resubmission Workflow                     │
│                                                              │
│  15. User clicks request card                               │
│  16. User views rejection reason                            │
│  17. User edits request data                                │
│  18. User clicks "Resubmit"                                 │
│  19. resubmission_count increments                          │
│  20. previous_attempt_id links to original                  │
│  21. Status returns to pending_approval                     │
│                                                              │
│  Loop back to Admin Review (step 5)                         │
│                                                              │
│  Max 3 total attempts:                                      │
│    - Attempt 1: Original submission                         │
│    - Attempt 2: Resubmission #1                            │
│    - Attempt 3: Resubmission #2 (final)                    │
│                                                              │
│  After 3 attempts: Resubmit button disabled                 │
└──────────────────────────────────────────────────────────────┘
```

---

### Request States and Transitions

**Request Statuses**:
- `draft`: Saved but not submitted
- `pending_approval`: Awaiting admin review
- `approved`: Admin approved and entity created
- `rejected`: Admin rejected with reason

**State Transitions**:

```
draft ──────────────────────────────────> pending_approval
                                            │
                                            │
                                            ▼
                                    ┌──────┴──────┐
                                    │             │
                              [APPROVE]       [REJECT]
                                    │             │
                                    ▼             ▼
                               approved       rejected
                                                  │
                                                  │ (IF <3 ATTEMPTS)
                                                  │
                                                  ▼
                                           pending_approval
                                            (RESUBMISSION)
```

---

### Request Types and Entity Creation

**Vendor Request**:
- **Request Fields**: name, address, gst_exemption, bank_details
- **Created Entity**: Vendor table record
- **Entity ID Format**: VEN-1234
- **Access**: Available in invoice vendor dropdown

**Category Request**:
- **Request Fields**: name, description
- **Created Entity**: Category table record
- **Entity ID Format**: CAT-5678
- **Access**: Available in invoice category dropdown

**Invoice Profile Request**:
- **Request Fields**: name, description, visible_to_all
- **Created Entity**: InvoiceProfile table record
- **Entity ID Format**: PRF-9012
- **Access**: Available in invoice profile dropdown

**Payment Type Request**:
- **Request Fields**: name, description, requires_reference
- **Created Entity**: PaymentType table record
- **Entity ID Format**: PMT-3456
- **Access**: Available in payment type dropdown

---

### Resubmission Rules

**Max Attempts**: 3 total submissions

**Counter Display**:
- Attempt 1: No counter (original submission)
- Attempt 2: "Resubmission #1" (yellow badge)
- Attempt 3: "Resubmission #2 (Limit Reached)" (red badge)

**After Limit Reached**:
- Resubmit button disabled
- Error message: "Maximum resubmission attempts reached (3)"
- User must contact admin directly

**Request Linking**:
- `previous_attempt_id`: Links to original request
- `resubmission_count`: Increments with each resubmission
- `superseded_by_id`: Points to approved resubmission (if any)

---

### Admin Review Checklist

**Before Approval**:
- ✓ Verify request data completeness
- ✓ Check for duplicates (existing entity with same name)
- ✓ Validate data format (e.g., valid email, phone)
- ✓ Review resubmission history (if applicable)
- ✓ Check requester's previous requests

**Approval Actions**:
- ✓ Create entity in master data table
- ✓ Set `created_entity_id` (VEN-1234, CAT-5678, etc.)
- ✓ Set `status` to "approved"
- ✓ Set `reviewer_id` and `reviewed_at`
- ✓ User notification (future: email)

**Rejection Actions**:
- ✓ Provide clear rejection reason
- ✓ Set `status` to "rejected"
- ✓ Set `rejection_reason`, `reviewer_id`, `reviewed_at`
- ✓ User notification (future: email)

**Admin Notes** (optional):
- Internal comments for tracking
- Not visible to requester
- Saved in `admin_notes` field

---

## 9. Data Relationships

### Entity Relationship Diagram

```
┌─────────────────┐
│      User       │
│─────────────────│
│ id              │ PK
│ email           │
│ full_name       │
│ role            │ (standard_user, admin, super_admin)
│ is_active       │
└────────┬────────┘
         │
         │ created_by (FK)
         │
         ▼
┌────────────────────────────────────────────────┐
│                   Invoice                       │
│─────────────────────────────────────────────────│
│ id                                              │ PK
│ invoice_number                                  │ UNIQUE
│ vendor_id                                       │ FK → Vendor
│ category_id                                     │ FK → Category (nullable)
│ profile_id                                      │ FK → InvoiceProfile (nullable)
│ entity_id                                       │ FK → Entity (nullable, NEW Sprint 9A)
│ currency_id                                     │ FK → Currency (nullable, NEW Sprint 9A)
│ sub_entity_id                                   │ FK → SubEntity (nullable, DEPRECATED)
│ invoice_amount                                  │
│ invoice_date                                    │
│ due_date                                        │
│ period_start, period_end                        │ (Sprint 6)
│ tds_applicable, tds_percentage                  │ (Sprint 6)
│ notes                                           │
│ status                                          │ (pending_approval, on_hold, unpaid, partial, paid, overdue)
│ is_hidden                                       │
│ created_by                                      │ FK → User
└─────────┬──────────────┬──────────────┬────────┘
          │              │              │
          │              │              │
          ▼              ▼              ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│     Vendor      │ │    Category     │ │     Entity      │
│─────────────────│ │─────────────────│ │─────────────────│
│ id              │ │ id              │ │ id              │ PK
│ name            │ │ name            │ │ name            │
│ address         │ │ description     │ │ description     │
│ gst_exemption   │ │ is_active       │ │ address         │ (NEW Sprint 9A)
│ bank_details    │ └─────────────────┘ │ country         │ (NEW Sprint 9A)
│ is_active       │                     │ is_active       │
└─────────────────┘                     └─────────────────┘

┌─────────────────────┐
│  InvoiceProfile     │
│─────────────────────│
│ id                  │ PK
│ name                │
│ description         │
│ visible_to_all      │
│                     │
│ FUTURE (Sprint 9B): │
│ entity_id           │ FK → Entity
│ vendor_id           │ FK → Vendor
│ category_id         │ FK → Category
│ currency_id         │ FK → Currency
│ prepaid_postpaid    │
│ tds_applicable      │
│ tds_percentage      │
└─────────────────────┘

┌─────────────────┐
│    Currency     │
│─────────────────│
│ id              │ PK
│ code            │ UNIQUE (ISO 4217: USD, EUR, INR)
│ name            │
│ symbol          │
│ is_active       │ (DEFAULT false, admin activates)
└─────────────────┘

┌─────────────────────────┐
│    PaymentType          │
│─────────────────────────│
│ id                      │ PK
│ name                    │
│ description             │ (REQUIRED Sprint 9A)
│ requires_reference      │
│ is_active               │
└────────┬────────────────┘
         │
         │ payment_type_id (FK)
         │
         ▼
┌─────────────────┐
│     Payment     │
│─────────────────│
│ id              │ PK
│ invoice_id      │ FK → Invoice
│ payment_type_id │ FK → PaymentType
│ amount_paid     │
│ payment_date    │
│ payment_method  │
│ status          │ (pending, approved, rejected)
└─────────────────┘

┌─────────────────────────────────┐
│    MasterDataRequest            │
│─────────────────────────────────│
│ id                              │ PK
│ entity_type                     │ (vendor, category, invoice_profile, payment_type)
│ status                          │ (draft, pending_approval, approved, rejected)
│ requester_id                    │ FK → User
│ request_data                    │ (JSON string)
│ reviewer_id                     │ FK → User
│ reviewed_at                     │
│ rejection_reason                │
│ admin_edits                     │ (JSON string, optional)
│ admin_notes                     │ (internal)
│ resubmission_count              │ (0-2)
│ previous_attempt_id             │ FK → MasterDataRequest (self-reference)
│ superseded_by_id                │ FK → MasterDataRequest (self-reference)
│ created_entity_id               │ (VEN-1234, CAT-5678, PRF-9012, PMT-3456)
└─────────────────────────────────┘
```

---

### Key Relationships

**Invoice Dependencies**:
- **Required**: `vendor_id` (Vendor)
- **Optional**: `category_id` (Category), `profile_id` (InvoiceProfile), `entity_id` (Entity), `currency_id` (Currency)
- **Deprecated**: `sub_entity_id` (SubEntity, use `entity_id` instead)
- **Creator**: `created_by` (User)

**Master Data Request Flow**:
- User (`requester_id`) creates request
- Admin (`reviewer_id`) reviews request
- On approval: Entity created in respective table (Vendor, Category, etc.)
- `created_entity_id` stores reference (VEN-1234, CAT-5678)

**Invoice Profile Visibility**:
- If `visible_to_all = true`: All users see profile
- If `visible_to_all = false`: Check `UserProfileVisibility` for access

**Currency Activation**:
- All currencies start `is_active = false`
- Admin activates via toggle
- Only active currencies shown in invoice forms

**Entity Migration Path**:
- `SubEntity` preserved for backward compatibility
- New invoices use `entity_id` (Entity table)
- Old invoices may still reference `sub_entity_id`

---

## 10. Access Control Summary Table

| Feature | Standard User | Admin | Super Admin |
|---------|--------------|-------|-------------|
| **Navigation** | | | |
| Dashboard | ✓ | ✓ | ✓ |
| Invoices | ✓ (own only) | ✓ (all) | ✓ (all) |
| Reports | ✓ | ✓ | ✓ |
| Settings | ✓ | ✓ | ✓ |
| Admin Console | ✗ (403) | ✓ | ✓ |
| **Invoice Operations** | | | |
| View own invoices | ✓ | ✓ | ✓ |
| View all invoices | ✗ | ✓ | ✓ |
| Create invoice | ✓ | ✓ | ✓ |
| Edit own invoice | ✓ | ✓ | ✓ |
| Edit any invoice | ✗ | ✓ | ✓ |
| Delete invoice | ✗ | ✗ | ✗ |
| Place on hold | ✗ | ✓ | ✓ |
| Release from hold | ✗ | ✓ | ✓ |
| Hide invoice | ✗ | ✓ | ✓ |
| Unhide invoice | ✗ | ✓ | ✓ |
| Approve invoice | ✗ | ✓ | ✓ |
| Reject invoice | ✗ | ✓ | ✓ |
| Add attachments | ✓ | ✓ | ✓ |
| Delete attachments | Own only | All | All |
| Add comments | ✓ | ✓ | ✓ |
| Delete comments | Own only | All | All |
| **Master Data (Direct)** | | | |
| View master data | ✗ | ✓ | ✓ |
| Create vendor | ✗ | ✓ | ✓ |
| Edit vendor | ✗ | ✓ | ✓ |
| Archive vendor | ✗ | ✓ | ✓ |
| Create category | ✗ | ✓ | ✓ |
| Edit category | ✗ | ✓ | ✓ |
| Archive category | ✗ | ✓ | ✓ |
| Create entity | ✗ | ✓ | ✓ |
| Edit entity | ✗ | ✓ | ✓ |
| Archive entity | ✗ | ✓ | ✓ |
| Create payment type | ✗ | ✓ | ✓ |
| Edit payment type | ✗ | ✓ | ✓ |
| Archive payment type | ✗ | ✓ | ✓ |
| Activate currency | ✗ | ✓ | ✓ |
| Deactivate currency | ✗ | ✓ | ✓ |
| Create invoice profile | ✗ | ✓ | ✓ |
| Edit invoice profile | ✗ | ✓ | ✓ |
| Archive invoice profile | ✗ | ✓ | ✓ |
| **Master Data (Request)** | | | |
| Request vendor | ✓ | ✓ | ✓ |
| Request category | ✓ | ✓ | ✓ |
| Request invoice profile | ✓ | ✓ | ✓ |
| Request payment type | ✓ | ✓ | ✓ |
| Request entity | ✗ | ✗ | ✗ |
| Request currency | ✗ | ✗ | ✗ |
| View own requests | ✓ | ✓ | ✓ |
| View all requests | ✗ | ✓ | ✓ |
| Approve requests | ✗ | ✓ | ✓ |
| Reject requests | ✗ | ✓ | ✓ |
| **Quick Create (Invoice Form)** | | | |
| + Add New Vendor | ✗ | ✓ | ✓ |
| + Request New Vendor | ✗ (removed 9A) | ✗ | ✗ |
| + Add New Profile | ✗ | ✓ (Sprint 9B) | ✓ (Sprint 9B) |
| **User Management** | | | |
| View users | ✗ | ✗ | ✓ |
| Create user | ✗ | ✗ | ✓ |
| Edit user | ✗ | ✗ | ✓ |
| Deactivate user | ✗ | ✗ | ✓ |
| Assign roles | ✗ | ✗ | ✓ |
| Reset passwords | ✗ | ✗ | ✓ |
| Manage profile visibility | ✗ | ✗ | ✓ |
| View audit logs | ✗ | ✗ | ✓ |
| **Settings** | | | |
| Edit own profile | ✓ | ✓ | ✓ |
| Change password | ✓ | ✓ | ✓ |
| Manage notifications | ✓ | ✓ | ✓ |

---

## 11. Navigation Paths Quick Reference

### Invoice Management
- **List Invoices**: Dashboard → Invoices
- **Create Invoice**: Dashboard → Invoices → + New Invoice
- **View Invoice**: Dashboard → Invoices → Click invoice card
- **Edit Invoice**: Dashboard → Invoices → Click invoice card → Edit button
- **Add Attachment**: Dashboard → Invoices → Click invoice card → Attachments tab → Upload
- **Add Comment**: Dashboard → Invoices → Click invoice card → Comments tab → Add Comment

### Master Data Requests (Standard User)
- **Request Vendor**: Settings → My Requests → Request Vendor
- **Request Category**: Settings → My Requests → Request Category
- **Request Invoice Profile**: Settings → My Requests → Request Invoice Profile
- **Request Payment Type**: Settings → My Requests → Request Payment Type
- **Track Requests**: Settings → My Requests tab
- **View Request Details**: Settings → My Requests → Click request card
- **Resubmit Request**: Settings → My Requests → Click rejected request card → Resubmit

### Master Data Management (Admin)
- **Manage Vendors**: Admin → Master Data → Vendors sub-tab
- **Manage Categories**: Admin → Master Data → Categories sub-tab
- **Manage Entities**: Admin → Master Data → Entities sub-tab
- **Manage Payment Types**: Admin → Master Data → Payment Types sub-tab
- **Manage Currencies**: Admin → Master Data → Currencies sub-tab
- **Manage Invoice Profiles**: Admin → Master Data → Invoice Profiles sub-tab
- **Review Requests**: Admin → Master Data Requests tab
- **Approve Request**: Admin → Master Data Requests → Click request card → Approve
- **Reject Request**: Admin → Master Data Requests → Click request card → Reject

### Admin Quick Actions
- **Quick Create Vendor (from Invoice)**: Invoices → + New Invoice → Vendor dropdown → + Add New Vendor
- **Activate Currency**: Admin → Master Data → Currencies → Click activation toggle
- **Archive Entity**: Admin → Master Data → [Entity Type] → Click trash icon in row

### User Management (Super Admin)
- **View Users**: Admin → User Management tab
- **Create User**: Admin → User Management → + New User
- **Edit User**: Admin → User Management → Click user → Edit
- **Deactivate User**: Admin → User Management → Click user → Deactivate
- **Assign Role**: Admin → User Management → Click user → Edit → Role dropdown

### Settings
- **Edit Profile**: Settings → Profile tab
- **Change Password**: Settings → Profile tab → Change Password
- **View Requests**: Settings → My Requests tab
- **Create Request**: Settings → My Requests → Request buttons

---

## 12. Role Badge Reference

Throughout the application, role badges are displayed to indicate user access levels:

| Badge | Role | Access Level |
|-------|------|--------------|
| 👤 **STANDARD USER** | standard_user | Basic access: Create/view own invoices, request master data |
| 🔧 **ADMIN** | admin | Advanced access: Master data management, request approval, all invoices |
| ⚙️ **SUPER ADMIN** | super_admin | Full access: All admin capabilities + user management |

**Formatting**:
- Role badges use uppercase
- Underscores replaced with spaces
- Example: `standard_user` → "STANDARD USER"

**Display Locations**:
- Sidebar user profile section
- User management table (admin view)
- User detail panels
- Activity logs

---

## Appendix A: Sprint 9A Changes Summary

### Database Schema Changes

**New Tables**:
- `Currency` (50 ISO 4217 currencies, all inactive by default)
- `Entity` (organizational entities with address and country)

**Table Enhancements**:
- `Vendor`: Added address, gst_exemption, bank_details
- `Category`: Made description required (backfilled existing)
- `Invoice`: Added currency_id, entity_id (nullable)

**Table Deprecations**:
- `SubEntity`: Preserved for backward compatibility, use Entity instead
- `ArchiveRequest`: Dropped (0 pending requests confirmed)

### UI/UX Changes

**Admin Menu**:
- Moved "Master Data" from Settings to Admin menu
- Settings page now has only Profile + My Requests tabs
- Admin menu hidden for standard users (RBAC)

**Form Simplifications**:
- Removed `is_active` checkbox from all create/edit forms
- Archive/unarchive via trash icon toggle in tables only
- Cleaner forms, less clutter

**Quick Create Features**:
- Admin: "+ Add New Vendor" link in invoice form (Level 3 panel)
- Standard User: No quick-create links (must request via Settings)

**Currency Management**:
- New Currency sub-tab in Master Data
- Activation toggle only (no create/delete)
- 50 pre-seeded ISO 4217 currencies

**Entity Management**:
- New Entity sub-tab in Master Data
- Address and country fields required
- Country: ISO alpha-2 codes with full name display

### RBAC Enhancements

**Middleware Protection**:
- `/admin/*` routes protected (admin + super_admin only)
- 403 Forbidden for unauthorized access (no redirect)
- Middleware config: `middleware.ts`

**Menu Visibility**:
- Admin menu item auto-hidden for standard users
- Sidebar filters navigation based on role

### Migration Notes

**Post-Migration Admin Tasks**:
1. Activate currencies: `UPDATE currencies SET is_active = true WHERE code IN ('USD', 'INR');`
2. Update entity addresses: Replace "Migration: Address pending"
3. Update entity countries: Replace default 'US' with correct codes
4. Update vendor fields: Add addresses, GST exemption, bank details

**Backward Compatibility**:
- SubEntity table preserved (no breaking changes)
- Existing invoices with sub_entity_id still work
- New invoices use entity_id
- Migration path established for Sprint 9B

---

## Appendix B: Planned Features (Future Sprints)

### Sprint 9B: Invoice Profile Enhancement

**New Features**:
- 12-field invoice profiles (entity, vendor, category, currency, TDS, prepaid/postpaid)
- Profile-based invoice creation (locked vendor/entity fields)
- Draft save for complex profile creation (localStorage)
- Admin quick-create from invoice form (navigation-based)

**Expected Changes**:
- Invoice form: Locked fields when profile selected
- Profile form: 7 new required fields
- Draft workflow: Save → Navigate → Restore

### Sprint 10: User Management & RBAC

**New Features**:
- User CRUD (super admin only)
- Role assignment (standard_user, admin, super_admin)
- Password reset workflow
- Profile visibility grants
- User activity audit trail

**Expected Changes**:
- Admin → User Management tab (super admin only)
- Settings → Profile tab (functional)
- Last super admin protection enforced

### Sprint 11: Dashboard & Analytics

**New Features**:
- KPI summary cards
- Charts and visualizations
- Recent activity feed
- Quick actions
- Role-based dashboard

**Expected Changes**:
- Dashboard page functional (currently placeholder)
- Charts: Invoice status, payment trends, vendor spending
- Admin-specific dashboard view

### Sprint 12: Polish & Production Prep

**New Features**:
- Comprehensive testing (unit, integration, E2E)
- Performance optimization
- Security audit
- Production deployment guide
- Complete documentation

**Expected Changes**:
- Loading states everywhere
- Error boundaries
- Empty states
- 404/500 pages
- Favicon and branding

---

## Appendix C: Troubleshooting Guide

### Common User Issues

**Issue**: Cannot access Admin menu
**Solution**: Admin menu is only visible to admin and super_admin roles. Standard users must request master data via Settings → My Requests.

**Issue**: Vendor not appearing in invoice form dropdown
**Solution**: Ensure vendor is active (is_active = true). Admins can check in Admin → Master Data → Vendors. Inactive vendors are hidden from dropdowns.

**Issue**: Currency not available in invoice form
**Solution**: Admin must activate currency in Admin → Master Data → Currencies. All currencies start inactive.

**Issue**: Cannot resubmit rejected request
**Solution**: Max 3 submission attempts allowed. If limit reached, contact admin directly for assistance.

**Issue**: "+ Add New Vendor" link missing in invoice form
**Solution**: This is an admin-only feature. Standard users must request vendors via Settings → My Requests.

### Admin Issues

**Issue**: Request approval not creating entity
**Solution**: Check database connection and Prisma client. Verify created_entity_id is set after approval. Check console for errors.

**Issue**: Cannot deactivate last super admin
**Solution**: System protection prevents deactivating the last super admin. Promote another user to super admin first.

**Issue**: Currency toggle not working
**Solution**: Currencies cannot be deleted, only toggled. Ensure is_active flag is updating correctly. Check admin permissions.

**Issue**: Entity migration addresses incorrect
**Solution**: Post-migration task: Update placeholder addresses ("Migration: Address pending") and default countries ('US') manually in Admin → Master Data → Entities.

---

## Document Change Log

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-10-23 | Initial creation, Sprint 9A documentation | Documentation Agent |

---

## Feedback & Updates

This guide reflects the PayLog system as of **Sprint 9A (In Progress)**.

For updates, corrections, or feedback, please contact the development team or create an issue in the project repository.

**Last Updated**: October 23, 2025
**Next Review**: After Sprint 9A completion
