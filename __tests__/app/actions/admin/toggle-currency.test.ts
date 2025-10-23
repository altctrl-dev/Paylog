/**
 * Toggle Currency Server Action Test Suite
 *
 * Tests for Sprint 9A Phase 5-8 - Currency Management
 *
 * Tested actions:
 * - toggleCurrency (activate/deactivate, admin-only, last active currency protection)
 */

import { toggleCurrency } from '@/app/actions/admin/toggle-currency'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  mockSessions,
  mockCurrencies,
} from '../../../fixtures/database'

// Mock modules
jest.mock('@/lib/auth')
jest.mock('@/lib/db', () => ({
  db: {
    currency: {
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  },
}))
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

const mockAuth = auth as jest.MockedFunction<typeof auth>
const mockDb = db as any

describe('Toggle Currency Server Action', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ==========================================================================
  // SUCCESS TESTS
  // ==========================================================================
  describe('toggleCurrency - Success Cases', () => {
    it('should activate inactive currency successfully', async () => {
      // Mock admin session
      mockAuth.mockResolvedValue(mockSessions.admin as any)

      // Mock inactive currency
      mockDb.currency.findUnique.mockResolvedValue(mockCurrencies.eur as any)
      mockDb.currency.update.mockResolvedValue({
        ...mockCurrencies.eur,
        is_active: true,
      } as any)

      const result = await toggleCurrency(3)

      expect(result.success).toBe(true)
      expect(result.data?.is_active).toBe(true)
      expect(mockDb.currency.update).toHaveBeenCalledWith({
        where: { id: 3 },
        data: { is_active: true },
      })
    })

    it('should deactivate active currency when multiple active currencies exist', async () => {
      // Mock admin session
      mockAuth.mockResolvedValue(mockSessions.admin as any)

      // Mock active currency
      mockDb.currency.findUnique.mockResolvedValue(mockCurrencies.usd as any)
      // Mock count showing 2 active currencies
      mockDb.currency.count.mockResolvedValue(2)
      mockDb.currency.update.mockResolvedValue({
        ...mockCurrencies.usd,
        is_active: false,
      } as any)

      const result = await toggleCurrency(1)

      expect(result.success).toBe(true)
      expect(result.data?.is_active).toBe(false)
      expect(mockDb.currency.count).toHaveBeenCalledWith({
        where: { is_active: true },
      })
      expect(mockDb.currency.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { is_active: false },
      })
    })

    it('should allow super_admin to toggle currency', async () => {
      // Mock super_admin session
      mockAuth.mockResolvedValue({
        user: {
          id: '4',
          email: 'superadmin@test.com',
          role: 'super_admin',
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      } as any)

      mockDb.currency.findUnique.mockResolvedValue(mockCurrencies.eur as any)
      mockDb.currency.update.mockResolvedValue({
        ...mockCurrencies.eur,
        is_active: true,
      } as any)

      const result = await toggleCurrency(3)

      expect(result.success).toBe(true)
    })
  })

  // ==========================================================================
  // ERROR TESTS
  // ==========================================================================
  describe('toggleCurrency - Error Cases', () => {
    it('should reject unauthenticated user', async () => {
      // Mock no session
      mockAuth.mockResolvedValue(null)

      const result = await toggleCurrency(1)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Unauthorized')
    })

    it('should reject non-admin user (associate)', async () => {
      // Mock associate session
      mockAuth.mockResolvedValue(mockSessions.associate as any)

      const result = await toggleCurrency(1)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Admin access required')
    })

    it('should reject non-admin user (manager)', async () => {
      // Mock manager session
      mockAuth.mockResolvedValue(mockSessions.manager as any)

      const result = await toggleCurrency(1)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Admin access required')
    })

    it('should reject invalid currency ID', async () => {
      mockAuth.mockResolvedValue(mockSessions.admin as any)

      // Mock currency not found
      mockDb.currency.findUnique.mockResolvedValue(null)

      const result = await toggleCurrency(999)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Currency not found')
    })

    it('should prevent deactivating the last active currency', async () => {
      mockAuth.mockResolvedValue(mockSessions.admin as any)

      // Mock active currency
      mockDb.currency.findUnique.mockResolvedValue(mockCurrencies.usd as any)
      // Mock count showing only 1 active currency
      mockDb.currency.count.mockResolvedValue(1)

      const result = await toggleCurrency(1)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Cannot deactivate the last active currency')
      expect(result.error).toContain('At least one currency must remain active')
      expect(mockDb.currency.update).not.toHaveBeenCalled()
    })

    it('should handle database errors gracefully', async () => {
      mockAuth.mockResolvedValue(mockSessions.admin as any)

      // Mock database error
      mockDb.currency.findUnique.mockRejectedValue(
        new Error('Database connection failed')
      )

      const result = await toggleCurrency(1)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database connection failed')
    })
  })

  // ==========================================================================
  // BUSINESS LOGIC TESTS
  // ==========================================================================
  describe('toggleCurrency - Business Logic', () => {
    it('should check active currency count only when deactivating', async () => {
      mockAuth.mockResolvedValue(mockSessions.admin as any)

      // Mock inactive currency (activating)
      mockDb.currency.findUnique.mockResolvedValue(mockCurrencies.eur as any)
      mockDb.currency.update.mockResolvedValue({
        ...mockCurrencies.eur,
        is_active: true,
      } as any)

      await toggleCurrency(3)

      // Should NOT check count when activating
      expect(mockDb.currency.count).not.toHaveBeenCalled()
    })

    it('should call revalidatePath after successful toggle', async () => {
      const { revalidatePath } = require('next/cache')
      mockAuth.mockResolvedValue(mockSessions.admin as any)

      mockDb.currency.findUnique.mockResolvedValue(mockCurrencies.eur as any)
      mockDb.currency.update.mockResolvedValue({
        ...mockCurrencies.eur,
        is_active: true,
      } as any)

      await toggleCurrency(3)

      expect(revalidatePath).toHaveBeenCalledWith('/admin')
      expect(revalidatePath).toHaveBeenCalledWith('/invoices')
    })

    it('should handle edge case of exactly 1 active currency', async () => {
      mockAuth.mockResolvedValue(mockSessions.admin as any)

      mockDb.currency.findUnique.mockResolvedValue(mockCurrencies.usd as any)
      mockDb.currency.count.mockResolvedValue(1)

      const result = await toggleCurrency(1)

      expect(result.success).toBe(false)
      expect(result.error).toContain('last active currency')
    })
  })
})
