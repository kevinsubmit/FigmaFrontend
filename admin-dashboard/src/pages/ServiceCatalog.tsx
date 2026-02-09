import React, { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Edit3, Plus, Save } from 'lucide-react';
import { toast } from 'react-toastify';
import { AdminLayout } from '../layout/AdminLayout';
import { TopBar } from '../layout/TopBar';
import {
  createServiceCatalogItem,
  getServiceCatalog,
  ServiceCatalogItem,
  updateServiceCatalogItem,
} from '../api/services';
import { useAuth } from '../context/AuthContext';

type EditableCatalog = {
  name: string;
  category: string;
  description: string;
  sort_order: string;
  is_active: number;
};

const ServiceCatalogPage: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<ServiceCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, EditableCatalog>>({});
  const [creating, setCreating] = useState(false);

  const [newItem, setNewItem] = useState({
    name: '',
    category: '',
    description: '',
    sort_order: '0',
    is_active: 1,
  });

  const load = async () => {
    setLoading(true);
    try {
      const rows = await getServiceCatalog({ limit: 200 });
      setItems(rows);
      const nextDrafts: Record<number, EditableCatalog> = {};
      rows.forEach((row) => {
        nextDrafts[row.id] = {
          name: row.name,
          category: row.category || '',
          description: row.description || '',
          sort_order: row.sort_order.toString(),
          is_active: row.is_active,
        };
      });
      setDrafts(nextDrafts);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to load service catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const canCreate = useMemo(() => newItem.name.trim().length > 0, [newItem.name]);

  if (!user?.is_admin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const onCreate = async () => {
    if (!canCreate) {
      toast.error('Service name is required');
      return;
    }
    setCreating(true);
    try {
      const created = await createServiceCatalogItem({
        name: newItem.name.trim(),
        category: newItem.category.trim() || undefined,
        description: newItem.description.trim() || undefined,
        sort_order: newItem.sort_order ? Number(newItem.sort_order) : 0,
        is_active: newItem.is_active,
      });
      setItems((prev) => [created, ...prev]);
      setDrafts((prev) => ({
        ...prev,
        [created.id]: {
          name: created.name,
          category: created.category || '',
          description: created.description || '',
          sort_order: created.sort_order.toString(),
          is_active: created.is_active,
        },
      }));
      setNewItem({
        name: '',
        category: '',
        description: '',
        sort_order: '0',
        is_active: 1,
      });
      toast.success('Catalog service created');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to create service');
    } finally {
      setCreating(false);
    }
  };

  const onSave = async (id: number) => {
    const draft = drafts[id];
    if (!draft || !draft.name.trim()) {
      toast.error('Service name is required');
      return;
    }
    setSavingId(id);
    try {
      const updated = await updateServiceCatalogItem(id, {
        name: draft.name.trim(),
        category: draft.category.trim() || undefined,
        description: draft.description.trim() || undefined,
        sort_order: draft.sort_order ? Number(draft.sort_order) : 0,
        is_active: draft.is_active,
      });
      setItems((prev) => prev.map((row) => (row.id === id ? updated : row)));
      setDrafts((prev) => ({
        ...prev,
        [id]: {
          name: updated.name,
          category: updated.category || '',
          description: updated.description || '',
          sort_order: updated.sort_order.toString(),
          is_active: updated.is_active,
        },
      }));
      setEditingId(null);
      toast.success('Catalog service updated');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to update service');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <AdminLayout>
      <TopBar title="Service Catalog" />
      <div className="px-4 py-6 space-y-4">
        <div className="card-surface p-4 space-y-3">
          <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Create Catalog Service</p>
          <div className="grid grid-cols-1 gap-3">
            <input
              value={newItem.name}
              onChange={(event) => setNewItem((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Service name (e.g. Gel Manicure)"
              className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-gold-500"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                value={newItem.category}
                onChange={(event) => setNewItem((prev) => ({ ...prev, category: event.target.value }))}
                placeholder="Category"
                className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-gold-500"
              />
            </div>
            <textarea
              value={newItem.description}
              onChange={(event) => setNewItem((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Description (optional)"
              rows={2}
              className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-gold-500"
            />
            <button
              type="button"
              onClick={onCreate}
              disabled={!canCreate || creating}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              {creating ? 'Creating...' : 'Create Service Template'}
            </button>
          </div>
        </div>

        <div className="card-surface p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Catalog List</p>
            <span className="badge">{items.length} items</span>
          </div>

          {loading && <p className="text-sm text-slate-500">Loading...</p>}

          {!loading &&
            items.map((item) => {
              const isEditing = editingId === item.id;
              const draft = drafts[item.id];
              if (!draft) return null;
              return (
                <div key={item.id} className="rounded-xl border border-blue-100 bg-white p-3 space-y-2">
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        value={draft.name}
                        onChange={(event) =>
                          setDrafts((prev) => ({ ...prev, [item.id]: { ...prev[item.id], name: event.target.value } }))
                        }
                        className="w-full rounded-lg border border-blue-100 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-gold-500"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          value={draft.category}
                          onChange={(event) =>
                            setDrafts((prev) => ({ ...prev, [item.id]: { ...prev[item.id], category: event.target.value } }))
                          }
                          className="w-full rounded-lg border border-blue-100 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-gold-500"
                          placeholder="Category"
                        />
                      </div>
                      <textarea
                        value={draft.description}
                        onChange={(event) =>
                          setDrafts((prev) => ({ ...prev, [item.id]: { ...prev[item.id], description: event.target.value } }))
                        }
                        rows={2}
                        className="w-full rounded-lg border border-blue-100 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-gold-500"
                      />
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        {item.category || 'General'} · {item.is_active ? 'Active' : 'Inactive'}
                      </p>
                      {item.description && <p className="mt-1 text-xs text-slate-500">{item.description}</p>}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() =>
                        setDrafts((prev) => ({
                          ...prev,
                          [item.id]: { ...prev[item.id], is_active: prev[item.id].is_active === 1 ? 0 : 1 },
                        }))
                      }
                      className="rounded-lg border border-blue-200 px-2 py-1 text-xs text-slate-800"
                    >
                      {draft.is_active === 1 ? 'Set Inactive' : 'Set Active'}
                    </button>
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <button
                          type="button"
                          onClick={() => onSave(item.id)}
                          disabled={savingId === item.id}
                          className="inline-flex items-center gap-1 rounded-lg bg-gold-500 px-2 py-1 text-xs font-semibold text-white disabled:opacity-60"
                        >
                          <Save className="h-3 w-3" />
                          {savingId === item.id ? 'Saving...' : 'Save'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingId(item.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-2 py-1 text-xs text-slate-800"
                        >
                          <Edit3 className="h-3 w-3" />
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </AdminLayout>
  );
};

export default ServiceCatalogPage;
