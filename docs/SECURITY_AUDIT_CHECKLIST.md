# Security Audit Checklist - PayLog v1.0.0

**Created**: November 24, 2025
**Status**: READY FOR EXECUTION
**When**: After Sprint 14 completion, BEFORE documentation
**Estimated Time**: 8-12 hours

---

## 🎯 Audit Objectives

1. **Identify vulnerabilities** before production launch
2. **Verify RBAC implementation** (admin vs standard user)
3. **Ensure data protection** (secrets, sensitive info)
4. **Validate input sanitization** (SQL injection, XSS prevention)
5. **Test authentication flows** (session management, password security)
6. **Check API security** (rate limiting, CORS, headers)
7. **Compliance check** (GDPR, best practices)

**Target**: ZERO high-priority vulnerabilities before v1.0.0 launch

---

## 📋 Category 1: Automated Security Scans (2 hours)

### **1.1: NPM Audit** (30 mins)

```bash
# Run npm audit
npm audit

# Generate detailed report
npm audit --json > security-audit-npm.json

# Check for high/critical vulnerabilities
npm audit --audit-level=high
```

**Checklist**:
- [ ] Run `npm audit`
- [ ] Document all HIGH and CRITICAL vulnerabilities
- [ ] Update vulnerable dependencies (if safe)
- [ ] Test app after updates
- [ ] Re-run audit to confirm fixes

**Acceptance**: Zero HIGH or CRITICAL npm vulnerabilities

---

### **1.2: Snyk Security Scan** (30 mins)

```bash
# Install Snyk CLI
npm install -g snyk

# Authenticate
snyk auth

# Run scan
snyk test

# Generate HTML report
snyk test --json | snyk-to-html -o security-audit-snyk.html
```

**Checklist**:
- [ ] Run Snyk scan
- [ ] Review all findings
- [ ] Prioritize High/Critical issues
- [ ] Apply fixes or document exceptions
- [ ] Re-scan after fixes

**Acceptance**: Snyk score > 80/100, no critical issues

---

### **1.3: ESLint Security Plugin** (30 mins)

```bash
# Install security plugins
npm install --save-dev eslint-plugin-security eslint-plugin-no-secrets

# Add to .eslintrc.json
{
  "plugins": ["security", "no-secrets"],
  "extends": ["plugin:security/recommended"]
}

# Run lint
npm run lint
```

**Checklist**:
- [ ] Install security ESLint plugins
- [ ] Run lint with security rules
- [ ] Fix all security warnings
- [ ] Document false positives (with justification)
- [ ] Re-run to confirm

**Acceptance**: Zero security-related ESLint errors

---

### **1.4: TypeScript Strict Mode** (30 mins)

**Check `tsconfig.json`**:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

**Checklist**:
- [ ] Verify strict mode enabled
- [ ] Run `pnpm typecheck`
- [ ] Fix all type errors
- [ ] No `any` types without justification
- [ ] Re-run typecheck

**Acceptance**: Zero type errors, strict mode enabled

---

## 🔐 Category 2: Authentication & Authorization (2 hours)

### **2.1: NextAuth Configuration** (30 mins)

**File**: `lib/auth.ts`, `app/api/auth/[...nextauth]/route.ts`

**Checklist**:
- [ ] `SECRET` environment variable set (long, random)
- [ ] Session strategy is JWT or database (not cookies only)
- [ ] Session maxAge appropriate (default 30 days)
- [ ] Secure cookies enabled (`secure: true` in production)
- [ ] HttpOnly cookies enabled
- [ ] SameSite cookie attribute set
- [ ] CSRF protection enabled
- [ ] Callback URLs validated (no open redirect)

**Test**:
```bash
# Check environment
echo $NEXTAUTH_SECRET | wc -c  # Should be >32 chars

# Test secure cookies in production
curl -I https://paylog-production-5265.up.railway.app/api/auth/session
# Look for: Set-Cookie: ...; Secure; HttpOnly; SameSite=Lax
```

---

### **2.2: Password Security** (30 mins)

**Files**: `app/actions/auth.ts`, `lib/password.ts`

**Checklist**:
- [ ] Passwords hashed with bcrypt (not plain MD5/SHA1)
- [ ] Bcrypt cost factor ≥ 12 (check `bcrypt.hash(password, 12)`)
- [ ] Password validation: min 8 chars, 1 uppercase, 1 number, 1 special
- [ ] No password in logs
- [ ] No password in error messages
- [ ] Password reset tokens expire (e.g., 1 hour)
- [ ] Rate limiting on password reset endpoint

**Test**:
```typescript
// Check password hashing
const hashedPassword = await bcrypt.hash("test123", 12);
console.log(hashedPassword.length); // Should be 60 chars
```

---

### **2.3: RBAC Implementation** (1 hour)

**Files**: `lib/rbac.ts`, middleware, server actions

