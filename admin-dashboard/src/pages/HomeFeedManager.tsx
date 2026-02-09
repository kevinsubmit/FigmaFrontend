import React, { useEffect, useMemo, useState } from 'react';
import { ImagePlus, Layers } from 'lucide-react';
import { toast } from 'react-toastify';

import { AdminLayout } from '../layout/AdminLayout';
import { TopBar } from '../layout/TopBar';
import { useAuth } from '../context/AuthContext';
import {
  createHomeFeedCategory,
  createHomeFeedImage,
  deleteHomeFeedCategory,
  deleteHomeFeedImage,
  getHomeFeedCategories,
  getHomeFeedImages,
  HomeFeedCategory,
  HomeFeedImage,
  updateHomeFeedCategory,
  updateHomeFeedImage,
  uploadHomeFeedImage,
} from '../api/homeFeed';

const HomeFeedManager: React.FC = () => {
  const { user } = useAuth();
  const [images, setImages] = useState<HomeFeedImage[]>([]);
  const [categories, setCategories] = useState<HomeFeedCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [editingImage, setEditingImage] = useState<HomeFeedImage | null>(null);
  const [imageForm, setImageForm] = useState({
    title: '',
    description: '',
    image_url: '',
    sort_order: 0,
    status: 'published',
    tag_ids: [] as number[],
  });

  const [editingCategory, setEditingCategory] = useState<HomeFeedCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    sort_order: 0,
    is_active: true,
  });

  const ensureSuperAdmin = useMemo(() => !!user?.is_admin, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [imageRows, categoryRows] = await Promise.all([
        getHomeFeedImages(),
        getHomeFeedCategories(),
      ]);
      setImages(imageRows);
      setCategories(categoryRows);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to load home feed data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ensureSuperAdmin) {
      loadData();
    }
  }, [ensureSuperAdmin]);

  const resetImageForm = () => {
    setEditingImage(null);
    setImageForm({
      title: '',
      description: '',
      image_url: '',
      sort_order: 0,
      status: 'published',
      tag_ids: [],
    });
  };

  const resetCategoryForm = () => {
    setEditingCategory(null);
    setCategoryForm({ name: '', sort_order: 0, is_active: true });
  };

  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const urls = await uploadHomeFeedImage(file);
      if (urls?.[0]) {
        setImageForm((prev) => ({ ...prev, image_url: urls[0] }));
      }
      toast.success('Image uploaded');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Upload failed');
    } finally {
      event.target.value = '';
    }
  };

  const saveImage = async () => {
    if (!imageForm.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!imageForm.image_url.trim()) {
      toast.error('Image is required');
      return;
    }
    setSavingImage(true);
    try {
      if (editingImage) {
        await updateHomeFeedImage(editingImage.id, imageForm);
        toast.success('Image updated');
      } else {
        await createHomeFeedImage(imageForm);
        toast.success('Image created');
      }
      await loadData();
      resetImageForm();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to save image');
    } finally {
      setSavingImage(false);
    }
  };

  const saveCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast.error('Category name is required');
      return;
    }
    setSavingCategory(true);
    try {
      if (editingCategory) {
        await updateHomeFeedCategory(editingCategory.id, categoryForm);
        toast.success('Category updated');
      } else {
        await createHomeFeedCategory(categoryForm);
        toast.success('Category created');
      }
      await loadData();
      resetCategoryForm();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to save category');
    } finally {
      setSavingCategory(false);
    }
  };

  const onEditImage = (image: HomeFeedImage) => {
    setEditingImage(image);
    setImageForm({
      title: image.title,
      description: image.description || '',
      image_url: image.image_url,
      sort_order: image.sort_order,
      status: image.status,
      tag_ids: image.tag_ids || [],
    });
  };

  const onEditCategory = (category: HomeFeedCategory) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      sort_order: category.sort_order,
      is_active: category.is_active,
    });
  };

  const onDeleteImage = async (id: number) => {
    if (!window.confirm('Delete this image?')) return;
    try {
      await deleteHomeFeedImage(id);
      setImages((prev) => prev.filter((item) => item.id !== id));
      toast.success('Image deleted');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Delete failed');
    }
  };

  const onDeleteCategory = async (id: number) => {
    if (!window.confirm('Disable this category?')) return;
    try {
      await deleteHomeFeedCategory(id);
      await loadData();
      toast.success('Category disabled');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Operation failed');
    }
  };

  const filteredImages = useMemo(() => {
    return images.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && !(item.tag_ids || []).includes(Number(categoryFilter))) return false;
      if (search.trim() && !`${item.title} ${item.description || ''}`.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });
  }, [images, statusFilter, categoryFilter, search]);

  if (!ensureSuperAdmin) {
    return (
      <AdminLayout>
        <TopBar title="Home Feed" />
        <div className="px-4 py-6 text-sm text-rose-300">Only super admin can manage homepage feed.</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <TopBar title="Home Feed" />
      <div className="px-4 py-6 space-y-4">
        <div className="card-surface p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ImagePlus className="h-4 w-4 text-gold-500" />
            <span>{editingImage ? 'Edit Image' : 'Create Image'}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input
              value={imageForm.title}
              onChange={(e) => setImageForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Title"
              className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm outline-none focus:border-gold-500"
            />
            <input
              value={imageForm.description}
              onChange={(e) => setImageForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Subtitle / Description"
              className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm outline-none focus:border-gold-500"
            />
            <select
              value={imageForm.status}
              onChange={(e) => setImageForm((prev) => ({ ...prev, status: e.target.value }))}
              className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm outline-none focus:border-gold-500"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="offline">Offline</option>
            </select>
            <input
              type="number"
              value={imageForm.sort_order}
              onChange={(e) => setImageForm((prev) => ({ ...prev, sort_order: Number(e.target.value) || 0 }))}
              placeholder="Sort order"
              className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm outline-none focus:border-gold-500"
            />
          </div>
          <div className="space-y-2">
            <input type="file" accept="image/png,image/jpeg" onChange={uploadImage} />
            <input
              value={imageForm.image_url}
              onChange={(e) => setImageForm((prev) => ({ ...prev, image_url: e.target.value }))}
              placeholder="Image URL"
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm outline-none focus:border-gold-500"
            />
            {imageForm.image_url && (
              <img src={imageForm.image_url} alt="preview" className="h-24 w-24 rounded-lg object-cover border border-neutral-800" />
            )}
          </div>
          <div className="space-y-2">
            <p className="text-xs text-gray-400">Categories (multi-select)</p>
            <div className="flex flex-wrap gap-2">
              {categories
                .filter((item) => item.is_active)
                .map((category) => {
                  const active = imageForm.tag_ids.includes(category.id);
                  return (
                    <button
                      key={category.id}
                      onClick={() =>
                        setImageForm((prev) => ({
                          ...prev,
                          tag_ids: active
                            ? prev.tag_ids.filter((id) => id !== category.id)
                            : [...prev.tag_ids, category.id],
                        }))
                      }
                      className={`rounded-full px-3 py-1 text-xs border ${
                        active
                          ? 'border-gold-500/60 bg-gold-500/20 text-gold-200'
                          : 'border-neutral-700 text-neutral-300'
                      }`}
                    >
                      {category.name}
                    </button>
                  );
                })}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={saveImage}
              disabled={savingImage}
              className="rounded-xl border border-gold-500/60 px-4 py-2 text-sm text-gold-200 disabled:opacity-50"
            >
              {savingImage ? 'Saving...' : editingImage ? 'Update Image' : 'Create Image'}
            </button>
            <button onClick={resetImageForm} className="rounded-xl border border-neutral-700 px-4 py-2 text-sm text-neutral-300">
              Reset
            </button>
          </div>
        </div>

        <div className="card-surface p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Layers className="h-4 w-4 text-gold-500" />
            <span>{editingCategory ? 'Edit Category' : 'Create Category'}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input
              value={categoryForm.name}
              onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Category name"
              className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm outline-none focus:border-gold-500"
            />
            <input
              type="number"
              value={categoryForm.sort_order}
              onChange={(e) => setCategoryForm((prev) => ({ ...prev, sort_order: Number(e.target.value) || 0 }))}
              placeholder="Sort order"
              className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm outline-none focus:border-gold-500"
            />
            <label className="inline-flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm">
              <input
                type="checkbox"
                checked={categoryForm.is_active}
                onChange={(e) => setCategoryForm((prev) => ({ ...prev, is_active: e.target.checked }))}
              />
              Active
            </label>
          </div>
          <div className="flex gap-2">
            <button
              onClick={saveCategory}
              disabled={savingCategory}
              className="rounded-xl border border-gold-500/60 px-4 py-2 text-sm text-gold-200 disabled:opacity-50"
            >
              {savingCategory ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}
            </button>
            <button onClick={resetCategoryForm} className="rounded-xl border border-neutral-700 px-4 py-2 text-sm text-neutral-300">
              Reset
            </button>
          </div>
          <div className="space-y-2 pt-2">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center justify-between rounded-lg border border-neutral-800 px-3 py-2">
                <div className="text-sm">
                  <span className="font-medium">{category.name}</span>
                  <span className="ml-2 text-xs text-gray-500">
                    sort={category.sort_order} {category.is_active ? 'active' : 'inactive'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onEditCategory(category)}
                    className="rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-300"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDeleteCategory(category.id)}
                    className="rounded border border-rose-500/50 px-2 py-1 text-xs text-rose-200"
                  >
                    Disable
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-surface p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title/description"
              className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm outline-none focus:border-gold-500"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm outline-none focus:border-gold-500"
            >
              <option value="all">All status</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="offline">Offline</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm outline-none focus:border-gold-500"
            >
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <button onClick={loadData} className="rounded-xl border border-gold-500/50 px-3 py-2.5 text-sm text-gold-200">
              Refresh
            </button>
          </div>
          {loading ? (
            <div className="text-sm text-gray-500">Loading...</div>
          ) : (
            <div className="space-y-2">
              {filteredImages.map((item) => (
                <div key={item.id} className="flex flex-col gap-2 rounded-xl border border-neutral-800 p-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={item.image_url} alt={item.title} className="h-16 w-16 rounded-lg object-cover border border-neutral-800" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{item.title}</p>
                      <p className="truncate text-xs text-gray-500">{item.description || '-'}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        status={item.status} | sort={item.sort_order} | categories={item.tags.join(', ') || '-'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEditImage(item)}
                      className="rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-300"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDeleteImage(item.id)}
                      className="rounded border border-rose-500/50 px-2 py-1 text-xs text-rose-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {!filteredImages.length && <div className="text-sm text-gray-500">No images found.</div>}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default HomeFeedManager;
