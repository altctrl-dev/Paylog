# PayLog User Guide

**Version**: 0.12.0 | **Last Updated**: October 30, 2025

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard](#dashboard)
3. [Invoice Management](#invoice-management)
4. [Master Data](#master-data)
5. [User Management](#user-management)
6. [Reports](#reports)
7. [Settings](#settings)
8. [FAQ](#faq)

---

## Getting Started

### First Login

1. Navigate to your PayLog URL (e.g., `https://paylog.example.com`)
2. Enter your email and password
3. You'll be directed to the dashboard

### User Roles

PayLog has three user roles:

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| **Standard User** | Regular invoice creators | Create invoices, view own invoices, request master data |
| **Admin** | Department managers | Approve invoices, manage master data, view all invoices |
| **Super Admin** | System administrators | Full access, user management, system settings |

---

## Dashboard

### Overview

The dashboard provides a comprehensive view of your invoice system with real-time metrics, charts, and recent activity.

**Access**: Click "Dashboard" in the sidebar or navigate to `/dashboard`

### Date Range Filter

Use the date range selector in the top-right to view data for different time periods:

- **1M**: Last 30 days
- **3M**: Last 90 days
- **6M**: Last 180 days (default)
- **1Y**: Last 365 days
- **All**: All time

The date range affects all KPIs and charts on the dashboard.

### KPI Cards

The dashboard displays 6 key performance indicators:

#### Total Invoices
- Count of all invoices in the selected period
- Includes all statuses (pending, approved, paid, rejected, on hold)

#### Pending Approvals
- Number of invoices awaiting approval
- Admins/Managers: Shows all pending invoices
- Standard Users: Shows only their own pending invoices

#### Total Unpaid
- Sum of all unpaid invoice amounts
- Includes approved, pending, and overdue invoices
- Excludes rejected invoices

#### Paid This Month
- Sum of payments received in the current calendar month
- Shows total revenue collected this month
- Resets on the 1st of each month

#### Overdue
- Count of invoices past their due date
- Helps prioritize payment follow-ups
- Color-coded as warning status

#### On Hold
- Count of invoices temporarily paused
- Admin-only status
- Requires reason when placed on hold

### Charts

#### 1. Invoice Status Breakdown (Pie Chart)

**Location**: Top-left of charts section

**Purpose**: Shows distribution of invoices by status

**Statuses**:
- Pending Approval (yellow)
- Approved (blue)
- Paid (green)
- Rejected (red)
- On Hold (orange)

**Interaction**: Hover over segments to see counts and percentages

#### 2. Payment Trends (Line Chart)

**Location**: Top-right of charts section

**Purpose**: Visualizes payment amounts over time

**Features**:
- Shows payment totals per month
- Helps identify payment patterns
- Useful for cash flow forecasting

**Time Range**: Adapts to selected date range filter

#### 3. Top Vendors by Spending (Bar Chart)

**Location**: Bottom-left of charts section

**Purpose**: Displays top 10 vendors by total invoice amount

**Features**:
- Horizontal bar chart for easy comparison
- Helps identify major suppliers
- Useful for vendor relationship management

**Calculation**: Sum of all invoice amounts per vendor (regardless of payment status)

#### 4. Invoice Volume (Line Chart)

**Location**: Bottom-right of charts section

**Purpose**: Tracks number of invoices created over time

**Features**:
- Shows invoice counts per month
- Helps identify busy periods
- Useful for capacity planning

**Time Range**: Adapts to selected date range filter

### Activity Feed

**Location**: Right sidebar (on desktop) or below charts (on mobile)

**Purpose**: Shows last 10 invoice-related activities

**Activity Types**:
- **Invoice Created**: New invoice submitted
- **Payment Received**: Invoice marked as paid
- **Status Changed**: Invoice status updated (approved, rejected, etc.)
- **Invoice Rejected**: Invoice rejected by admin

**Display Format**:
```
[Icon] [Action] [Invoice Number]
       [Relative Time] (e.g., "2 hours ago")
```

**Interaction**: Click any activity item to view invoice details

### Quick Actions

**Location**: Below Activity Feed

**Purpose**: Fast access to common tasks

**Actions**:

#### Create Invoice
- **Visible To**: All users
- **Function**: Opens invoice creation form
- **Shortcut**: Click to start new invoice

#### Approve Pending
- **Visible To**: Admins and Managers only
- **Function**: Navigate to pending approvals list
- **Badge**: Shows count of pending invoices

#### View Overdue
- **Visible To**: All users
- **Function**: Filter invoice list to overdue items
- **Helps**: Prioritize follow-up actions

#### View Reports
- **Visible To**: Admins and Managers
- **Function**: Access detailed reporting page
- **Features**: Advanced filters and exports

### Manual Refresh

**Location**: Top-right corner (refresh icon button)

**Purpose**: Fetch latest data without page reload

**Features**:
- Bypasses 60-second cache
- Updates all KPIs, charts, and activity feed
- Shows "Last updated" timestamp after refresh

**When to Use**:
- After creating/updating invoices
- When expecting payment confirmations
- To verify recent status changes

### Role-Based Views

#### Standard User View
- **Sees**: Only their own invoices
- **KPIs**: Personal metrics (own invoices, own pending, own overdue)
- **Charts**: Limited to own data
- **Quick Actions**: Create Invoice, View Overdue only

#### Admin/Manager View
- **Sees**: All invoices in the system
- **KPIs**: Organization-wide metrics
- **Charts**: Complete data across all users
- **Quick Actions**: All actions including Approve Pending

#### Super Admin View
- **Sees**: Everything admins see
- **Additional**: System statistics and user management access
- **Quick Actions**: All actions plus system settings

### Mobile Responsive Design

The dashboard adapts to different screen sizes:

- **Desktop** (>1024px): 4-column KPI grid, side-by-side charts
- **Tablet** (768-1024px): 2-column KPI grid, stacked charts
- **Mobile** (<768px): 1-column layout, stacked components

**Mobile Tips**:
- Scroll horizontally on charts for details
- Activity feed appears below charts
- Date range selector collapses to icon

### Performance

- **Initial Load**: Fast (Server-Side Rendered)
- **Cache Duration**: 60 seconds
- **Chart Render**: <1 second
- **Manual Refresh**: <2 seconds

### Troubleshooting

#### KPIs Not Updating
- Click the refresh button (top-right)
- Wait 60 seconds for cache to expire
- Check your role (Standard users see limited data)

#### Charts Not Displaying
- Ensure JavaScript is enabled
- Try a different browser
- Check console for errors

#### "No Data Available"
- Select a wider date range (try "All")
- Verify invoices exist in the system
- Check your user permissions

---

## Invoice Management

*(Coming soon: Detailed invoice management guide)*

---

## Master Data

*(Coming soon: Master data management guide)*

---

## User Management

*(Coming soon: User management guide for super admins)*

---

## Reports

*(Coming soon: Reports and analytics guide)*

---

## Settings

*(Coming soon: User settings and preferences guide)*

---

## FAQ

### General Questions

**Q: How often does the dashboard update?**
A: The dashboard uses a 60-second cache. Click the refresh button to get the latest data immediately.

**Q: Why can't I see all invoices?**
A: Standard users only see their own invoices. Admins and managers can see all invoices.

**Q: What does "On Hold" status mean?**
A: Admins can temporarily pause invoices with a reason. This prevents further processing until released.

**Q: Can I export dashboard data?**
A: Not directly from the dashboard. Use the Reports page for detailed exports (CSV, Excel, PDF).

### Dashboard Questions

**Q: Why do my KPIs show different numbers than expected?**
A: Check your date range filter. KPIs are filtered by the selected time period.

**Q: How is "Paid This Month" calculated?**
A: It sums all payments received in the current calendar month (resets on the 1st).

**Q: Why don't I see the "Approve Pending" button?**
A: This button is only visible to admins and managers with approval permissions.

**Q: Can I customize the dashboard layout?**
A: Not currently. Dashboard layout is standardized for all users.

---

## Support

For additional help:

1. Check this user guide first
2. Contact your system administrator
3. Refer to the [Technical Documentation](/docs/README.md)

---

## Appendix: Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `ESC` | Close open panel |
| `Ctrl+/` | Open command palette (coming soon) |
| `Ctrl+N` | New invoice (coming soon) |

---

**Document Version**: 1.0.0
**Last Reviewed**: October 30, 2025
**Next Review**: After Sprint 13 completion
