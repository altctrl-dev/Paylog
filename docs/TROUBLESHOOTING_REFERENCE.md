# Troubleshooting Reference - PayLog Production Issues

**Last Updated**: October 28, 2025
**Purpose**: Quick reference for common production issues and their fixes

---

## Common Issue Patterns

### Pattern 1: Infinite Loading States

**Symptoms**:
- Component stuck on "Loading..." forever
- No error message displayed
- No timeout mechanism

**Root Cause**: React Query with default configuration (infinite retries)

**Fix Pattern**:
```typescript
// Bad: Default React Query config
const { data, isLoading } = useQuery({
  queryKey: ['resource', id],
  queryFn: () => fetchResource(id),
})

// Good: Conservative config with retry limits
const { data, isLoading, error } = useQuery({
  queryKey: ['resource', id],
  queryFn: () => fetchResource(id),
  retry: 1,                          // Only retry once
  staleTime: 30000,                  // Cache for 30 seconds
  refetchOnWindowFocus: false,       // Don't refetch on focus
})

// Always add error state handling
{error && (
  <div className="p-4 text-red-500">
    Error loading data. Please try again.
  </div>
)}
```

**Examples Fixed**:
- Issue 2 (Oct 28): `master-data-request-detail-panel.tsx`
- Issue 6 (Oct 28): `admin-request-review-panel.tsx`

**Prevention**: Add project-wide React Query defaults

---

### Pattern 2: Form Field Mismatches

**Symptoms**:
- User request form has fewer fields than admin approval form
- Admins have to manually fill in missing data
- Back-and-forth between user and admin

**Root Cause**: Request forms not matching admin forms exactly

**Fix Pattern**:
1. Identify all fields in admin form
2. Add corresponding fields to request form
3. Use same schema validation
4. Test both forms side-by-side

**Examples Fixed**:
- Issue 3 (Oct 28): Vendor request form (6 fields)
- Issue 4 (Oct 28): Invoice profile request form (12 fields)

**Prevention**: When creating request workflows, always implement full forms

---

### Pattern 3: React Hook Dependency Warnings

**Symptoms**:
- ESLint warnings about missing dependencies
- Railway build fails with "React Hook ... has missing dependency"
- Pre-commit hooks fail

**Root Cause**: React Hook dependency arrays incomplete

**Fix Pattern**:
```typescript
// Bad: Missing dependencies
const loadData = useCallback(async () => {
  toast.success('Loading...')
  const result = await fetchData()
}, []) // ❌ Missing 'toast'

useEffect(() => {
  loadData()
}, []) // ❌ Missing 'loadData'

// Good: All dependencies included
const loadData = useCallback(async () => {
  toast.success('Loading...')
  const result = await fetchData()
}, [toast]) // ✅ Added 'toast'

useEffect(() => {
  loadData()
}, [loadData]) // ✅ Added 'loadData'
```

**Examples Fixed**:
- Issue 5 (Oct 28): `master-data-request-form-panel.tsx`

**Prevention**: Run ESLint after every component creation, fix warnings immediately

---

### Pattern 4: Type Inconsistencies at Component Boundaries

**Symptoms**:
- Component receives ID as string, expects number (or vice versa)
- Type errors in console
- Data fails to load correctly

**Root Cause**: No type normalization at component boundaries

**Fix Pattern**:
```typescript
// Bad: Assuming ID is always correct type
<ChildComponent id={someId} />

// Good: Normalize type before passing
const normalizedId = typeof someId === 'object' && someId !== null
  ? Number(someId.id)
  : Number(someId)

<ChildComponent id={normalizedId} />
```

**Examples Fixed**:
- Issue 7 (Oct 28): `admin-request-panel-renderer.tsx`

**Prevention**: Use strict TypeScript prop types, validate at boundaries

---

### Pattern 5: Missing Timeout Mechanisms

**Symptoms**:
- Async operations hang indefinitely
- No user feedback when something goes wrong
- No recovery mechanism

**Root Cause**: No timeout for long-running operations

**Fix Pattern**:
```typescript
// Add timeout with cleanup and retry
const [error, setError] = useState(false)

useEffect(() => {
  if (!resourceId || !isLoading) return

  const timeout = setTimeout(() => {
    if (isLoading) {
      setError(true)
      toast.error('Request timed out. Please try again.')
    }
  }, 10000) // 10 second timeout

  return () => clearTimeout(timeout) // Cleanup on unmount
}, [resourceId, isLoading])

// Error state with retry button
{error && (
  <div className="p-6 text-center">
    <p className="text-sm text-muted-foreground mb-4">
      Unable to load data. This might be a temporary issue.
    </p>
    <Button
      onClick={() => {
        setError(false)
        refetch()
      }}
      size="sm"
    >
      Retry
    </Button>
  </div>
)}
```

**Examples Fixed**:
- Issue 6 (Oct 28): `admin-request-review-panel.tsx`

**Prevention**: Add timeouts to all API calls, especially in panels

---

## Quick Diagnostic Checklist

### When Component Won't Load
1. ✅ Check React Query config (retry, staleTime)
2. ✅ Check error state handling (is error displayed?)
3. ✅ Check network tab (are API calls completing?)
4. ✅ Check console (are there TypeScript errors?)
5. ✅ Check timeout mechanism (does one exist?)

