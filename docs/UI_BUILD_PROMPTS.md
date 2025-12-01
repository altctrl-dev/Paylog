# PayLog Dashboard - UI Build Prompts

> **Purpose**: Step-by-step prompts to rebuild the PayLog UI from scratch
> **Created**: November 27, 2025
> **Target**: Any LLM-assisted development session

---

## Overview

These prompts guide you through building the PayLog dashboard UI systematically. Execute them in order for best results.

**Build Order**:
1. Project Setup & Theme System
2. Layout (Sidebar + Navbar)
3. Dashboard View
4. Invoices View Tab Structure
5. Recurring Tab Card Layout
6. Recurring Tab Data Model & Logic
7. Command Palette

---

## 🎨 Prompt 1: Project Setup & Theme System

```markdown
# Task: Set Up PayLog Dashboard - Project Foundation & Theme System

## Project Overview
Create a modern SaaS dashboard for invoice & payment management called "PayLog".
Target market: India (use ₹ currency throughout).

## Tech Stack
- React 18 + TypeScript
- Vite as build tool
- Tailwind CSS for styling
- Lucide React for icons

## Step 1: Initialize Project
```bash
npm create vite@latest paylog-dashboard -- --template react-ts
cd paylog-dashboard
npm install tailwindcss postcss autoprefixer lucide-react
npx tailwindcss init -p
```

## Step 2: Theme System Requirements

### Color Palette
Create a dual-theme system (dark/light mode) with these colors:

**Semantic Colors** (use across both themes):
- Coral/Urgent: #FF7F7F (overdue, critical alerts)
- Orange/Warning: #fb923c (pending, warnings)
- Green/Success: #4ade80 (paid, completed)
- Blue/Info: #60a5fa (future dates, informational)

**Dark Theme**:
- Background primary: gray-950 (#030712)
- Background secondary: gray-900 (#111827)
- Background tertiary: gray-800 (#1f2937)
- Border: gray-800 (#1f2937)
- Text primary: white
- Text secondary: gray-300 (#d1d5db)
- Text muted: gray-500 (#6b7280)

**Light Theme**:
- Background primary: gray-50 (#f9fafb)
- Background secondary: white (#ffffff)
- Background tertiary: gray-100 (#f3f4f6)
- Border: gray-200 (#e5e7eb)
- Text primary: gray-900 (#111827)
- Text secondary: gray-700 (#374151)
- Text muted: gray-500 (#6b7280)

### CSS Variables Implementation
Create `src/index.css` with CSS custom properties:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg-primary: #f9fafb;
  --bg-secondary: #ffffff;
  --bg-tertiary: #f3f4f6;
  --border-color: #e5e7eb;
  --text-primary: #111827;
  --text-secondary: #374151;
  --text-muted: #6b7280;
}

.dark {
  --bg-primary: #030712;
  --bg-secondary: #111827;
  --bg-tertiary: #1f2937;
  --border-color: #1f2937;
  --text-primary: #ffffff;
  --text-secondary: #d1d5db;
  --text-muted: #6b7280;
}

/* Smooth theme transitions */
* {
  transition: background-color 600ms cubic-bezier(0.4, 0, 0.2, 1),
              border-color 600ms cubic-bezier(0.4, 0, 0.2, 1),
              color 600ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

### Theme Toggle Implementation
Create a state variable `isDark` and toggle the `.dark` class on document root:
```typescript
const [isDark, setIsDark] = useState(true); // Default to dark mode

useEffect(() => {
  document.documentElement.classList.toggle('dark', isDark);
}, [isDark]);
```

## Step 3: Typography Scale
- Logo: "PAYLOG" - all caps, font-bold, tracking-wide
- Page titles: text-3xl font-bold
- Section headers: text-2xl font-semibold
- Large numbers (amounts): text-3xl font-bold
- Body text: text-base (16px)
- Labels: text-sm (14px)
- Small labels: text-xs (12px)

## Step 4: Component Design Tokens
- Border radius (cards): rounded-xl (12px)
- Border radius (buttons): rounded-lg (8px)
- Border radius (badges): rounded-full
- Spacing: Use Tailwind's spacing scale (p-4, p-5, gap-3, etc.)
- Shadows: shadow-lg on hover for cards
- Transitions: 300ms for interactions, 600ms for theme changes

## Acceptance Criteria
- [ ] Vite + React + TypeScript project initialized
- [ ] Tailwind CSS configured with custom colors
- [ ] CSS variables for theme switching
- [ ] Smooth 600ms theme transition working
- [ ] Dark mode as default, toggle switches to light
- [ ] All semantic colors defined (coral, orange, green, blue)

## Output
Create the main App component shell with theme state ready for layout implementation.
```