**Checklist**:
- [ ] Roles defined: `super_admin`, `admin`, `standard_user`
- [ ] All admin routes check role (not just client-side)
- [ ] All server actions check role
- [ ] No role escalation possible (test with Postman)
- [ ] Session role matches database role (re-fetch on critical actions)
- [ ] Logout invalidates session immediately

**Manual Tests**:
1. **Test as standard_user**:
   - [ ] Cannot access `/admin` routes (403 Forbidden)
   - [ ] Cannot call admin server actions (403)
   - [ ] Cannot edit other users' invoices
   - [ ] Cannot approve/reject invoices

2. **Test as admin**:
   - [ ] Can access `/admin` routes
   - [ ] Can approve/reject invoices
   - [ ] Can edit any invoice
   - [ ] Cannot promote to super_admin (if not super_admin)

3. **Test privilege escalation**:
   - [ ] Modify session cookie → rejected
   - [ ] Call admin action with standard_user token → 403
   - [ ] Bypass client-side checks → server denies

---

## 🛡️ Category 3: Input Validation & Sanitization (2 hours)

### **3.1: SQL Injection Prevention** (30 mins)

**Checklist**:
- [ ] All database queries use Prisma (parameterized)
- [ ] No raw SQL queries (if any, review carefully)
- [ ] User input never concatenated into queries
- [ ] Prisma version up-to-date (check for known vulns)

**Test**:
```bash
# Search for raw SQL
grep -r "prisma.\$executeRaw" app/
grep -r "prisma.\$queryRaw" app/

# If found, verify they use parameterized queries:
# ✅ Good: prisma.$executeRaw`SELECT * FROM users WHERE id = ${id}`
# ❌ Bad:  prisma.$executeRaw`SELECT * FROM users WHERE id = '${id}'`
```

**Manual Test**:
- [ ] Try SQL injection in search: `' OR '1'='1`
- [ ] Try in invoice number: `INV-001'; DROP TABLE invoices;--`
- [ ] Verify queries rejected or sanitized

---

### **3.2: XSS Prevention** (30 mins)

**Checklist**:
- [ ] React JSX escapes user input by default
- [ ] No `dangerouslySetInnerHTML` (if used, review carefully)
- [ ] No direct DOM manipulation with user input
- [ ] HTML sanitization library for rich text (if applicable)
- [ ] Content Security Policy (CSP) header set

**Test**:
```bash
# Search for dangerous patterns
grep -r "dangerouslySetInnerHTML" components/
grep -r "innerHTML" components/
grep -r "eval(" app/
```

**Manual Test**:
- [ ] Try XSS in invoice description: `<script>alert('XSS')</script>`
- [ ] Try in vendor name: `<img src=x onerror=alert('XSS')>`
- [ ] Verify script doesn't execute (text shown as-is)

---

### **3.3: CSRF Protection** (15 mins)

**Checklist**:
- [ ] NextAuth CSRF protection enabled (default)
- [ ] All POST requests have CSRF token (automatic with NextAuth)
- [ ] Form submissions use server actions (not fetch)
- [ ] External API calls don't use user cookies

**Test**:
- [ ] Try POST request without CSRF token (should fail)
- [ ] Verify CSRF token in form submissions

---

### **3.4: File Upload Validation** (45 mins)

**Files**: File upload components, server actions

**Checklist**:
- [ ] File type validation (whitelist, not blacklist)
- [ ] File size limit (e.g., max 5MB)
- [ ] File extension validation (check both extension and magic bytes)
- [ ] Uploaded files stored outside web root
- [ ] Uploaded files served with correct Content-Type
- [ ] No execution of uploaded files (e.g., .php, .exe blocked)
- [ ] Filename sanitization (remove path traversal: `../../../etc/passwd`)

**Test**:
```bash
# Try malicious uploads
curl -F "file=@malicious.php" https://paylog-production-5265.up.railway.app/api/upload
curl -F "file=@../../etc/passwd.jpg" https://paylog-production-5265.up.railway.app/api/upload
curl -F "file=@huge_file.bin" https://paylog-production-5265.up.railway.app/api/upload  # 100MB
```

**Manual Test**:
- [ ] Upload .php file (should reject)
- [ ] Upload .exe file (should reject)
- [ ] Upload 100MB file (should reject)
- [ ] Upload file with `../` in name (should sanitize)

---

## 🔒 Category 4: Data Protection (2 hours)

### **4.1: Environment Variables** (30 mins)

**Files**: `.env`, `.env.example`, Railway dashboard

**Checklist**:
- [ ] `.env` in `.gitignore` (not committed)
- [ ] `.env.example` has placeholder values (no real secrets)
- [ ] `DATABASE_URL` not exposed to client
- [ ] `NEXTAUTH_SECRET` is long (>32 chars), random
- [ ] API keys not hardcoded in code
- [ ] Railway env vars match production needs
- [ ] No secrets in logs or error messages