### When Form Submission Fails
1. ✅ Check schema validation (are all fields present?)
2. ✅ Check required fields (do they match backend?)
3. ✅ Check conditional validation (TDS, etc.)
4. ✅ Check default values (are they set correctly?)
5. ✅ Check error messages (are they helpful?)

### When Build Fails
1. ✅ Check ESLint warnings (fix all warnings)
2. ✅ Check React Hook dependencies (exhaustive-deps)
3. ✅ Check TypeScript errors (tsc --noEmit)
4. ✅ Check import paths (are they correct?)
5. ✅ Check unused variables (remove or use)

### When Railway Deployment Fails
1. ✅ Check build logs (what's the error message?)
2. ✅ Run build locally first (pnpm build)
3. ✅ Check environment variables (are they set?)
4. ✅ Check package.json scripts (are they correct?)
5. ✅ Check Railway settings (build command, start command)

---

## Railway Deployment Checklist

Before pushing to Railway:
- [ ] Run `pnpm typecheck` (no TypeScript errors)
- [ ] Run `pnpm lint` (no ESLint warnings)
- [ ] Run `pnpm build` (production build succeeds)
- [ ] Test locally with `pnpm start` (production mode)
- [ ] Check Railway environment variables (all set correctly)
- [ ] Commit with clear message (describe what's changing)
- [ ] Push and monitor build logs

---

## Common Error Messages

### "React Hook useEffect has a missing dependency"
**Cause**: React Hook dependency array incomplete
**Fix**: Add missing dependency to array (or wrap in useCallback if needed)
**Example**: Issue 5 (Oct 28)

### "Cannot read property 'id' of undefined"
**Cause**: Expecting object but receiving undefined/null
**Fix**: Add null checks or type normalization
**Example**: Issue 7 (Oct 28)

### "Query is stuck in loading state"
**Cause**: React Query retrying indefinitely
**Fix**: Add `retry: 1` to query config
**Example**: Issue 2, Issue 6 (Oct 28)

### "Type 'string' is not assignable to type 'number'"
**Cause**: Type mismatch at component boundary
**Fix**: Convert types before passing (Number(), String())
**Example**: Issue 7 (Oct 28)

### "Field X is required but not provided"
**Cause**: Form schema doesn't match backend requirements
**Fix**: Add missing fields to form and schema
**Example**: Issue 3, Issue 4 (Oct 28)

---

## Best Practices to Prevent Issues

### 1. React Query Configuration
Always configure queries with:
```typescript
{
  retry: 1,                    // Limit retries
  staleTime: 30000,            // Cache duration
  refetchOnWindowFocus: false, // Prevent unexpected refetches
}
```

### 2. Error State Handling
Always add error states:
```typescript
const { data, isLoading, error } = useQuery(...)

if (error) return <ErrorDisplay error={error} />
if (isLoading) return <LoadingState />
return <SuccessState data={data} />
```

### 3. Timeout Mechanisms
Add timeouts to async operations:
```typescript
useEffect(() => {
  const timeout = setTimeout(() => {
    if (isLoading) setError(true)
  }, 10000)
  return () => clearTimeout(timeout)
}, [isLoading])
```

### 4. Type Safety at Boundaries
Normalize types before passing:
```typescript
const normalizedId = Number(id)
const normalizedDate = new Date(dateString)
```

### 5. Form Field Parity
Request forms must match admin forms:
- Same fields
- Same validation
- Same conditional logic
- Same default values

### 6. ESLint Compliance
Fix all ESLint warnings:
- React Hook dependencies
- Unused variables
- Missing return types
- Import order

---

## Session History

### October 28, 2025 - Production Bug Fixes
**Issues Fixed**: 7 critical bugs
**Commits**: `0f59b4a` through `6cbfd59`
**Documentation**: `docs/SESSION_SUMMARY_2025_10_28.md`

**Key Fixes**:
1. Settings filter dropdown (2 options instead of 4)
2. Detail panel infinite loading (React Query config)
3. Vendor form fields (6 fields instead of 1)
4. Invoice profile form fields (12 fields instead of 2)
5. Railway build error (React Hook dependencies)
6. Admin panel timeout (10-second timeout + retry)
7. Admin ID normalization (type conversion)

---

## Useful Commands

### Local Development
```bash
# Check for issues
pnpm typecheck           # TypeScript errors
pnpm lint                # ESLint warnings
pnpm build               # Production build

# Run tests
pnpm test                # Unit tests
pnpm test:e2e            # E2E tests (if configured)

# View logs
pnpm dev                 # Dev server with logs
tail -f .next/trace      # Next.js trace logs
```

### Railway Deployment
```bash
# View logs
railway logs             # Recent logs
railway logs --follow    # Stream logs

# Check status
railway status           # Deployment status
railway variables        # Environment variables

# Manual deploy
git push                 # Auto-deploys to Railway
railway up               # Force redeploy
```

### Database
```bash
# Prisma operations
npx prisma studio        # Open Prisma Studio
npx prisma db push       # Push schema changes
npx prisma generate      # Regenerate Prisma Client
npx prisma migrate dev   # Create migration
```

---

**Document Purpose**: Quick reference for future debugging sessions
**Maintenance**: Update after each major bug fix session
**Related Docs**:
- `docs/SESSION_SUMMARY_2025_10_28.md` (detailed timeline)
- `docs/SPRINTS_REVISED.md` (sprint progress)
