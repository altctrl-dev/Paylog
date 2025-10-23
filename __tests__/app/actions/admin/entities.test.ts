/**
 * Entity CRUD Server Actions Test Suite
 *
 * Tests for Sprint 9A Phase 5-8 - Entity Management
 *
 * Tested actions:
 * - getEntities (read-only for all authenticated users)
 * - createEntity (admin-only, duplicate validation)
 * - updateEntity (admin-only, duplicate validation excluding self)
 * - toggleEntityStatus (admin-only, invoice count validation)
 */

import {
  getEntities,
  createEntity,
  updateEntity,
  toggleEntityStatus,
} from '@/app/actions/admin/entities'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  mockSessions,
  mockEntities,
} from '../../../fixtures/database'

// Mock modules
jest.mock('@/lib/auth')
jest.mock('@/lib/db', () => ({
  db: {
    entity: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  },
}))
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

const mockAuth = auth as jest.MockedFunction<typeof auth>
const mockDb = db as any

describe('Entity Server Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ==========================================================================
  // GET ENTITIES TESTS
  // ==========================================================================
  describe('getEntities', () => {
    it('should return all entities for authenticated user', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any)

      const entitiesWithCount = [
        { ...mockEntities.indiaEntity, _count: { invoices: 5 } },
        { ...mockEntities.usEntity, _count: { invoices: 3 } },
      ]

      mockDb.entity.findMany.mockResolvedValue(entitiesWithCount as any)
      mockDb.entity.count.mockResolvedValue(2)

      const result = await getEntities()

      expect(result.success).toBe(true)
      expect(result.data?.entities).toHaveLength(2)
      expect(result.data?.entities[0].invoiceCount).toBe(5)
      expect(result.data?.pagination.total).toBe(2)
    })

    it('should filter by search term', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any)

      mockDb.entity.findMany.mockResolvedValue([
        { ...mockEntities.indiaEntity, _count: { invoices: 5 } },
      ] as any)
      mockDb.entity.count.mockResolvedValue(1)

      const result = await getEntities({ search: 'India' })

      expect(result.success).toBe(true)
      expect(mockDb.entity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { name: { contains: 'India', mode: 'insensitive' } },
              { address: { contains: 'India', mode: 'insensitive' } },
            ]),
          }),
        })
      )
    })

    it('should filter by is_active status', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any)

      mockDb.entity.findMany.mockResolvedValue([
        { ...mockEntities.inactiveEntity, _count: { invoices: 0 } },
      ] as any)
      mockDb.entity.count.mockResolvedValue(1)

      const result = await getEntities({ is_active: false })

      expect(result.success).toBe(true)
      expect(mockDb.entity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            is_active: false,
          }),
        })
      )
    })

    it('should filter by country code', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any)

      mockDb.entity.findMany.mockResolvedValue([
        { ...mockEntities.indiaEntity, _count: { invoices: 5 } },
      ] as any)
      mockDb.entity.count.mockResolvedValue(1)

      const result = await getEntities({ country: 'IN' })

      expect(result.success).toBe(true)
      expect(mockDb.entity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            country: 'IN',
          }),
        })
      )
    })

    it('should support pagination', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any)

      mockDb.entity.findMany.mockResolvedValue([] as any)
      mockDb.entity.count.mockResolvedValue(25)

      const result = await getEntities({ page: 2, per_page: 10 })

      expect(result.success).toBe(true)
      expect(result.data?.pagination.page).toBe(2)
      expect(result.data?.pagination.per_page).toBe(10)
      expect(result.data?.pagination.total_pages).toBe(3)
      expect(mockDb.entity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      )
    })

    it('should reject unauthenticated user', async () => {
      mockAuth.mockResolvedValue(null)

      const result = await getEntities()

      expect(result.success).toBe(false)
      expect(result.error).toContain('Unauthorized')
    })

    it('should allow all authenticated roles to read entities', async () => {
      // Test associate
      mockAuth.mockResolvedValue(mockSessions.associate as any)
      mockDb.entity.findMany.mockResolvedValue([] as any)
      mockDb.entity.count.mockResolvedValue(0)

      let result = await getEntities()
      expect(result.success).toBe(true)

      // Test manager
      mockAuth.mockResolvedValue(mockSessions.manager as any)
      result = await getEntities()
      expect(result.success).toBe(true)

      // Test admin
      mockAuth.mockResolvedValue(mockSessions.admin as any)
      result = await getEntities()
      expect(result.success).toBe(true)
    })
  })

  // ==========================================================================
  // CREATE ENTITY TESTS
  // ==========================================================================
  describe('createEntity', () => {
    it('should create entity with valid data', async () => {
      mockAuth.mockResolvedValue(mockSessions.admin as any)

      const newEntityData = {
        name: 'New Entity Corp.',
        description: 'New entity description',
        address: '999 New Street, City, State',
        country: 'US',
        is_active: true,
      }

      // Mock no existing entity
      mockDb.entity.findFirst.mockResolvedValue(null)
      mockDb.entity.create.mockResolvedValue({
        id: 4,
        ...newEntityData,
        country: 'US',
        created_at: new Date(),
        updated_at: new Date(),
        _count: { invoices: 0 },
      } as any)

      const result = await createEntity(newEntityData)

      expect(result.success).toBe(true)
      expect(result.data?.name).toBe('New Entity Corp.')
      expect(result.data?.country).toBe('US')
      expect(result.data?.invoiceCount).toBe(0)
      expect(mockDb.entity.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'New Entity Corp.',
          country: 'US',
        }),
        include: { _count: { select: { invoices: true } } },
      })
    })

    it('should normalize uppercase country code', async () => {
      mockAuth.mockResolvedValue(mockSessions.admin as any)

      // Note: The validation requires uppercase, .toUpperCase() normalizes already valid uppercase codes
      const newEntityData = {
        name: 'Test Entity',
        address: '123 Test St',
        country: 'US', // Must be uppercase to pass validation
        is_active: true,
      }

      mockDb.entity.findFirst.mockResolvedValue(null)
      mockDb.entity.create.mockResolvedValue({
        id: 5,
        name: 'Test Entity',
        description: null,
        address: '123 Test St',
        country: 'US',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        _count: { invoices: 0 },
      } as any)

      const result = await createEntity(newEntityData)

      expect(result.success).toBe(true)
      // Verify the database was called with uppercase country
      expect(mockDb.entity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            country: 'US',
          }),
        })
      )
    })

    it('should reject duplicate entity name (case-insensitive)', async () => {
      mockAuth.mockResolvedValue(mockSessions.admin as any)

      // Mock existing entity with same name
      mockDb.entity.findFirst.mockResolvedValue(mockEntities.indiaEntity as any)

      const result = await createEntity({
        name: 'ACME INDIA PVT. LTD.', // uppercase version
        address: '123 Test',
        country: 'IN',
        is_active: true,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('already exists')
    })

    it('should reject invalid country code (not 2 chars)', async () => {
      mockAuth.mockResolvedValue(mockSessions.admin as any)

      const result = await createEntity({
        name: 'Test Entity',
        address: '123 Test',
        country: 'USA', // 3 chars
        is_active: true,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('exactly 2 characters')
    })

    it('should reject non-uppercase country code pattern', async () => {
      mockAuth.mockResolvedValue(mockSessions.admin as any)

      const result = await createEntity({
        name: 'Test Entity',
        address: '123 Test',
        country: '12', // numbers
        is_active: true,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('2 uppercase letters')
    })

    it('should reject missing required fields', async () => {
      mockAuth.mockResolvedValue(mockSessions.admin as any)

      const result = await createEntity({
        name: '',
        address: '',
        country: 'US',
        is_active: true,
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should reject non-admin user', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any)

      const result = await createEntity({
        name: 'Test',
        address: '123',
        country: 'US',
        is_active: true,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Admin access required')
    })

    it('should allow optional description', async () => {
      mockAuth.mockResolvedValue(mockSessions.admin as any)

      mockDb.entity.findFirst.mockResolvedValue(null)
      mockDb.entity.create.mockResolvedValue({
        id: 6,
        name: 'Test Entity',
        description: null,
        address: '123 Test',
        country: 'US',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        _count: { invoices: 0 },
      } as any)

      const result = await createEntity({
        name: 'Test Entity',
        address: '123 Test',
        country: 'US',
        is_active: true,
      })

      expect(result.success).toBe(true)
      expect(mockDb.entity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            description: null,
          }),
        })
      )
    })
  })

  // ==========================================================================
  // UPDATE ENTITY TESTS
  // ==========================================================================
  describe('updateEntity', () => {
    it('should update entity successfully', async () => {
      mockAuth.mockResolvedValue(mockSessions.admin as any)

      mockDb.entity.findUnique.mockResolvedValue(mockEntities.indiaEntity as any)
      mockDb.entity.findFirst.mockResolvedValue(null) // No duplicate
      mockDb.entity.update.mockResolvedValue({
        ...mockEntities.indiaEntity,
        description: 'Updated description',
        _count: { invoices: 5 },
      } as any)

      const result = await updateEntity(1, {
        name: 'Acme India Pvt. Ltd.',
        description: 'Updated description',
        address: '123 Business Park, Mumbai, Maharashtra 400001',
        country: 'IN',
        is_active: true,
      })

      expect(result.success).toBe(true)
      expect(mockDb.entity.update).toHaveBeenCalled()
    })

    it('should reject non-existent entity', async () => {
      mockAuth.mockResolvedValue(mockSessions.admin as any)

      mockDb.entity.findUnique.mockResolvedValue(null)

      const result = await updateEntity(999, {
        name: 'Test',
        address: '123',
        country: 'US',
        is_active: true,
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Entity not found')
    })

    it('should reject duplicate name (excluding self)', async () => {
      mockAuth.mockResolvedValue(mockSessions.admin as any)

      mockDb.entity.findUnique.mockResolvedValue(mockEntities.indiaEntity as any)
      // Mock duplicate entity with different ID
      mockDb.entity.findFirst.mockResolvedValue(mockEntities.usEntity as any)

      const result = await updateEntity(1, {
        name: 'Acme USA Inc.', // name of entity #2
        address: '123 Test',
        country: 'IN',
        is_active: true,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('already exists')
      expect(mockDb.entity.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { not: 1 },
          }),
        })
      )
    })

    it('should allow same name for same entity (self-update)', async () => {
      mockAuth.mockResolvedValue(mockSessions.admin as any)

      mockDb.entity.findUnique.mockResolvedValue(mockEntities.indiaEntity as any)
      mockDb.entity.findFirst.mockResolvedValue(null) // No other entity with same name
      mockDb.entity.update.mockResolvedValue({
        ...mockEntities.indiaEntity,
        _count: { invoices: 5 },
      } as any)

      const result = await updateEntity(1, {
        name: 'Acme India Pvt. Ltd.', // same name
        address: '123 Business Park, Mumbai, Maharashtra 400001',
        country: 'IN',
        is_active: true,
      })

      expect(result.success).toBe(true)
    })

    it('should reject non-admin user', async () => {
      mockAuth.mockResolvedValue(mockSessions.manager as any)

      const result = await updateEntity(1, {
        name: 'Test',
        address: '123',
        country: 'US',
        is_active: true,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Admin access required')
    })
  })

  // ==========================================================================
  // TOGGLE ENTITY STATUS TESTS
  // ==========================================================================
  describe('toggleEntityStatus', () => {
    it('should archive entity with no invoices', async () => {
      mockAuth.mockResolvedValue(mockSessions.admin as any)

      mockDb.entity.findUnique.mockResolvedValue({
        ...mockEntities.indiaEntity,
        _count: { invoices: 0 },
      } as any)
      mockDb.entity.update.mockResolvedValue({
        ...mockEntities.indiaEntity,
        is_active: false,
        _count: { invoices: 0 },
      } as any)

      const result = await toggleEntityStatus(1)

      expect(result.success).toBe(true)
      expect(result.data?.is_active).toBe(false)
    })

    it('should restore archived entity', async () => {
      mockAuth.mockResolvedValue(mockSessions.admin as any)

      mockDb.entity.findUnique.mockResolvedValue({
        ...mockEntities.inactiveEntity,
        _count: { invoices: 0 },
      } as any)
      mockDb.entity.update.mockResolvedValue({
        ...mockEntities.inactiveEntity,
        is_active: true,
        _count: { invoices: 0 },
      } as any)

      const result = await toggleEntityStatus(3)

      expect(result.success).toBe(true)
      expect(result.data?.is_active).toBe(true)
    })

    it('should prevent archiving entity with invoices', async () => {
      mockAuth.mockResolvedValue(mockSessions.admin as any)

      mockDb.entity.findUnique.mockResolvedValue({
        ...mockEntities.indiaEntity,
        _count: { invoices: 5 },
      } as any)

      const result = await toggleEntityStatus(1)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Cannot archive entity with 5 invoice(s)')
      expect(mockDb.entity.update).not.toHaveBeenCalled()
    })

    it('should reject non-existent entity', async () => {
      mockAuth.mockResolvedValue(mockSessions.admin as any)

      mockDb.entity.findUnique.mockResolvedValue(null)

      const result = await toggleEntityStatus(999)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Entity not found')
    })

    it('should reject non-admin user', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any)

      const result = await toggleEntityStatus(1)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Admin access required')
    })

    it('should allow restoring entity with invoices (only blocks archiving)', async () => {
      mockAuth.mockResolvedValue(mockSessions.admin as any)

      // Entity is inactive but has invoices (edge case)
      mockDb.entity.findUnique.mockResolvedValue({
        ...mockEntities.inactiveEntity,
        is_active: false,
        _count: { invoices: 3 },
      } as any)
      mockDb.entity.update.mockResolvedValue({
        ...mockEntities.inactiveEntity,
        is_active: true,
        _count: { invoices: 3 },
      } as any)

      const result = await toggleEntityStatus(3)

      expect(result.success).toBe(true)
      expect(result.data?.is_active).toBe(true)
    })
  })

  // ==========================================================================
  // REVALIDATION TESTS
  // ==========================================================================
  describe('Revalidation', () => {
    it('should call revalidatePath after successful create', async () => {
      const { revalidatePath } = require('next/cache')
      mockAuth.mockResolvedValue(mockSessions.admin as any)

      mockDb.entity.findFirst.mockResolvedValue(null)
      mockDb.entity.create.mockResolvedValue({
        id: 7,
        name: 'Test',
        description: null,
        address: '123',
        country: 'US',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        _count: { invoices: 0 },
      } as any)

      await createEntity({
        name: 'Test',
        address: '123',
        country: 'US',
        is_active: true,
      })

      expect(revalidatePath).toHaveBeenCalledWith('/admin')
      expect(revalidatePath).toHaveBeenCalledWith('/invoices')
    })

    it('should call revalidatePath after successful update', async () => {
      const { revalidatePath } = require('next/cache')
      mockAuth.mockResolvedValue(mockSessions.admin as any)

      mockDb.entity.findUnique.mockResolvedValue(mockEntities.indiaEntity as any)
      mockDb.entity.findFirst.mockResolvedValue(null)
      mockDb.entity.update.mockResolvedValue({
        ...mockEntities.indiaEntity,
        _count: { invoices: 0 },
      } as any)

      await updateEntity(1, {
        name: 'Updated',
        address: '123',
        country: 'IN',
        is_active: true,
      })

      expect(revalidatePath).toHaveBeenCalledWith('/admin')
      expect(revalidatePath).toHaveBeenCalledWith('/invoices')
    })

    it('should call revalidatePath after successful toggle', async () => {
      const { revalidatePath } = require('next/cache')
      mockAuth.mockResolvedValue(mockSessions.admin as any)

      mockDb.entity.findUnique.mockResolvedValue({
        ...mockEntities.inactiveEntity,
        _count: { invoices: 0 },
      } as any)
      mockDb.entity.update.mockResolvedValue({
        ...mockEntities.inactiveEntity,
        is_active: true,
        _count: { invoices: 0 },
      } as any)

      await toggleEntityStatus(3)

      expect(revalidatePath).toHaveBeenCalledWith('/admin')
      expect(revalidatePath).toHaveBeenCalledWith('/invoices')
    })
  })
})