**Audit**:
```bash
# Check if .env is in git history
git log --all --full-history --pretty=format:"%H" -- .env

# Search for hardcoded secrets in code
grep -r "sk_live_" app/  # Stripe
grep -r "AKIA" app/      # AWS
grep -r "ghp_" app/      # GitHub
```

---

### **4.2: Sensitive Data Handling** (30 mins)

**Checklist**:
- [ ] Passwords never logged
- [ ] Credit card data not stored (if applicable)
- [ ] PII (email, name) not in client-side logs
- [ ] Database backups encrypted
- [ ] HTTPS enforced (Railway default)
- [ ] No sensitive data in URL query params
- [ ] Session tokens not in localStorage (use HttpOnly cookies)

**Test**:
```bash
# Check for sensitive data in logs
grep -r "password" logs/
grep -r "token" logs/
grep -r "@" logs/ | grep -v ".com"  # Check for emails
```

---

### **4.3: Database Security** (30 mins)

**Checklist**:
- [ ] Database URL not exposed to client
- [ ] Database user has minimal privileges (not root)
- [ ] Database connection over SSL (Railway default)
- [ ] Prisma connection limit set (prevent exhaustion)
- [ ] Database backups automated (Railway)
- [ ] Migrations tested in staging first

**Test**:
```bash
# Verify database connection is secure
DATABASE_URL="..." pnpm prisma studio
# Check connection string starts with postgresql:// (not http://)
```

---

### **4.4: Secrets in Code** (30 mins)

**Tools**: TruffleHog, git-secrets

```bash
# Install TruffleHog
pip install trufflehog

# Scan repository history
trufflehog filesystem . --json > secrets-scan.json

# Review findings
cat secrets-scan.json | jq '.[] | select(.verified==true)'
```

**Checklist**:
- [ ] No API keys in code
- [ ] No hardcoded passwords
- [ ] No private keys (.pem, .key)
- [ ] No database credentials
- [ ] No OAuth secrets

---

## 🌐 Category 5: API Security (1-2 hours)

### **5.1: Rate Limiting** (30 mins)

**Checklist**:
- [ ] Rate limiting on login endpoint (5 attempts/min)
- [ ] Rate limiting on password reset (3 attempts/hour)
- [ ] Rate limiting on API routes (100 requests/min per user)
- [ ] Rate limiting on file uploads (10 uploads/hour)
- [ ] DDoS protection (Railway/Cloudflare)

**Implementation** (if missing):
```typescript
// lib/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
});
```

**Test**:
```bash
# Test rate limiting
for i in {1..20}; do
  curl -X POST https://paylog-production-5265.up.railway.app/api/auth/signin
done
# Should see 429 Too Many Requests after threshold
```

---

### **5.2: CORS Configuration** (15 mins)

**File**: `next.config.js` or middleware

**Checklist**:
- [ ] CORS enabled for allowed origins only
- [ ] No `Access-Control-Allow-Origin: *` in production
- [ ] Allowed origins: production domain only
- [ ] Credentials allowed only for same-origin

**Test**:
```bash
# Check CORS headers
curl -I -H "Origin: https://evil.com" https://paylog-production-5265.up.railway.app/api/invoices
# Should NOT see: Access-Control-Allow-Origin: https://evil.com
```

---

### **5.3: HTTP Security Headers** (30 mins)

**File**: `next.config.js` or `middleware.ts`

**Required Headers**:
```javascript
headers: [
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'geolocation=(), microphone=(), camera=()'
  },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
  }
]
```

**Test**:
```bash
curl -I https://paylog-production-5265.up.railway.app | grep -E "X-Frame|X-Content|CSP|Referrer"
```

**Checklist**:
- [ ] X-Frame-Options: DENY (prevent clickjacking)
- [ ] X-Content-Type-Options: nosniff
- [ ] Referrer-Policy set
- [ ] Content-Security-Policy set
- [ ] HSTS header set (Strict-Transport-Security)

---

### **5.4: Error Handling** (15 mins)

**Checklist**:
- [ ] No stack traces in production errors
- [ ] No database errors exposed to client
- [ ] Generic error messages ("Something went wrong", not "SQL error at line 42")
- [ ] Detailed errors logged server-side only
- [ ] No sensitive data in error messages

**Test**:
- [ ] Trigger error (e.g., invalid input)
- [ ] Verify client sees generic message
- [ ] Verify server logs detailed error

---

## 🎯 Category 6: Penetration Testing (2-3 hours)

### **6.1: Authentication Bypass Tests** (1 hour)

**Tests**:
1. **Session Hijacking**:
   - [ ] Steal session cookie → use in different browser
   - [ ] Verify logout invalidates session
   - [ ] Session expires after inactivity

