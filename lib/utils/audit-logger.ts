/**
 * User Audit Logger Utility
 * Sprint 11 Phase 2: Server Actions & API
 */

import { db as prisma } from '@/lib/db';
import type { UserAuditEventType } from '@/lib/types/user-management';

interface AuditLogData {
  target_user_id: number;
  actor_user_id: number | null;
  event_type: UserAuditEventType;
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
}

interface RequestMetadata {
  ip_address?: string | null;
  user_agent?: string | null;
}

/**
 * Log a user management event to the audit trail
 * @param data - Audit log data
 * @param requestMetadata - Optional request metadata (IP, user agent). Pass this from action boundary to avoid caching issues.
 * @returns Created audit log record
 */
export async function logUserAudit(
  data: AuditLogData,
  requestMetadata?: RequestMetadata
) {
  try {
    // Use provided metadata or defaults (no headers() call to avoid caching conflicts)
    const ip_address = requestMetadata?.ip_address ?? null;
    const user_agent = requestMetadata?.user_agent ?? null;

    // Create audit log entry
    const auditLog = await prisma.userAuditLog.create({
      data: {
        target_user_id: data.target_user_id,
        actor_user_id: data.actor_user_id,
        event_type: data.event_type,
        old_data: data.old_data ? JSON.stringify(data.old_data) : null,
        new_data: data.new_data ? JSON.stringify(data.new_data) : null,
        ip_address,
        user_agent,
      },
    });

    return auditLog;
  } catch (error) {
    // Log error but don't throw - audit logging should not break operations
    console.error('Failed to log user audit:', error);
    return null;
  }
}

/**
 * Get audit history for a specific user
 * @param userId - Target user ID
 * @param options - Query options
 * @returns Audit log entries with actor details
 */
export async function getUserAuditHistory(
  userId: number,
  options: {
    limit?: number;
    offset?: number;
    event_type?: UserAuditEventType;
  } = {}
) {
  const { limit = 50, offset = 0, event_type } = options;

  const auditLogs = await prisma.userAuditLog.findMany({
    where: {
      target_user_id: userId,
      ...(event_type && { event_type }),
    },
    include: {
      actor: {
        select: {
          id: true,
          full_name: true,
          email: true,
        },
      },
    },
    orderBy: {
      created_at: 'desc',
    },
    take: limit,
    skip: offset,
  });

  // Parse JSON strings back to objects
  return auditLogs.map((log) => ({
    ...log,
    old_data: log.old_data ? JSON.parse(log.old_data) : null,
    new_data: log.new_data ? JSON.parse(log.new_data) : null,
  }));
}

/**
 * Get recent audit events across all users
 * @param options - Query options
 * @returns Recent audit log entries
 */
export async function getRecentAuditEvents(
  options: {
    limit?: number;
    actor_user_id?: number;
    event_types?: UserAuditEventType[];
  } = {}
) {
  const { limit = 20, actor_user_id, event_types } = options;

  const auditLogs = await prisma.userAuditLog.findMany({
    where: {
      ...(actor_user_id && { actor_user_id }),
      ...(event_types && { event_type: { in: event_types } }),
    },
    include: {
      actor: {
        select: {
          id: true,
          full_name: true,
          email: true,
        },
      },
      target_user: {
        select: {
          id: true,
          full_name: true,
          email: true,
        },
      },
    },
    orderBy: {
      created_at: 'desc',
    },
    take: limit,
  });

  // Parse JSON strings back to objects
  return auditLogs.map((log) => ({
    ...log,
    old_data: log.old_data ? JSON.parse(log.old_data) : null,
    new_data: log.new_data ? JSON.parse(log.new_data) : null,
  }));
}

/**
 * Count audit events by type for a user
 * @param userId - Target user ID
 * @returns Event counts by type
 */
export async function getUserAuditCounts(userId: number) {
  const counts = await prisma.userAuditLog.groupBy({
    by: ['event_type'],
    where: {
      target_user_id: userId,
    },
    _count: {
      id: true,
    },
  });

  return counts.reduce(
    (acc, item) => {
      acc[item.event_type] = item._count.id;
      return acc;
    },
    {} as Record<string, number>
  );
}
