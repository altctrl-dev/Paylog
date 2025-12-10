'use server';

import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

export interface ApprovalCounts {
  invoices: number;
  payments: number;
  vendors: number;
  archives: number;
}

export async function getApprovalCounts(): Promise<{ success: boolean; data?: ApprovalCounts; error?: string }> {
  // Check auth
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Check admin
  const isAdmin = session.user.role === 'admin' || session.user.role === 'super_admin';
  if (!isAdmin) {
    return { success: false, error: 'Admin access required' };
  }

  try {
    // Fetch counts in parallel
    const [invoices, payments, vendors, archives] = await Promise.all([
      // Pending invoice approvals
      db.invoice.count({
        where: { status: 'pending_approval', is_archived: false }
      }),

      // Pending payment approvals
      db.payment.count({
        where: { status: 'pending' }
      }),

      // Pending vendor approvals
      db.vendor.count({
        where: { status: 'PENDING_APPROVAL', deleted_at: null }
      }),

      // Pending archive requests (MasterDataRequest with entity_type='archive')
      db.masterDataRequest.count({
        where: { entity_type: 'archive', status: 'pending' }
      }),
    ]);

    return {
      success: true,
      data: { invoices, payments, vendors, archives }
    };
  } catch (error) {
    console.error('Error fetching approval counts:', error);
    return { success: false, error: 'Failed to fetch approval counts' };
  }
}
