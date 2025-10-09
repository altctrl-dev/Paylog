# Quick Reference: Sprint 6 Schema Updates

**Ready for Migration**: ✅ YES
**Risk Level**: LOW
**Estimated Time**: 10 minutes

---

## TL;DR

Added 5 new fields to Invoice model and created SubEntity model for divisions/departments. All changes validated and ready for migration.

---

## Migration Command

```bash
# 1. Backup database
cp dev.db dev.db.backup-$(date +%Y%m%d_%H%M%S)

# 2. Run migration
npx prisma migrate dev --name add_invoice_fields_and_sub_entities

# 3. Verify
sqlite3 dev.db "SELECT COUNT(*) FROM invoices WHERE vendor_id IS NULL;"
# Should return: 0
```

---

## Schema Changes at a Glance

### New Table: sub_entities

| Column      | Type    | Constraints    |
|-------------|---------|----------------|
| id          | INTEGER | PK             |
| name        | TEXT    | NOT NULL       |
| description | TEXT    | NULL           |
| is_active   | BOOLEAN | DEFAULT true   |
| created_at  | DATETIME| DEFAULT now()  |
| updated_at  | DATETIME| -              |

### Invoice: New Fields

| Column         | Type     | Constraints           | Default |
|----------------|----------|-----------------------|---------|
| period_start   | DATETIME | NULL                  | NULL    |
| period_end     | DATETIME | NULL                  | NULL    |
| tds_applicable | BOOLEAN  | NOT NULL              | false   |
| sub_entity_id  | INTEGER  | NULL, FK → sub_entities| NULL   |
| notes          | TEXT     | NULL                  | NULL    |

### Invoice: Modified Field

| Field     | Change                    | OnDelete Change           |
|-----------|---------------------------|---------------------------|
| vendor_id | Int? → Int (now required) | SET NULL → RESTRICT       |

### New Index

```prisma
@@index([sub_entity_id], map: "idx_invoices_sub_entity")
```

---

## Seed Data (Optional)

```typescript
await prisma.subEntity.createMany({
  data: [
    { name: 'Engineering', description: 'Engineering Department' },
    { name: 'Marketing', description: 'Marketing Department' },
    { name: 'Operations', description: 'Operations Department' },
    { name: 'Finance', description: 'Finance Department' },
  ]
});
```

---

## TypeScript Usage Examples

### Create Invoice with New Fields

```typescript
const invoice = await prisma.invoice.create({
  data: {
    invoice_number: 'INV-2025-100',
    vendor_id: 5,  // Required now
    invoice_amount: 100000,
    period_start: new Date('2025-01-01'),
    period_end: new Date('2025-03-31'),
    tds_applicable: true,
    sub_entity_id: 3,
    notes: 'Q1 2025 consulting fees',
    created_by: 1,
  },
  include: {
    vendor: true,
    sub_entity: true,
  },
});
```

### Query Invoices by Division

```typescript
const engineeringInvoices = await prisma.invoice.findMany({
  where: { sub_entity_id: 1 },
  include: { sub_entity: true, vendor: true },
  orderBy: { invoice_date: 'desc' },
});
```

### Update Invoice Notes

```typescript
await prisma.invoice.update({
  where: { id: 123 },
  data: { notes: 'Updated: Payment received on 2025-04-15' },
});
```

---

## Validation Queries

### After Migration

```sql
-- Verify sub_entities table exists
SELECT sql FROM sqlite_master WHERE type='table' AND name='sub_entities';

-- Verify new invoice columns
PRAGMA table_info(invoices);

-- Verify all invoices have vendor_id
SELECT COUNT(*) FROM invoices WHERE vendor_id IS NULL;
-- Expected: 0

-- Verify new index exists
SELECT name FROM sqlite_master
WHERE type='index' AND tbl_name='invoices' AND name='idx_invoices_sub_entity';

-- Test sub_entity relation
SELECT i.id, i.invoice_number, s.name as division
FROM invoices i
LEFT JOIN sub_entities s ON i.sub_entity_id = s.id;
```

---

## UI Changes Required (Sprint 6 Implementation)

### Invoice Form Updates

1. **Period Fields**:
   - Add Date Picker: "Period Start" (optional)
   - Add Date Picker: "Period End" (optional)
   - Validation: period_end >= period_start

2. **TDS Field**:
   - Add Checkbox: "TDS Applicable" (default: unchecked)
   - Future: Default from invoice profile

3. **Sub Entity Field**:
   - Add Dropdown: "Division/Department" (optional)
   - Filter: `where: { is_active: true }`
   - Display: sub_entity.name

