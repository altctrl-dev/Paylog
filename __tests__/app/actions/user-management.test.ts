/**
 * User Management Server Actions Test Suite - Sprint 11 Phase 4
 *
 * Tests for role-based access control and permission boundaries
 *
 * Tested actions:
 * - validateRoleChange: Validate role changes with last super admin protection
 * - deactivateUser: Prevent deactivation of last super admin
 * - updateUser: Enforce permission boundaries
 * - Permission boundary integration tests
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  validateRoleChange,
  deactivateUser,
  updateUser,
  createUser,
} from '@/lib/actions/user-management'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { mockUsers } from '../../fixtures/database'

// Mock modules
jest.mock('@/lib/auth')
jest.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    userAuditLog: {
      create: jest.fn(),
    },
  },
}))
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
}))

const mockAuth = auth as jest.MockedFunction<typeof auth>
const mockDb = db as any

describe('User Management - Permission Boundaries (Sprint 11 Phase 4)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ==========================================================================
  // validateRoleChange Tests - Last Super Admin Protection
  // ==========================================================================
  describe('validateRoleChange - Last Super Admin Protection', () => {
    it('should allow role change when user is not last super admin', async () => {
      mockAuth.mockResolvedValue({
        user: mockUsers.superAdmin,
      } as any)

      mockDb.user.findUnique.mockResolvedValue({
        id: 1,
        role: 'super_admin',
        is_active: true,
      })

      // 2 super admins exist
      mockDb.user.count.mockResolvedValue(2)

      const result = await validateRoleChange(1, 'admin')

      expect(result.success).toBe(true)
      expect(result.isLastSuperAdmin).toBe(false)
      expect(result.canProceed).toBe(true)
    })

    it('should block demotion of last super admin', async () => {
      mockAuth.mockResolvedValue({
        user: mockUsers.superAdmin,
      } as any)

      mockDb.user.findUnique.mockResolvedValue({
        id: 1,
        role: 'super_admin',
        is_active: true,
      })

      // Only 1 super admin exists
      mockDb.user.count.mockResolvedValue(1)

      const result = await validateRoleChange(1, 'admin')

      expect(result.success).toBe(true)
      expect(result.isLastSuperAdmin).toBe(true)
      expect(result.canProceed).toBe(false)
      expect(result.message).toContain('last active super admin')
    })

    it('should allow role change from admin to manager (not affecting super admin count)', async () => {
      mockAuth.mockResolvedValue({
        user: mockUsers.superAdmin,
      } as any)

      mockDb.user.findUnique.mockResolvedValue({
        id: 2,
        role: 'admin',
        is_active: true,
      })

      // Not changing from super_admin, so count doesn't matter
      mockDb.user.count.mockResolvedValue(1)

      const result = await validateRoleChange(2, 'manager')

      expect(result.success).toBe(true)
      expect(result.isLastSuperAdmin).toBe(false)
      expect(result.canProceed).toBe(true)
    })

    it('should allow promotion to super_admin when already super_admin (no change)', async () => {
      mockAuth.mockResolvedValue({
        user: mockUsers.superAdmin,
      } as any)

      mockDb.user.findUnique.mockResolvedValue({
        id: 1,
        role: 'super_admin',
        is_active: true,
      })

      mockDb.user.count.mockResolvedValue(1)

      const result = await validateRoleChange(1, 'super_admin')

      expect(result.success).toBe(true)
      expect(result.canProceed).toBe(true)
      // Not actually changing role, so no protection needed
    })

    it('should return error when user not found', async () => {
      mockAuth.mockResolvedValue({
        user: mockUsers.superAdmin,
      } as any)

      mockDb.user.findUnique.mockResolvedValue(null)

      const result = await validateRoleChange(999, 'admin')

      expect(result.success).toBe(false)
      expect(result.error).toContain('User not found')
    })

    it('should return error when called by non-super-admin', async () => {
      mockAuth.mockResolvedValue({
        user: mockUsers.admin,
      } as any)

      const result = await validateRoleChange(1, 'admin')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Super admin access required')
    })
  })

  // ==========================================================================
  // deactivateUser Tests - Last Super Admin Protection
  // ==========================================================================
  describe('deactivateUser - Last Super Admin Protection', () => {
    it('should prevent deactivation of last super admin', async () => {
      mockAuth.mockResolvedValue({
        user: mockUsers.superAdmin,
      } as any)

      mockDb.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'last-admin@test.com',
        full_name: 'Last Admin',
        role: 'super_admin',
        is_active: true,
      })

      // Only 1 active super admin
      mockDb.user.count.mockResolvedValue(1)

      const result = await deactivateUser(1)

      expect(result.success).toBe(false)
      expect(result.error).toContain('last active super admin')
      expect(mockDb.user.update).not.toHaveBeenCalled()
    })

    it('should allow deactivation when not last super admin', async () => {
      mockAuth.mockResolvedValue({
        user: mockUsers.superAdmin,
      } as any)

      const targetUser = {
        id: 2,
        email: 'admin2@test.com',
        full_name: 'Second Admin',
        role: 'super_admin',
        is_active: true,
      }

      mockDb.user.findUnique.mockResolvedValue(targetUser)

      // 2 active super admins
      mockDb.user.count.mockResolvedValue(2)

      mockDb.user.update.mockResolvedValue({
        ...targetUser,
        is_active: false,
      })

      mockDb.userAuditLog.create.mockResolvedValue({})

      const result = await deactivateUser(2)

      expect(result.success).toBe(true)
      expect(mockDb.user.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { is_active: false },
      })
    })

    it('should allow deactivation of non-super-admin users', async () => {
      mockAuth.mockResolvedValue({
        user: mockUsers.superAdmin,
      } as any)

      const manager = {
        id: 3,
        email: 'manager@test.com',
        full_name: 'Test Manager',
        role: 'manager',
        is_active: true,
      }

      mockDb.user.findUnique.mockResolvedValue(manager)

      mockDb.user.update.mockResolvedValue({
        ...manager,
        is_active: false,
      })

      mockDb.userAuditLog.create.mockResolvedValue({})

      const result = await deactivateUser(3)

      expect(result.success).toBe(true)
      expect(mockDb.user.update).toHaveBeenCalled()
    })

    it('should return error when non-super-admin tries to deactivate', async () => {
      mockAuth.mockResolvedValue({
        user: mockUsers.admin,
      } as any)

      const result = await deactivateUser(1)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Super admin access required')
      expect(mockDb.user.update).not.toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // updateUser Tests - Permission Boundaries
  // ==========================================================================
  describe('updateUser - Permission Boundaries', () => {
    it('should prevent non-super-admin from changing roles', async () => {
      mockAuth.mockResolvedValue({
        user: mockUsers.admin, // Regular admin, not super_admin
      } as any)

      mockDb.user.findUnique.mockResolvedValue({
        id: 5,
        email: 'user@test.com',
        full_name: 'Test User',
        role: 'associate',
        is_active: true,
      })

      const result = await updateUser(5, {
        full_name: 'Test User',
        email: 'user@test.com',
        role: 'manager', // Trying to change role
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Super admin access required')
    })

    it('should allow super_admin to change roles', async () => {
      mockAuth.mockResolvedValue({
        user: mockUsers.superAdmin,
      } as any)

      mockDb.user.findUnique
        .mockResolvedValueOnce({
          id: 5,
          email: 'user@test.com',
          full_name: 'Test User',
          role: 'associate',
          is_active: true,
        })
        .mockResolvedValueOnce(null) // Email uniqueness check

      mockDb.user.count.mockResolvedValue(2) // Not last super admin

      mockDb.user.update.mockResolvedValue({
        id: 5,
        email: 'user@test.com',
        full_name: 'Test User',
        role: 'manager',
        is_active: true,
      })

      mockDb.userAuditLog.create.mockResolvedValue({})

      const result = await updateUser(5, {
        full_name: 'Test User',
        email: 'user@test.com',
        role: 'manager',
      })

      expect(result.success).toBe(true)
      expect(mockDb.user.update).toHaveBeenCalled()
    })

    it('should block role change if it would demote last super admin', async () => {
      mockAuth.mockResolvedValue({
        user: mockUsers.superAdmin,
      } as any)

      mockDb.user.findUnique
        .mockResolvedValueOnce({
          id: 1,
          email: 'last-admin@test.com',
          full_name: 'Last Admin',
          role: 'super_admin',
          is_active: true,
        })
        .mockResolvedValueOnce(null) // Email uniqueness check

      // Only 1 active super admin
      mockDb.user.count.mockResolvedValue(1)

      const result = await updateUser(1, {
        full_name: 'Last Admin',
        email: 'last-admin@test.com',
        role: 'admin', // Trying to demote last super admin
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('last active super admin')
      expect(mockDb.user.update).not.toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // createUser Tests - Permission Boundaries
  // ==========================================================================
  describe('createUser - Permission Boundaries', () => {
    it('should only allow super_admin to create users', async () => {
      mockAuth.mockResolvedValue({
        user: mockUsers.admin, // Regular admin, not super_admin
      } as any)

      const result = await createUser({
        email: 'newuser@test.com',
        full_name: 'New User',
        role: 'associate',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Super admin access required')
      expect(mockDb.user.create).not.toHaveBeenCalled()
    })

    it('should allow super_admin to create users', async () => {
      mockAuth.mockResolvedValue({
        user: mockUsers.superAdmin,
      } as any)

      mockDb.user.findUnique.mockResolvedValue(null) // Email not taken

      mockDb.user.create.mockResolvedValue({
        id: 10,
        email: 'newuser@test.com',
        full_name: 'New User',
        role: 'associate',
        is_active: true,
        password_hash: 'hashed_password',
        created_at: new Date(),
        updated_at: new Date(),
      })

      mockDb.userAuditLog.create.mockResolvedValue({})

      const result = await createUser({
        email: 'newuser@test.com',
        full_name: 'New User',
        role: 'associate',
      })

      expect(result.success).toBe(true)
      expect(mockDb.user.create).toHaveBeenCalled()
      expect(result.data).toHaveProperty('temporaryPassword')
    })
  })

  // ==========================================================================
  // Permission Boundary Integration Tests
  // ==========================================================================
  describe('Permission Boundary Integration', () => {
    it('should enforce strict super_admin requirement for user management', async () => {
      const nonSuperAdminRoles = [
        mockUsers.admin,
        mockUsers.manager,
        mockUsers.associate,
      ]

      for (const user of nonSuperAdminRoles) {
        jest.clearAllMocks()
        mockAuth.mockResolvedValue({ user } as any)

        // Try to create user
        const createResult = await createUser({
          email: 'test@test.com',
          full_name: 'Test',
          role: 'associate',
        })
        expect(createResult.success).toBe(false)
        expect(createResult.error).toContain('Super admin access required')

        // Try to deactivate user
        const deactivateResult = await deactivateUser(1)
        expect(deactivateResult.success).toBe(false)
        expect(deactivateResult.error).toContain('Super admin access required')
      }
    })

    it('should allow super_admin full access to user management', async () => {
      mockAuth.mockResolvedValue({
        user: mockUsers.superAdmin,
      } as any)

      // Setup mocks for successful operations
      mockDb.user.findUnique.mockResolvedValue(null) // For email check
      mockDb.user.create.mockResolvedValue({
        id: 99,
        email: 'new@test.com',
        full_name: 'New User',
        role: 'associate',
        is_active: true,
        password_hash: 'hashed',
        created_at: new Date(),
        updated_at: new Date(),
      })
      mockDb.userAuditLog.create.mockResolvedValue({})

      // Create user
      const createResult = await createUser({
        email: 'new@test.com',
        full_name: 'New User',
        role: 'associate',
      })
      expect(createResult.success).toBe(true)
    })

    it('should prevent system from having zero super admins', async () => {
      mockAuth.mockResolvedValue({
        user: mockUsers.superAdmin,
      } as any)

      mockDb.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'last@test.com',
        full_name: 'Last Admin',
        role: 'super_admin',
        is_active: true,
      })

      mockDb.user.count.mockResolvedValue(1) // Last super admin

      // Try to deactivate
      const deactivateResult = await deactivateUser(1)
      expect(deactivateResult.success).toBe(false)

      // Try to demote role
      mockDb.user.findUnique
        .mockResolvedValueOnce({
          id: 1,
          email: 'last@test.com',
          full_name: 'Last Admin',
          role: 'super_admin',
          is_active: true,
        })
        .mockResolvedValueOnce(null) // Email check

      const updateResult = await updateUser(1, {
        full_name: 'Last Admin',
        email: 'last@test.com',
        role: 'admin',
      })
      expect(updateResult.success).toBe(false)

      // Both should be blocked
      expect(deactivateResult.error).toContain('last active super admin')
      expect(updateResult.error).toContain('last active super admin')
    })
  })

  // ==========================================================================
  // Negative Tests - Edge Cases
  // ==========================================================================
  describe('Negative Tests - Edge Cases', () => {
    it('should handle unauthenticated requests', async () => {
      mockAuth.mockResolvedValue(null)

      const result = await createUser({
        email: 'test@test.com',
        full_name: 'Test',
        role: 'associate',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Super admin access required')
    })

    it('should handle missing role in session', async () => {
      mockAuth.mockResolvedValue({
        user: { id: '1', email: 'test@test.com' }, // No role
      } as any)

      const result = await createUser({
        email: 'new@test.com',
        full_name: 'New User',
        role: 'associate',
      })

      expect(result.success).toBe(false)
    })

    it('should handle database errors gracefully', async () => {
      mockAuth.mockResolvedValue({
        user: mockUsers.superAdmin,
      } as any)

      mockDb.user.findUnique.mockRejectedValue(new Error('Database error'))

      const result = await deactivateUser(1)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })
})
