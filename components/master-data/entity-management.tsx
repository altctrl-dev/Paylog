/**
 * Entity Management Component
 *
 * Full CRUD operations for entity management (formerly sub-entities).
 * Supports create, edit, archive/restore functionality.
 *
 * Created as part of Sprint 9A Phase 5-8.
 */

'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Archive, ArchiveRestore } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { usePanel } from '@/hooks/use-panel';
import {
  toggleEntityStatus,
  getEntities,
} from '@/app/actions/admin/entities';

type Entity = {
  id: number;
  name: string;
  description: string | null;
  address: string;
  country: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  invoiceCount: number;
};

export default function EntityManagement() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const { toast } = useToast();
  const { openPanel } = usePanel();

  // Fetch entities on mount
  useEffect(() => {
    fetchEntities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchEntities = async () => {
    try {
      setLoading(true);
      const result = await getEntities({ page: 1, per_page: 100 });

      if (result.success) {
        setEntities(result.data.entities);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to load entities',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Fetch entities error:', error);
      toast({
        title: 'Error',
        description: 'Failed to load entities',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    openPanel('entity-form', {});
  };

  const handleEdit = (entity: Entity) => {
    openPanel('entity-form', { entity });
  };

  const handleToggleStatus = async (id: number, currentStatus: boolean) => {
    try {
      const result = await toggleEntityStatus(id);

      if (result.success) {
        setEntities((prev) =>
          prev.map((e) =>
            e.id === id ? { ...e, is_active: result.data.is_active } : e
          )
        );

        toast({
          title: 'Success',
          description: `Entity ${currentStatus ? 'archived' : 'restored'} successfully`,
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update entity status',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Toggle entity status error:', error);
      toast({
        title: 'Error',
        description: 'Failed to update entity status',
        variant: 'destructive',
      });
    }
  };

  // Filter entities
  const filteredEntities = entities.filter((entity) => {
    // Status filter
    if (!showArchived && !entity.is_active) return false;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        entity.name.toLowerCase().includes(query) ||
        entity.address.toLowerCase().includes(query) ||
        entity.country.toLowerCase().includes(query)
      );
    }

    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading entities...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Entity Management</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage organizational entities with addresses and country information
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Entity
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Search by name, address, or country..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <label className="flex items-center text-sm">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="mr-2 h-4 w-4 rounded border-gray-300"
          />
          Show archived
        </label>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left text-sm font-semibold">Name</th>
              <th className="p-3 text-left text-sm font-semibold">Address</th>
              <th className="p-3 text-left text-sm font-semibold">Country</th>
              <th className="p-3 text-left text-sm font-semibold">Status</th>
              <th className="p-3 text-right text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntities.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  No entities found
                </td>
              </tr>
            ) : (
              filteredEntities.map((entity) => (
                <tr key={entity.id} className="border-b transition-colors hover:bg-muted/50">
                  <td className="p-3 text-sm font-medium">{entity.name}</td>
                  <td className="max-w-xs truncate p-3 text-sm">{entity.address}</td>
                  <td className="p-3 font-mono text-sm">{entity.country}</td>
                  <td className="p-3 text-sm">
                    <Badge variant={entity.is_active ? 'default' : 'secondary'}>
                      {entity.is_active ? 'Active' : 'Archived'}
                    </Badge>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(entity)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {entity.is_active ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(entity.id, true)}
                          disabled={entity.invoiceCount > 0}
                          title={
                            entity.invoiceCount > 0
                              ? `Cannot archive entity with ${entity.invoiceCount} invoice(s)`
                              : 'Archive entity'
                          }
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(entity.id, false)}
                          title="Restore entity"
                        >
                          <ArchiveRestore className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
