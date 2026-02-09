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
  const normalizeText = (value?: string | null) => (value || '').trim().toLowerCase();
  const showDuplicateAlert = (message: string) => {
    window.alert(message);
  };

  if (!user?.is_admin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const onCreate = async () => {
    if (!canCreate) {
      toast.error('Service name is required');
      return;
    }
    const normalizedName = normalizeText(newItem.name);
    const normalizedCategory = normalizeText(newItem.category);
    if (items.some((item) => normalizeText(item.name) === normalizedName)) {
      showDuplicateAlert('Service name already exists. Please use a different name.');
      return;
    }
    if (normalizedCategory && items.some((item) => normalizeText(item.category) === normalizedCategory)) {
      showDuplicateAlert('Category already exists. Please use a different category.');
      return;
    }
    setCreating(true);
    try {
      const created = await createServiceCatalogItem({
        name: newItem.name.trim(),
        category: newItem.category.trim() || undefined,
        sort_order: newItem.sort_order ? Number(newItem.sort_order) : 0,
        is_active: newItem.is_active,
      });
      setItems((prev) => [created, ...prev]);
      setDrafts((prev) => ({
        ...prev,
        [created.id]: {
          name: created.name,
          category: created.category || '',
          sort_order: created.sort_order.toString(),
          is_active: created.is_active,
        },
      }));
      setNewItem({
        name: '',
        category: '',
        sort_order: '0',
        is_active: 1,
      });
      toast.success('Catalog service created');
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      if (detail === 'Service name already exists') {
        showDuplicateAlert('Service name already exists. Please use a different name.');
      } else if (detail === 'Category already exists') {
        showDuplicateAlert('Category already exists. Please use a different category.');
      } else {
        toast.error(detail || 'Failed to create service');
      }
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
    const normalizedName = normalizeText(draft.name);
    const normalizedCategory = normalizeText(draft.category);
    if (items.some((item) => item.id !== id && normalizeText(item.name) === normalizedName)) {
      showDuplicateAlert('Service name already exists. Please use a different name.');
      return;
    }
    if (normalizedCategory && items.some((item) => item.id !== id && normalizeText(item.category) === normalizedCategory)) {
      showDuplicateAlert('Category already exists. Please use a different category.');
      return;
    }
    setSavingId(id);
    try {
      const updated = await updateServiceCatalogItem(id, {
        name: draft.name.trim(),
        category: draft.category.trim() || undefined,
        sort_order: draft.sort_order ? Number(draft.sort_order) : 0,
        is_active: draft.is_active,
      });
      setItems((prev) => prev.map((row) => (row.id === id ? updated : row)));
      setDrafts((prev) => ({
        ...prev,
        [id]: {
          name: updated.name,
          category: updated.category || '',
          sort_order: updated.sort_order.toString(),
          is_active: updated.is_active,
        },
      }));
      setEditingId(null);
      toast.success('Catalog service updated');
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      if (detail === 'Service name already exists') {
        showDuplicateAlert('Service name already exists. Please use a different name.');
      } else if (detail === 'Category already exists') {
        showDuplicateAlert('Category already exists. Please use a different category.');
      } else {
        toast.error(detail || 'Failed to update service');
      }
    } finally {
      setSavingId(null);
    }
  };

  return (
    <AdminLayout>
      <TopBar title="Service Catalog" subtitle="Manage catalog services and categories" />
      <div className="px-4 py-5 space-y-4 lg:px-6">
        <div className="card-surface p-5 space-y-4">
          <div className="flex items-center gap-6 border-b border-blue-100 pb-3">
            <button className="text-sm font-semibold text-blue-600 border-b-2 border-blue-500 pb-2">Services</button>
            <button className="text-sm font-medium text-slate-400 pb-2">Packages</button>
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.6fr_1fr_auto]">
            <input
              value={newItem.name}
              onChange={(event) => setNewItem((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Service name"
              className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-gold-500"
            />
            <input
              value={newItem.category}
              onChange={(event) => setNewItem((prev) => ({ ...prev, category: event.target.value }))}
              placeholder="Category"
              className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-gold-500"
            />
            <button
              type="button"
              onClick={onCreate}
              disabled={!canCreate || creating}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold-500 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              {creating ? 'Creating...' : 'Create Service'}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              value={newItem.sort_order}
              onChange={(event) => setNewItem((prev) => ({ ...prev, sort_order: event.target.value }))}
              placeholder="Sort order (default: 0)"
              className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-gold-500"
            />
            <select
              value={newItem.is_active}
              onChange={(event) => setNewItem((prev) => ({ ...prev, is_active: Number(event.target.value) }))}
              className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-gold-500"
            >
              <option value={1}>Status: Active</option>
              <option value={0}>Status: Inactive</option>
            </select>
          </div>
        </div>

        <div className="card-surface p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">Service List</p>
            <span className="badge">{items.length} items</span>
          </div>

          {loading && <p className="text-sm text-slate-500">Loading...</p>}

          {!loading && (
            <div className="overflow-auto rounded-xl border border-blue-100 bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-blue-50">
                  <tr className="text-xs uppercase tracking-[0.15em] text-slate-500">
                    <th className="px-4 py-3 font-medium">Service</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
              const isEditing = editingId === item.id;
              const draft = drafts[item.id];
              if (!draft) return null;
              return (
                    <tr key={item.id} className="border-t border-blue-100 align-top">
                      <td className="px-4 py-3">
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        value={draft.name}
                        onChange={(event) =>
                          setDrafts((prev) => ({ ...prev, [item.id]: { ...prev[item.id], name: event.target.value } }))
                        }
                        className="w-full rounded-lg border border-blue-100 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-gold-500"
                      />
                      <input
                        value={draft.category}
                        onChange={(event) =>
                          setDrafts((prev) => ({ ...prev, [item.id]: { ...prev[item.id], category: event.target.value } }))
                        }
                        className="w-full rounded-lg border border-blue-100 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-gold-500"
                        placeholder="Category"
                      />
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                    </div>
                  )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            value={draft.category}
                            onChange={(event) =>
                              setDrafts((prev) => ({ ...prev, [item.id]: { ...prev[item.id], category: event.target.value } }))
                            }
                            className="w-full rounded-lg border border-blue-100 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-gold-500"
                            placeholder="Category"
                          />
                        ) : (
                          <span className="text-slate-700">{item.category || 'General'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() =>
                            setDrafts((prev) => ({
                              ...prev,
                              [item.id]: { ...prev[item.id], is_active: prev[item.id].is_active === 1 ? 0 : 1 },
                            }))
                          }
                          className={`rounded-full border px-2.5 py-1 text-xs ${
                            draft.is_active === 1
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                              : 'border-slate-300 bg-slate-100 text-slate-600'
                          }`}
                        >
                          {draft.is_active === 1 ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(item.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-2 py-1 text-xs text-slate-800"
                    >
                      <Edit3 className="h-3 w-3" />
                      Edit
                    </button>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => onSave(item.id)}
                        disabled={savingId === item.id}
                        className="inline-flex items-center gap-1 rounded-lg bg-gold-500 px-2 py-1 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        <Save className="h-3 w-3" />
                        {savingId === item.id ? 'Saving...' : 'Save'}
                      </button>
                    )}
                        </div>
                      </td>
                    </tr>
              );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default ServiceCatalogPage;
