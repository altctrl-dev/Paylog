/**
 * Middleware Route Protection Tests - Sprint 11 Phase 4
 *
 * Tests for /admin/* route protection middleware
 *
 * Tested scenarios:
 * - Super admin can access /admin routes
 * - Admin can access /admin routes
 * - Manager/Associate cannot access /admin routes (redirected to /forbidden)
 * - Unauthenticated users cannot access /admin routes
 * - Non-admin routes are accessible to all authenticated users
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import middleware from '@/middleware'
import { NextRequest, NextResponse } from 'next/server'

// Mock auth module
jest.mock('@/lib/auth', () => ({
  auth: jest.fn((handler: any) => {
    return async (req: NextRequest) => {
      const session = (global as any).__mockSession
      Object.defineProperty(req, 'auth', {
        value: session,
        writable: true,
      })
      return handler(req)
    }
  }),
}))

// Mock NextResponse
jest.mock('next/server', () => {
  const actual = jest.requireActual('next/server')
  return {
    ...actual,
    NextResponse: {
      ...actual.NextResponse,
      redirect: jest.fn((url: URL) => ({
        status: 307,
        headers: { location: url.toString() },
        url: url.toString(),
      })),
      next: jest.fn(() => ({ status: 200 })),
    },
  }
})

describe('Route Protection Middleware - Sprint 11 Phase 4', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global as any).__mockSession = null
  })

  // Helper to create mock request
  const createMockRequest = (pathname: string, role?: string) => {
    const url = new URL(pathname, 'http://localhost:3000')
    const request = {
      nextUrl: url,
      url: url.toString(),
      auth: role
        ? {
            user: {
              id: '1',
              email: 'test@example.com',
              role,
            },
          }
        : null,
    } as NextRequest

    ;(global as any).__mockSession = request.auth
    return request
  }

  // ==========================================================================
  // Super Admin Access Tests
  // ==========================================================================
  describe('Super Admin Access', () => {
    it('should allow super_admin to access /admin', async () => {
      const request = createMockRequest('/admin', 'super_admin')
      const response = await middleware(request)

      expect(NextResponse.next).toHaveBeenCalled()
      expect(NextResponse.redirect).not.toHaveBeenCalled()
      expect(response?.status).toBe(200)
    })

    it('should allow super_admin to access /admin/users', async () => {
      const request = createMockRequest('/admin/users', 'super_admin')
      const response = await middleware(request)

      expect(NextResponse.next).toHaveBeenCalled()
      expect(NextResponse.redirect).not.toHaveBeenCalled()
    })

    it('should allow super_admin to access /admin/master-data', async () => {
      const request = createMockRequest('/admin/master-data', 'super_admin')
      const response = await middleware(request)

      expect(NextResponse.next).toHaveBeenCalled()
      expect(NextResponse.redirect).not.toHaveBeenCalled()
    })

    it('should allow super_admin to access nested /admin routes', async () => {
      const request = createMockRequest('/admin/settings/advanced', 'super_admin')
      const response = await middleware(request)

      expect(NextResponse.next).toHaveBeenCalled()
      expect(NextResponse.redirect).not.toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // Admin Access Tests
  // ==========================================================================
  describe('Admin Access', () => {
    it('should allow admin to access /admin', async () => {
      const request = createMockRequest('/admin', 'admin')
      const response = await middleware(request)

      expect(NextResponse.next).toHaveBeenCalled()
      expect(NextResponse.redirect).not.toHaveBeenCalled()
      expect(response?.status).toBe(200)
    })

    it('should allow admin to access /admin/master-data', async () => {
      const request = createMockRequest('/admin/master-data', 'admin')
      const response = await middleware(request)

      expect(NextResponse.next).toHaveBeenCalled()
      expect(NextResponse.redirect).not.toHaveBeenCalled()
    })

    it('should allow admin to access all /admin/* routes', async () => {
      const adminRoutes = [
        '/admin',
        '/admin/users',
        '/admin/master-data',
        '/admin/settings',
      ]

      for (const route of adminRoutes) {
        jest.clearAllMocks()
        const request = createMockRequest(route, 'admin')
        const response = await middleware(request)

        expect(NextResponse.next).toHaveBeenCalled()
        expect(NextResponse.redirect).not.toHaveBeenCalled()
        expect(response?.status).toBe(200)
      }
    })
  })

  // ==========================================================================
  // Manager Access Tests (Should be blocked)
  // ==========================================================================
  describe('Manager Access (Blocked)', () => {
    it('should redirect manager from /admin to /forbidden', async () => {
      const request = createMockRequest('/admin', 'manager')
      await middleware(request)

      expect(NextResponse.redirect).toHaveBeenCalled()
      expect(NextResponse.next).not.toHaveBeenCalled()

      const redirectCall = (NextResponse.redirect as jest.Mock).mock.calls[0][0]
      expect(redirectCall.pathname).toBe('/forbidden')
    })

    it('should redirect manager from /admin/users to /forbidden', async () => {
      const request = createMockRequest('/admin/users', 'manager')
      await middleware(request)

      expect(NextResponse.redirect).toHaveBeenCalled()
      const redirectCall = (NextResponse.redirect as jest.Mock).mock.calls[0][0]
      expect(redirectCall.pathname).toBe('/forbidden')
    })

    it('should redirect manager from any /admin/* route', async () => {
      const protectedRoutes = [
        '/admin',
        '/admin/users',
        '/admin/master-data',
        '/admin/settings',
      ]

      for (const route of protectedRoutes) {
        jest.clearAllMocks()
        const request = createMockRequest(route, 'manager')
        await middleware(request)

        expect(NextResponse.redirect).toHaveBeenCalled()
        expect(NextResponse.next).not.toHaveBeenCalled()
      }
    })
  })

  // ==========================================================================
  // Associate Access Tests (Should be blocked)
  // ==========================================================================
  describe('Associate Access (Blocked)', () => {
    it('should redirect associate from /admin to /forbidden', async () => {
      const request = createMockRequest('/admin', 'associate')
      await middleware(request)

      expect(NextResponse.redirect).toHaveBeenCalled()
      expect(NextResponse.next).not.toHaveBeenCalled()

      const redirectCall = (NextResponse.redirect as jest.Mock).mock.calls[0][0]
      expect(redirectCall.pathname).toBe('/forbidden')
    })

    it('should redirect associate from /admin/users to /forbidden', async () => {
      const request = createMockRequest('/admin/users', 'associate')
      await middleware(request)

      expect(NextResponse.redirect).toHaveBeenCalled()
      const redirectCall = (NextResponse.redirect as jest.Mock).mock.calls[0][0]
      expect(redirectCall.pathname).toBe('/forbidden')
    })

    it('should redirect associate from any /admin/* route', async () => {
      const protectedRoutes = [
        '/admin',
        '/admin/users',
        '/admin/master-data',
        '/admin/settings/system',
      ]

      for (const route of protectedRoutes) {
        jest.clearAllMocks()
        const request = createMockRequest(route, 'associate')
        await middleware(request)

        expect(NextResponse.redirect).toHaveBeenCalled()
      }
    })
  })

  // ==========================================================================
  // Unauthenticated Access Tests (Should be blocked)
  // ==========================================================================
  describe('Unauthenticated Access (Blocked)', () => {
    it('should redirect unauthenticated user from /admin to /forbidden', async () => {
      const request = createMockRequest('/admin')
      await middleware(request)

      expect(NextResponse.redirect).toHaveBeenCalled()
      expect(NextResponse.next).not.toHaveBeenCalled()

      const redirectCall = (NextResponse.redirect as jest.Mock).mock.calls[0][0]
      expect(redirectCall.pathname).toBe('/forbidden')
    })

    it('should redirect unauthenticated user from /admin/users', async () => {
      const request = createMockRequest('/admin/users')
      await middleware(request)

      expect(NextResponse.redirect).toHaveBeenCalled()
      const redirectCall = (NextResponse.redirect as jest.Mock).mock.calls[0][0]
      expect(redirectCall.pathname).toBe('/forbidden')
    })
  })

  // ==========================================================================
  // Non-Admin Routes (Should be accessible)
  // ==========================================================================
  describe('Non-Admin Routes (Accessible)', () => {
    it('should allow all roles to access /dashboard', async () => {
      const roles = ['super_admin', 'admin', 'manager', 'associate']

      for (const role of roles) {
        jest.clearAllMocks()
        const request = createMockRequest('/dashboard', role)
        const response = await middleware(request)

        expect(NextResponse.next).toHaveBeenCalled()
        expect(NextResponse.redirect).not.toHaveBeenCalled()
        expect(response?.status).toBe(200)
      }
    })

    it('should allow all roles to access /invoices', async () => {
      const roles = ['super_admin', 'admin', 'manager', 'associate']

      for (const role of roles) {
        jest.clearAllMocks()
        const request = createMockRequest('/invoices', role)
        const response = await middleware(request)

        expect(NextResponse.next).toHaveBeenCalled()
        expect(NextResponse.redirect).not.toHaveBeenCalled()
      }
    })

    it('should allow all roles to access /settings', async () => {
      const roles = ['super_admin', 'admin', 'manager', 'associate']

      for (const role of roles) {
        jest.clearAllMocks()
        const request = createMockRequest('/settings', role)
        const response = await middleware(request)

        expect(NextResponse.next).toHaveBeenCalled()
        expect(NextResponse.redirect).not.toHaveBeenCalled()
      }
    })

    it('should allow all roles to access /reports', async () => {
      const request = createMockRequest('/reports', 'associate')
      const response = await middleware(request)

      expect(NextResponse.next).toHaveBeenCalled()
      expect(NextResponse.redirect).not.toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe('Edge Cases', () => {
    it('should handle missing role (treat as unauthorized)', async () => {
      const url = new URL('/admin', 'http://localhost:3000')
      const request = {
        nextUrl: url,
        url: url.toString(),
        auth: {
          user: {
            id: '1',
            email: 'test@example.com',
            // role is missing
          },
        },
      } as NextRequest

      ;(global as any).__mockSession = request.auth
      await middleware(request)

      expect(NextResponse.redirect).toHaveBeenCalled()
    })

    it('should handle null role', async () => {
      const url = new URL('/admin', 'http://localhost:3000')
      const request = {
        nextUrl: url,
        url: url.toString(),
        auth: {
          user: {
            id: '1',
            email: 'test@example.com',
            role: null,
          },
        },
      } as any

      ;(global as any).__mockSession = request.auth
      await middleware(request)

      expect(NextResponse.redirect).toHaveBeenCalled()
    })

    it('should handle invalid role (not in enum)', async () => {
      const request = createMockRequest('/admin', 'invalid_role')
      await middleware(request)

      expect(NextResponse.redirect).toHaveBeenCalled()
    })

    it('should not interfere with /admin prefix in other paths', async () => {
      // Route like /admin-panel (does not start with /admin/)
      const request = createMockRequest('/admin-panel', 'associate')
      const response = await middleware(request)

      // Should NOT be blocked (not /admin/* route)
      expect(NextResponse.next).toHaveBeenCalled()
      expect(NextResponse.redirect).not.toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // Permission Boundary Integration
  // ==========================================================================
  describe('Permission Boundary Integration', () => {
    it('should strictly separate admin and non-admin roles', async () => {
      // Admin roles can access
      const adminRoles = ['admin', 'super_admin']
      for (const role of adminRoles) {
        jest.clearAllMocks()
        const request = createMockRequest('/admin/users', role)
        await middleware(request)
        expect(NextResponse.next).toHaveBeenCalled()
      }

      // Non-admin roles cannot access
      const nonAdminRoles = ['manager', 'associate']
      for (const role of nonAdminRoles) {
        jest.clearAllMocks()
        const request = createMockRequest('/admin/users', role)
        await middleware(request)
        expect(NextResponse.redirect).toHaveBeenCalled()
      }
    })

    it('should redirect to /forbidden (not /login) for unauthorized access', async () => {
      const request = createMockRequest('/admin', 'associate')
      await middleware(request)

      const redirectCall = (NextResponse.redirect as jest.Mock).mock.calls[0][0]
      expect(redirectCall.pathname).toBe('/forbidden')
      expect(redirectCall.pathname).not.toBe('/login')
    })
  })
})