4. **Notes Field**:
   - Add Textarea: "Notes" (optional, max 10,000 chars)
   - Placeholder: "Add internal notes or context..."

5. **Vendor Field**:
   - Update validation: Required (was optional)
   - Error message: "Vendor is required"

### Invoice Display Updates

1. **Period Display**:
   ```typescript
   if (invoice.period_start && invoice.period_end) {
     return `${formatDate(invoice.period_start, 'MMM yyyy')} - ${formatDate(invoice.period_end, 'MMM yyyy')}`;
   }
   // Example: "Jan 2025 - Mar 2025"
   ```

2. **TDS Badge**:
   ```tsx
   {invoice.tds_applicable && (
     <Badge variant="info">TDS Applicable</Badge>
   )}
   ```

3. **Division Display**:
   ```tsx
   {invoice.sub_entity && (
     <div>
       <Label>Division</Label>
       <Text>{invoice.sub_entity.name}</Text>
     </div>
   )}
   ```

4. **Notes Display**:
   ```tsx
   {invoice.notes && (
     <div className="notes-section">
       <Label>Notes</Label>
       <Text className="text-muted">{invoice.notes}</Text>
     </div>
   )}
   ```

---

## Reporting Queries

### Total Expenses by Division

```typescript
const expensesByDivision = await prisma.invoice.groupBy({
  by: ['sub_entity_id'],
  where: { status: 'paid' },
  _sum: { invoice_amount: true },
  _count: true,
});

// Enrich with sub_entity names
const enriched = await Promise.all(
  expensesByDivision.map(async (item) => {
    const subEntity = await prisma.subEntity.findUnique({
      where: { id: item.sub_entity_id },
    });
    return {
      division: subEntity?.name || 'Unallocated',
      total_amount: item._sum.invoice_amount,
      invoice_count: item._count,
    };
  })
);
```

### Invoices with TDS

```typescript
const tdsInvoices = await prisma.invoice.findMany({
  where: { tds_applicable: true },
  include: { vendor: true },
  orderBy: { invoice_date: 'desc' },
});

const totalTdsAmount = tdsInvoices.reduce(
  (sum, inv) => sum + inv.invoice_amount * 0.1,  // Assuming 10% TDS rate
  0
);
```

### Period-Based Report

```typescript
const q1Invoices = await prisma.invoice.findMany({
  where: {
    period_start: { gte: new Date('2025-01-01') },
    period_end: { lte: new Date('2025-03-31') },
  },
  include: { vendor: true, sub_entity: true },
});
```

---

## Rollback (If Needed)

```bash
# 1. Restore backup
cp dev.db.backup-{timestamp} dev.db

# 2. Reset migration
npx prisma migrate resolve --rolled-back add_invoice_fields_and_sub_entities

# 3. Revert schema.prisma (git)
git checkout HEAD~1 schema.prisma

# 4. Regenerate client
npx prisma generate
```

---

## Testing Checklist

**Database**:
- [ ] sub_entities table created
- [ ] invoices table has 5 new columns
- [ ] vendor_id is NOT NULL
- [ ] Index idx_invoices_sub_entity exists

**CRUD Operations**:
- [ ] Create invoice with all new fields
- [ ] Create invoice without new fields (defaults work)
- [ ] Query by sub_entity_id
- [ ] Update invoice notes
- [ ] Vendor deletion blocked if invoices exist

**UI**:
- [ ] Invoice form shows new fields
- [ ] Vendor dropdown is required
- [ ] Period validation works (end >= start)
- [ ] Sub entity dropdown filters active divisions
- [ ] Notes textarea accepts input

**Reporting**:
- [ ] Expense by division report works
- [ ] TDS summary report works
- [ ] Period-based filtering works

---

## Related Documents

- **Full Migration Plan**: [MIGRATION_PLAN_SPRINT6.md](./MIGRATION_PLAN_SPRINT6.md)
- **Schema Diagrams**: [SCHEMA_DIAGRAM_SPRINT6.md](./SCHEMA_DIAGRAM_SPRINT6.md)
- **Executive Summary**: [SCHEMA_UPDATE_SUMMARY.md](./SCHEMA_UPDATE_SUMMARY.md)

---

## Support

**Questions?** Check the detailed documents above or escalate to Main Agent.

**Issue During Migration?**
1. Check `MIGRATION_PLAN_SPRINT6.md` → Rollback Strategy
2. Restore backup: `cp dev.db.backup-{timestamp} dev.db`
3. Report issue with error logs

---

**Last Updated**: 2025-10-08
**Status**: Ready for Migration
**Approval**: DBM ✅