---

## 📐 Prompt 2: Layout Structure (Sidebar + Navbar)

```markdown
# Task: Build PayLog Dashboard Layout - Collapsible Sidebar & Top Navbar

## Layout Requirements

### Overall Structure
```
┌─────────────────────────────────────────────────────────────┐
│ [Sidebar]  │  [Top Navigation Bar]                          │
│            │─────────────────────────────────────────────────│
│  PAYLOG    │                                                 │
│            │                                                 │
│  Dashboard │           [Main Content Area]                   │
│  Invoices  │                                                 │
│  Reports   │                                                 │
│  Clients   │                                                 │
│  Settings  │                                                 │
│            │                                                 │
│ [Collapse] │                                                 │
└─────────────────────────────────────────────────────────────┘
```

### Sidebar Specifications

**Dimensions**:
- Expanded width: 256px (w-64)
- Collapsed width: 64px (w-16)
- Transition: 300ms ease-in-out

**Elements** (top to bottom):
1. **Logo Area**:
   - Show "PAYLOG" text when expanded
   - Hide when collapsed (logo moves to navbar)

2. **Navigation Items**:
   - Dashboard (LayoutDashboard icon)
   - Invoices (FileText icon) - with badge showing "12"
   - Reports (BarChart3 icon)
   - Clients (Users icon)
   - Settings (Settings icon)

3. **Navigation Item Behavior**:
   - Active state: Blue accent background (bg-blue-500/10), blue text
   - Hover state: Subtle background change
   - Collapsed: Show only icons with tooltips on hover
   - Badge visible in both states

4. **Collapse Button**:
   - Position: Bottom of sidebar
   - Style: Claude AI-style double chevron (ChevronLeft/ChevronRight)
   - Click toggles `sidebarOpen` state

5. **Additional Elements** (expanded only):
   - AI Assistant promo section (sparkles icon, "Try AI Assistant")
   - Help & Support link at bottom

### Top Navbar Specifications

**Height**: h-16 (64px)
**Position**: Sticky top-0 with backdrop blur

**Elements** (left to right):
1. **Logo** (only when sidebar collapsed):
   - "PAYLOG" text with opacity transition
   - Visible when `!sidebarOpen`

2. **Command Palette Trigger**:
   - Search-style input appearance
   - "Search or type a command..." placeholder
   - Badge showing "⌘K" shortcut
   - Opens command palette modal on click

3. **Quick Action Button**:
   - Plus (+) icon button
   - Dropdown menu on click:
     - "Add Invoice"
     - "Add Payment"
     - "Add Vendor"
   - Click-outside closes dropdown

4. **Theme Toggle**:
   - Sun icon (light mode) / Moon icon (dark mode)
   - Toggles `isDark` state

5. **Notifications**:
   - Bell icon
   - Red dot indicator for unread

6. **User Profile**:
   - User name: "Althaf Azeez"
   - Role: "Admin"
   - Avatar circle with initials or image

### State Management
```typescript
const [sidebarOpen, setSidebarOpen] = useState(true);
const [activeView, setActiveView] = useState('dashboard');
const [quickActionOpen, setQuickActionOpen] = useState(false);
const [isDark, setIsDark] = useState(true);
```

### Logo Transition Logic
When sidebar collapses:
- Sidebar logo fades out (opacity 0)
- Navbar logo fades in (opacity 100)
- Use 300ms transition for smooth handoff

### Responsive Behavior
- Desktop: Full sidebar visible
- Tablet/Mobile: Sidebar auto-collapsed or overlay mode

## Acceptance Criteria
- [ ] Sidebar expands (256px) and collapses (64px) smoothly
- [ ] Navigation items show icons + text when expanded, icons only when collapsed
- [ ] Tooltips appear on collapsed nav items hover
- [ ] Badge on "Invoices" visible in both states
- [ ] Logo transitions smoothly between sidebar and navbar
- [ ] Quick action dropdown opens/closes correctly
- [ ] Theme toggle switches between dark/light
- [ ] Backdrop blur on navbar
- [ ] Click-outside closes dropdowns

## Icons Needed (from Lucide)
```typescript
import {
  LayoutDashboard, FileText, BarChart3, Users, Settings,
  ChevronLeft, ChevronRight, Search, Plus, Sun, Moon,
  Bell, Sparkles, HelpCircle
} from 'lucide-react';
```
```