2. **Password Reset**:
   - [ ] Request reset with invalid email (no info leak)
   - [ ] Reuse reset token (should fail)
   - [ ] Expired token rejected

3. **Brute Force**:
   - [ ] Try 100 passwords (rate limit triggers)
   - [ ] Account locked after X failed attempts

---

### **6.2: Authorization Bypass Tests** (1 hour)

**Tests**:
1. **RBAC Bypass**:
   - [ ] Standard user call admin API (403)
   - [ ] Modify userId in request (403)
   - [ ] Access other user's data (403)

2. **IDOR (Insecure Direct Object Reference)**:
   - [ ] Change invoice ID in URL (can only see own)
   - [ ] Guess other invoice IDs (access denied)
   - [ ] Modify userId in API call (rejected)

3. **Privilege Escalation**:
   - [ ] Standard user try to promote self to admin (fail)
   - [ ] Modify role in JWT (signature invalid)

---

### **6.3: Input Injection Tests** (30 mins)

**Tests**:
1. **SQL Injection**:
   - [ ] `' OR '1'='1` in search
   - [ ] `'; DROP TABLE invoices;--` in input
   - [ ] Union-based injection attempts

2. **XSS**:
   - [ ] `<script>alert('XSS')</script>` in text fields
   - [ ] `<img src=x onerror=alert('XSS')>` in inputs
   - [ ] Event handlers in attributes

3. **Command Injection**:
   - [ ] `; ls -la` in file upload filename
   - [ ] `| cat /etc/passwd` in inputs

---

### **6.4: File Upload Attacks** (30 mins)

**Tests**:
- [ ] Upload .php file (rejected)
- [ ] Upload file with double extension (.jpg.php)
- [ ] Upload file with null byte (image.jpg%00.php)
- [ ] Upload SVG with embedded JavaScript
- [ ] Path traversal in filename (../../etc/passwd)

---

## 📜 Category 7: Compliance & Best Practices (1 hour)

### **7.1: GDPR Considerations** (30 mins)

**Checklist**:
- [ ] Privacy policy exists
- [ ] Data collection documented
- [ ] User consent for data collection
- [ ] Right to access data (user can export)
- [ ] Right to deletion (user can delete account)
- [ ] Data retention policy defined
- [ ] Data breach notification plan

---

### **7.2: Audit Logging** (15 mins)

**Checklist**:
- [ ] User activities logged (login, logout, data changes)
- [ ] Admin actions logged (approve, reject, delete)
- [ ] Security events logged (failed login, role change)
- [ ] Logs tamper-proof (append-only)
- [ ] Log retention policy (30/60/90 days)

---

### **7.3: SSL/TLS Configuration** (15 mins)

**Checklist**:
- [ ] HTTPS enforced (no HTTP)
- [ ] Valid SSL certificate (not expired)
- [ ] TLS 1.2+ only (no SSL 3.0, TLS 1.0)
- [ ] Strong cipher suites
- [ ] HSTS header set

**Test**:
```bash
# SSL Labs test
https://www.ssllabs.com/ssltest/analyze.html?d=paylog-production-5265.up.railway.app

# Expect grade: A or A+
```

---

## 📊 Audit Report Template

```markdown
# Security Audit Report - PayLog v1.0.0

**Date**: [Date]
**Auditor**: [Name]
**Status**: [PASS / FAIL / CONDITIONAL PASS]

## Executive Summary
- Total vulnerabilities found: X
- High priority: X
- Medium priority: X
- Low priority: X

## Findings

### [CATEGORY] - [SEVERITY]
**Issue**: [Description]
**Impact**: [What could happen]
**Recommendation**: [How to fix]
**Status**: [FIXED / PENDING / ACCEPTED RISK]

## Remediation Plan
1. [High priority item 1] - ETA: [date]
2. [High priority item 2] - ETA: [date]
...

## Conclusion
[Overall assessment]
[Go/No-Go for production launch]
```

---

## ✅ Final Security Checklist

**Before v1.0.0 Launch**:
- [ ] All HIGH vulnerabilities fixed
- [ ] All MEDIUM vulnerabilities fixed or documented
- [ ] Security audit report completed
- [ ] Penetration testing passed
- [ ] RBAC thoroughly tested
- [ ] Input validation comprehensive
- [ ] Secrets management verified
- [ ] Rate limiting implemented
- [ ] Security headers configured
- [ ] SSL/TLS grade A or A+
- [ ] Audit logging enabled
- [ ] Data protection measures verified
- [ ] Compliance requirements met

**Go/No-Go Decision**:
- [ ] PASS - Ready for production launch
- [ ] CONDITIONAL PASS - Minor issues, document as known
- [ ] FAIL - Critical issues, delay launch

---

**Last Updated**: November 24, 2025
**Next Review**: After Sprint 14 completion