---

## 📊 Prompt 3: Dashboard View

```markdown
# Task: Build PayLog Dashboard View - KPI Cards, Invoice Table & AI Insights

## Dashboard Layout
```
┌────────────────────────────────────────────────────────────┐
│  Dashboard                                                  │
├────────────┬────────────┬────────────┬────────────────────│
│ Total      │ Paid This  │ Pending    │ Overdue            │
│ Payables   │ Month      │ Payments   │                    │
│ ₹2,42,350  │ ₹1,87,500  │ ₹24,350    │ 3                  │
│ +12.5% ↑   │ +8.2% ↑    │ -5.1% ↓    │ +2 ↑               │
├────────────┴────────────┴────────────┴────────────────────│
│  [Search] [Filter] [Export]              [+ New Invoice]   │
├────────────────────────────────────────────────────────────│
│  ☐ │ Invoice ID │ Client        │ Amount  │ Status │ Due  │
│  ☐ │ INV-001   │ Infopark Rent │ ₹1,25,000│ Paid   │ -    │
│  ☐ │ INV-002   │ Airtel        │ ₹1,196  │ Pending│ 3d   │
│  ...                                                       │
├────────────────────────────────────────────────────────────│
│  ✨ AI Insights: 3 payments due this week totaling ₹45,000 │
│     [View detailed analysis →]                             │
└────────────────────────────────────────────────────────────┘
```

## KPI Metric Cards (4 cards in a row)

### Card 1: Total Payables
- Value: ₹2,42,350
- Change: +12.5% ↑ (green for increase in context of tracking)
- Icon: Appropriate financial icon

### Card 2: Paid This Month
- Value: ₹1,87,500
- Change: +8.2% ↑ (green)
- Icon: Check or payment icon

### Card 3: Pending Payments
- Value: ₹24,350
- Change: -5.1% ↓ (green because pending decreased)
- Icon: Clock or pending icon

### Card 4: Overdue
- Value: 3 (count, not currency)
- Change: +2 ↑ (red because overdue increased)
- Icon: Alert or warning icon

### Card Design
```jsx
<div className="p-5 rounded-xl border bg-gray-900 border-gray-800">
  <div className="flex items-center justify-between mb-2">
    <span className="text-gray-400 text-sm">Total Payables</span>
    <Icon className="w-5 h-5 text-gray-500" />
  </div>
  <div className="text-3xl font-bold text-white">₹2,42,350</div>
  <div className="flex items-center gap-1 mt-1">
    <span className="text-green-400 text-sm">+12.5%</span>
    <ArrowUp className="w-3 h-3 text-green-400" />
    <span className="text-gray-500 text-xs">vs last month</span>
  </div>
</div>
```

## Invoice Table

### Table Actions Bar
- Search input with Search icon
- Filter dropdown button
- Export button
- "New Invoice" primary CTA button (blue)

### Table Columns
1. Checkbox (for bulk selection)
2. Invoice ID (e.g., "INV-2024-001")
3. Client/Vendor name
4. Amount (₹ formatted with commas)
5. Status (badge: Paid/Pending/Overdue)
6. Date (formatted date)
7. Due (days until due or overdue)
8. Actions (eye, edit, more icons)

### Status Badge Styles
```jsx
// Paid - Green
<span className="px-2 py-1 rounded-full text-xs bg-green-500/10 text-green-400">
  Paid
</span>

// Pending - Amber
<span className="px-2 py-1 rounded-full text-xs bg-amber-500/10 text-amber-400">
  Pending
</span>

// Overdue - Red
<span className="px-2 py-1 rounded-full text-xs bg-red-500/10 text-red-400">
  Overdue
</span>
```

### Row Selection
- Header checkbox: Select/deselect all
- Row checkboxes: Individual selection
- Selected rows: Subtle highlight background

## AI Insights Panel

### Design
```jsx
<div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
  <div className="flex items-center gap-2 mb-2">
    <Sparkles className="w-5 h-5 text-blue-400" />
    <span className="font-medium text-white">AI Insights</span>
  </div>
  <p className="text-gray-300 text-sm">
    3 payments due this week totaling ₹45,000. Consider prioritizing
    Infopark Rent (₹1,24,000) which is overdue by 30 days.
  </p>
  <button className="text-blue-400 text-sm mt-2 hover:underline">
    View detailed analysis →
  </button>
</div>
```

## Mock Data Structure
```typescript
const invoices = [
  {
    id: 'INV-2024-001',
    vendor: 'Infopark Rent',
    amount: 125000,
    status: 'paid',
    date: '2024-10-01',
    category: 'Rent'
  },
  {
    id: 'INV-2024-002',
    vendor: 'Airtel Postpaid',
    amount: 1196,
    status: 'pending',
    date: '2024-10-15',
    dueIn: '3 days'
  },
  // ... more invoices
];
```

## Acceptance Criteria
- [ ] 4 KPI cards in responsive grid (4 cols on lg, 2 on md, 1 on sm)
- [ ] All amounts formatted with ₹ and Indian number format (lakhs)
- [ ] Change indicators show correct colors based on context
- [ ] Table with sortable columns
- [ ] Status badges with correct colors
- [ ] Row selection with checkboxes
- [ ] Search, filter, export buttons functional (UI only)
- [ ] AI Insights panel with gradient background
- [ ] Hover effects on table rows
```

---

## 📑 Prompt 4: Invoices View - Tab Structure

```markdown
# Task: Build PayLog Invoices View - Tab Navigation System

## Invoices View Layout
```
┌────────────────────────────────────────────────────────────┐
│  Invoices                                                  │
├────────────────────────────────────────────────────────────│
│  [Recurring]  [All]  [TDS]                    [Density ▾]  │
├────────────────────────────────────────────────────────────│
│                                                            │
│              [Tab Content Area]                            │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

## Tab Navigation

### Tabs
1. **Recurring** - Recurring invoice cards (default active)
2. **All** - All invoices table
3. **TDS** - TDS transactions table

### Tab Styling
```jsx
const tabs = ['recurring', 'all', 'tds'];

{tabs.map(tab => (
  <button
    key={tab}
    onClick={() => setInvoiceTab(tab)}
    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      invoiceTab === tab
        ? 'bg-blue-500/10 text-blue-400'
        : 'text-gray-400 hover:text-white hover:bg-gray-800'
    }`}
  >
    {tab.charAt(0).toUpperCase() + tab.slice(1)}
  </button>
))}
```

### View Density Control (Optional)
- Dropdown with options: Compact, Default, Comfortable
- Affects padding/spacing in table rows
- State: `viewDensity: 'compact' | 'default' | 'comfortable'`

## Tab Content: "All" Tab

Same table structure as Dashboard, but with:
- More columns visible
- Pagination controls
- Advanced filtering options
- Bulk action buttons when rows selected

## Tab Content: "TDS" Tab

### TDS Table Columns
1. Transaction ID
2. Client/Vendor
3. Gross Amount (₹)
4. TDS Rate (%)
5. TDS Amount (₹)
6. Net Amount (₹)
7. Date

### TDS Summary Cards (Above Table)
```
┌─────────────────┬─────────────────┬─────────────────┐
│ Total TDS       │ Total Gross     │ Total Net       │
│ Collected       │ Amount          │ Amount          │
│ ₹19,000        │ ₹2,45,550       │ ₹2,26,550       │
└─────────────────┴─────────────────┴─────────────────┘
```

### TDS Data Structure
```typescript
const tdsData = [
  {
    id: 'TDS-001',
    vendor: 'Infopark Rent',
    amount: 125000,      // Gross
    tdsRate: '10%',
    tdsAmount: 12500,
    netAmount: 112500,
    date: '2025-10-01'
  },
  // ... more TDS entries
];
```

## State Management
```typescript
const [invoiceTab, setInvoiceTab] = useState<'recurring' | 'all' | 'tds'>('recurring');
const [viewDensity, setViewDensity] = useState<'compact' | 'default' | 'comfortable'>('default');
```

## Acceptance Criteria
- [ ] Tab navigation with proper active states
- [ ] Smooth content transition between tabs
- [ ] "All" tab shows full invoice table
- [ ] "TDS" tab shows TDS-specific table with summary cards
- [ ] View density dropdown functional
- [ ] All amounts in ₹ with proper formatting
```

---

## 🔄 Prompt 5: Recurring Tab - Card Layout & Structure

```markdown
# Task: Build PayLog Recurring Tab - Invoice Card Layout

## Overview
The Recurring tab displays vendor cards for recurring payments (rent, utilities, telecom, etc.). Each card shows payment status, upcoming invoices, and quick actions.

## Card Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│ ₹ 372,000                                    [+] [...]  │
│ Pending Amount (coral/orange/green based on status)     │
│                                                         │
│ Infopark Rent                              [Status Icon]│
│ Vendor 1                                                │
│                                                         │
│    3                                    14d             │
│  Unpaid                            Next Invoice         │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Last Invoice: 01 Nov 2025                           │ │
│ │ Last Paid: 12 Aug 2025                              │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ [2 Overdues by 61 days]  [1 Due in 1 days]             │
└─────────────────────────────────────────────────────────┘
```

## Card Sections (Top to Bottom)

### 1. Header Section
**Left side:**
- Large pending amount (text-3xl font-bold)
- "Pending Amount" label below
- Amount = `invoice.amount × totalUnpaid` (or ₹0 if all paid)

**Right side:**
- Plus (+) button with dropdown:
  - "Record Payment"
  - "Add New Invoice"
- Three dots (...) menu button for more options

### 2. Title Section
**Left side:**
- Vendor name (font-semibold)
- "Vendor X" subtitle (dynamic number based on sort order)

**Right side:**
- Status icon circle (w-10 h-10 rounded-full):
  - Red with $ icon: Has overdue invoices
  - Yellow/Amber with ! icon: Has unpaid (no overdue) OR missed invoices
  - Green with ✓ icon: All paid and no issues

### 3. Stats Section (Two columns, justify-between)
**Left column (Unpaid count):**
- Large number (text-2xl font-bold)
- "Unpaid" label below
- Number centered above label

**Right column (Invoice timing):**
- Either "Xd Next Invoice" (blue) OR "X Invoice Missed" (orange)
- Large number/value on top
- Label below, centered

### 4. Last Invoice Box
- Gray background (bg-gray-800/50 dark, bg-gray-50 light)
- Two lines:
  - "Last Invoice: [date]"
  - "Last Paid: [date]"

### 5. Status Badges
- Horizontal flex wrap
- Badge types:
  - "All Paid" (green) - when no pending amount
  - "X Overdue[s] by Y days" (red) - shows longest overdue period
  - "X Due in Y days" (amber) - shows upcoming due date

## Color Logic (Three-Tier System)

### Pending Amount Color
```typescript
const pendingAmountColor =
  overdueCount > 0
    ? 'text-[#FF7F7F]'   // Coral - has overdue
    : pendingAmount > 0
      ? 'text-[#fb923c]' // Orange - unpaid but no overdue
      : 'text-green-400'; // Green - all paid
```

### Unpaid Number Color
```typescript
const unpaidColor =
  overdueCount > 0
    ? 'text-[#FF7F7F]'   // Coral - has overdue
    : totalUnpaid > 0
      ? 'text-[#fb923c]' // Orange - unpaid but no overdue
      : 'text-green-400'; // Green - all paid
```

### Status Icon Logic
```typescript
{overdueCount > 0 ? (
  <DollarSign className="w-5 h-5 text-red-400" />
) : (totalUnpaid > 0 || invoicesMissed > 0) ? (
  <span className="text-2xl font-bold text-amber-400">!</span>
) : (
  <Check className="w-6 h-6 text-green-400" />
)}
```

## Card Container Styling
```jsx
<div className={`
  p-5 rounded-xl border transition-all duration-500
  hover:shadow-lg cursor-pointer
  ${isDark
    ? 'bg-gray-900 border-gray-800 hover:border-gray-700'
    : 'bg-white border-gray-200 hover:border-gray-300'
  }
  ${overdueCount > 0 ? 'ring-2 ring-red-500/20' : ''}
`}>
```

## Grid Layout
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {sortedInvoices.map((invoice, index) => (
    // Card component
  ))}
</div>
```

## Acceptance Criteria
- [ ] Card displays all 5 sections in correct order
- [ ] Pending amount shows total of unpaid invoices (or ₹0)
- [ ] Three-tier color system working (coral/orange/green)
- [ ] Status icon reflects correct state
- [ ] Stats section has left/right alignment with centered numbers
- [ ] Last Invoice box shows correct dates
- [ ] Status badges show correct information
- [ ] Hover effects and transitions smooth
- [ ] Responsive grid (4 cols → 3 → 2 → 1)
```

---

## 🔢 Prompt 6: Recurring Tab - Data Model & Logic

```markdown
# Task: Build PayLog Recurring Tab - Data Model & Business Logic

## Data Structure

### RecurringInvoice Interface
```typescript
interface UnpaidInvoice {
  date: string;                    // e.g., '01 Nov 2025'
  status: 'upcoming' | 'overdue';
  daysUntil?: number;              // For upcoming: days until due
  daysOverdue?: number;            // For overdue: days past due
}

interface RecurringInvoice {
  id: string;                      // e.g., 'REC-001'
  vendor: string;                  // e.g., 'Infopark Rent'
  amount: number;                  // Single invoice amount
  frequency: string;               // 'Monthly', 'Quarterly', etc.
  dueDate: string;                 // e.g., '1st of every month'
  unpaidInvoices: UnpaidInvoice[]; // Array of unpaid invoices
  lastInvoiceDate: string;         // Last invoice received date
  lastPaid: string;                // Last payment date
  nextExpected: number | null;     // Days until next invoice (null if unknown)
  invoicesMissed?: number;         // Count of missed billing cycles
  category: string;                // 'Rent', 'Utilities', 'Telecom', etc.
  autoDebit: boolean;              // Whether auto-debit is enabled
  progress: number;                // 0-100 for any progress indicator
}
```

### Sample Data
```typescript
const recurringInvoices: RecurringInvoice[] = [
  {
    id: 'REC-001',
    vendor: 'Infopark Rent',
    amount: 124000,
    frequency: 'Monthly',
    dueDate: '1st of every month',
    unpaidInvoices: [
      { date: '01 Nov 2025', status: 'upcoming', daysUntil: 1 },
      { date: '18 Oct 2025', status: 'overdue', daysOverdue: 31 },
      { date: '18 Sep 2025', status: 'overdue', daysOverdue: 61 }
    ],
    lastInvoiceDate: '01 Nov 2025',
    lastPaid: '12 Aug 2025',
    nextExpected: 14,
    category: 'Rent',
    autoDebit: false,
    progress: 33
  },
  {
    id: 'REC-002',
    vendor: 'Infopark Electricity',
    amount: 8960,
    frequency: 'Monthly',
    dueDate: '5th of every month',
    unpaidInvoices: [], // All paid
    lastInvoiceDate: '05 Sep 2025',
    lastPaid: '10 Sep 2025',
    nextExpected: -44, // Negative = late
    invoicesMissed: 2, // 2 billing cycles passed without invoice
    category: 'Utilities',
    autoDebit: false,
    progress: 100
  },
  {
    id: 'REC-003',
    vendor: 'Airtel Postpaid',
    amount: 1196,
    frequency: 'Monthly',
    dueDate: '2nd of every month',
    unpaidInvoices: [
      { date: '20 Nov 2025', status: 'upcoming', daysUntil: 2 }
    ],
    lastInvoiceDate: '01 Nov 2025',
    lastPaid: '15 Oct 2025',
    nextExpected: 14,
    category: 'Telecom',
    autoDebit: true,
    progress: 90
  },
  {
    id: 'REC-004',
    vendor: 'AC Charges',
    amount: 4654,
    frequency: 'Quarterly',
    dueDate: '15th of every quarter',
    unpaidInvoices: [], // All paid
    lastInvoiceDate: '15 Nov 2025',
    lastPaid: '16 Nov 2025',
    nextExpected: 27,
    category: 'Maintenance',
    autoDebit: false,
    progress: 100
  }
];
```

## Calculated Values (Per Card)

```typescript
// Inside the map function for each invoice:
const totalUnpaid = invoice.unpaidInvoices.length;
const hasUnpaid = totalUnpaid > 0;
const overdueCount = invoice.unpaidInvoices.filter(inv => inv.status === 'overdue').length;
const upcomingCount = invoice.unpaidInvoices.filter(inv => inv.status === 'upcoming').length;

// Pending amount = single invoice amount × number of unpaid
const pendingAmount = invoice.amount && hasUnpaid
  ? invoice.amount * totalUnpaid
  : 0;
```

## Sorting Logic

Cards should be sorted by urgency:
1. **First**: Cards with overdue invoices (most urgent)
2. **Second**: Cards with upcoming invoices (attention needed)
3. **Last**: Cards that are all paid (no action needed)

```typescript
const sortedInvoices = [...recurringInvoices].sort((a, b) => {
  const aOverdue = a.unpaidInvoices.filter(inv => inv.status === 'overdue').length;
  const bOverdue = b.unpaidInvoices.filter(inv => inv.status === 'overdue').length;
  const aUpcoming = a.unpaidInvoices.filter(inv => inv.status === 'upcoming').length;
  const bUpcoming = b.unpaidInvoices.filter(inv => inv.status === 'upcoming').length;

  // Sort by overdue count (descending), then by upcoming count (descending)
  if (aOverdue !== bOverdue) return bOverdue - aOverdue;
  if (aUpcoming !== bUpcoming) return bUpcoming - aUpcoming;
  return 0;
});
```

## Right Side Display Logic

```typescript
// Determine what to show on the right side of stats
{invoice.invoicesMissed && invoice.invoicesMissed > 0 ? (
  // Show "Invoice Missed" when billing cycles passed without invoices
  <div className="flex flex-col items-center">
    <span className="text-2xl font-bold text-[#fb923c]">
      {invoice.invoicesMissed}
    </span>
    <span className="text-sm text-gray-500">Invoice Missed</span>
  </div>
) : invoice.nextExpected && invoice.nextExpected > 0 ? (
  // Show "Next Invoice" when invoice expected in future
  <div className="flex flex-col items-center">
    <span className="text-2xl font-bold text-blue-400">
      {invoice.nextExpected}d
    </span>
    <span className="text-sm text-gray-500">Next Invoice</span>
  </div>
) : null}
```

## Badge Display Logic

```typescript
{/* All Paid badge */}
{pendingAmount === 0 && (
  <div className="px-3 py-1 rounded-full text-sm font-medium bg-green-500/10 text-green-400 border border-green-500/20">
    All Paid
  </div>
)}

{/* Overdue badge with max overdue days */}
{overdueCount > 0 && (() => {
  const maxOverdue = Math.max(
    ...invoice.unpaidInvoices
      .filter(inv => inv.status === 'overdue')
      .map(inv => inv.daysOverdue || 0)
  );
  return (
    <div className="px-2 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
      {overdueCount} Overdue{overdueCount > 1 ? 's' : ''} by {maxOverdue} days
    </div>
  );
})()}

{/* Upcoming badge */}
{upcomingCount > 0 && (() => {
  const upcomingInvoice = invoice.unpaidInvoices.find(inv => inv.status === 'upcoming');
  return (
    <div className="px-2 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
      {upcomingCount} Due in {upcomingInvoice?.daysUntil || 0} days
    </div>
  );
})()}
```

## Key Concepts

### "Invoice Missed" vs "Overdue"
- **Invoice Missed**: The vendor hasn't sent an invoice when expected (billing cycle passed)
- **Overdue**: Invoice exists but payment is late

### "Unpaid" Left Side
- Shows count of invoices that haven't been paid yet
- Includes both upcoming and overdue invoices

### "Next Invoice" / "Invoice Missed" Right Side
- Shows invoice timing awareness
- Positive `nextExpected`: "Xd Next Invoice"
- `invoicesMissed > 0`: "X Invoice Missed"

## Acceptance Criteria
- [ ] Data structure supports all required fields
- [ ] Calculated values (totalUnpaid, pendingAmount) correct
- [ ] Sorting places overdue first, then upcoming, then paid
- [ ] Right side shows correct content based on conditions
- [ ] Badge logic displays appropriate badges
- [ ] Vendor numbering dynamic based on sorted order
```

---

## ⌨️ Prompt 7: Command Palette & Keyboard Shortcuts

```markdown
# Task: Build PayLog Command Palette (⌘K)

## Overview
A full-screen modal command palette for quick navigation and actions, triggered by ⌘K (Mac) or Ctrl+K (Windows).

## Visual Design
```
┌────────────────────────────────────────────────────────────┐
│                    (Backdrop blur overlay)                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🔍 Type a command or search...              [ESC]    │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │                                                      │  │
│  │  Quick Actions                                       │  │
│  │  ─────────────────────────────────────────────────   │  │
│  │  📄 Create Invoice                                   │  │
│  │  📊 View Reports                                     │  │
│  │  👤 Add Client                                       │  │
│  │  📤 Export Data                                      │  │
│  │  🌙 Toggle Theme                                     │  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

## Implementation

### State
```typescript
const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
```

### Keyboard Event Listener
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setCommandPaletteOpen(prev => !prev);
    }
    if (e.key === 'Escape') {
      setCommandPaletteOpen(false);
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, []);
```

### Modal Structure
```jsx
{commandPaletteOpen && (
  <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
    {/* Backdrop */}
    <div
      className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      onClick={() => setCommandPaletteOpen(false)}
    />

    {/* Modal */}
    <div className={`
      relative w-full max-w-lg mx-4 rounded-xl border shadow-2xl
      ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}
    `}>
      {/* Search Input */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-800">
        <Search className="w-5 h-5 text-gray-500" />
        <input
          type="text"
          placeholder="Type a command or search..."
          className="flex-1 bg-transparent outline-none text-white placeholder-gray-500"
          autoFocus
        />
        <kbd className="px-2 py-1 text-xs rounded bg-gray-800 text-gray-400">
          ESC
        </kbd>
      </div>

      {/* Quick Actions */}
      <div className="p-2">
        <div className="px-3 py-2 text-xs text-gray-500 uppercase tracking-wider">
          Quick Actions
        </div>

        {quickActions.map(action => (
          <button
            key={action.id}
            onClick={() => {
              action.handler();
              setCommandPaletteOpen(false);
            }}
            className={`
              w-full flex items-center gap-3 px-3 py-2 rounded-lg
              ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}
              transition-colors
            `}
          >
            <action.icon className="w-4 h-4 text-gray-400" />
            <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  </div>
)}
```

### Quick Actions Configuration
```typescript
const quickActions = [
  {
    id: 'create-invoice',
    label: 'Create Invoice',
    icon: FileText,
    handler: () => console.log('Create invoice')
  },
  {
    id: 'view-reports',
    label: 'View Reports',
    icon: BarChart3,
    handler: () => setActiveView('reports')
  },
  {
    id: 'add-client',
    label: 'Add Client',
    icon: Users,
    handler: () => console.log('Add client')
  },
  {
    id: 'export-data',
    label: 'Export Data',
    icon: Download,
    handler: () => console.log('Export data')
  },
  {
    id: 'toggle-theme',
    label: 'Toggle Theme',
    icon: isDark ? Sun : Moon,
    handler: () => setIsDark(!isDark)
  },
];
```

## Acceptance Criteria
- [ ] ⌘K / Ctrl+K opens command palette
- [ ] ESC closes command palette
- [ ] Click on backdrop closes command palette
- [ ] Backdrop has blur effect
- [ ] Search input auto-focuses on open
- [ ] Quick actions are clickable and functional
- [ ] Theme toggle works from command palette
- [ ] z-index ensures palette is on top of everything
```

---

## 📋 Build Order Summary

Execute these prompts in sequence:

| # | Prompt | Focus Area | Dependencies |
|---|--------|------------|--------------|
| 1 | Project Setup & Theme | Foundation, colors, CSS vars | None |
| 2 | Layout | Sidebar, navbar, navigation | Prompt 1 |
| 3 | Dashboard View | KPIs, table, AI insights | Prompts 1-2 |
| 4 | Invoices Tab Structure | Tab navigation, TDS | Prompts 1-2 |
| 5 | Recurring Card Layout | Card visual structure | Prompts 1-2, 4 |
| 6 | Recurring Data & Logic | Data model, business logic | Prompt 5 |
| 7 | Command Palette | ⌘K modal, shortcuts | Prompts 1-2 |

---

## 🎨 Quick Reference: Color System

| Status | Hex Code | Tailwind | Use Case |
|--------|----------|----------|----------|
| Coral/Urgent | #FF7F7F | text-[#FF7F7F] | Overdue, critical |
| Orange/Warning | #fb923c | text-[#fb923c] | Pending, attention |
| Green/Success | #4ade80 | text-green-400 | Paid, complete |
| Blue/Info | #60a5fa | text-blue-400 | Future, informational |

---

## 📝 Key Concepts Reference

### Data Semantics
- **Left Side ("X Unpaid")**: Payment status - invoices not yet paid
- **Right Side**: Invoice timing - "Xd Next Invoice" or "X Invoice Missed"

### "Invoice Missed" vs "Overdue"
- **Invoice Missed**: Vendor didn't send invoice when expected
- **Overdue**: Invoice exists but payment is late

### Three-Tier Color Logic
1. **Check for overdue** → Coral (#FF7F7F)
2. **Check for unpaid/missed** → Orange (#fb923c)
3. **All clear** → Green (#4ade80)

---

*Last Updated: November 27, 2025*
