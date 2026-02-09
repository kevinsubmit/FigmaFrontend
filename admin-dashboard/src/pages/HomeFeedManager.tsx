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
  HomeFeedThemeSetting,
  updateHomeFeedCategory,
  updateHomeFeedImage,
  updateHomeFeedThemeSetting,
  uploadHomeFeedImage,
  getHomeFeedThemeSetting,
} from '../api/homeFeed';

const HomeFeedManager: React.FC = () => {
  const { user } = useAuth();
  const [images, setImages] = useState<HomeFeedImage[]>([]);
  const [categories, setCategories] = useState<HomeFeedCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [categoryListScope, setCategoryListScope] = useState<'all' | 'home'>('all');

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
    show_on_home: true,
  });
  const [themeSetting, setThemeSetting] = useState<HomeFeedThemeSetting | null>(null);
  const [themeForm, setThemeForm] = useState({
    enabled: false,
    tag_id: '',
    start_at: '',
    end_at: '',
  });

  const ensureSuperAdmin = useMemo(() => !!user?.is_admin, [user]);

  const normalizeCategory = (category: HomeFeedCategory): HomeFeedCategory => ({
    ...category,
    show_on_home: category.show_on_home ?? true,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [imageRows, categoryRows] = await Promise.all([
        getHomeFeedImages(),
        getHomeFeedCategories(),
      ]);
      const theme = await getHomeFeedThemeSetting();
      setImages(imageRows);
      setCategories(categoryRows.map(normalizeCategory));
      setThemeSetting(theme);
      setThemeForm({
        enabled: theme.enabled,
        tag_id: theme.tag_id ? String(theme.tag_id) : '',
        start_at: theme.start_at ? String(theme.start_at).slice(0, 16) : '',
        end_at: theme.end_at ? String(theme.end_at).slice(0, 16) : '',
      });
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
    setCategoryForm({ name: '', sort_order: 0, is_active: true, show_on_home: true });
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
    const normalized = normalizeCategory(category);
    setEditingCategory(category);
    setCategoryForm({
      name: normalized.name,
      sort_order: normalized.sort_order,
      is_active: normalized.is_active,
      show_on_home: normalized.show_on_home,
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

  const quickSetImageStatus = async (image: HomeFeedImage, nextStatus: 'draft' | 'published' | 'offline') => {
    if (image.status === nextStatus) return;
    try {
      await updateHomeFeedImage(image.id, {
        title: image.title,
        description: image.description || '',
        image_url: image.image_url,
        sort_order: image.sort_order,
        status: nextStatus,
        tag_ids: image.tag_ids || [],
      });
      setImages((prev) =>
        prev.map((item) => (item.id === image.id ? { ...item, status: nextStatus } : item)),
      );
      toast.success(`状态已更新为 ${nextStatus}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to update image status');
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

  const saveThemeSetting = async () => {
    setSavingTheme(true);
    try {
      const payload = {
        enabled: themeForm.enabled,
        tag_id: themeForm.tag_id ? Number(themeForm.tag_id) : null,
        start_at: themeForm.start_at ? new Date(themeForm.start_at).toISOString() : null,
        end_at: themeForm.end_at ? new Date(themeForm.end_at).toISOString() : null,
      };
      const updated = await updateHomeFeedThemeSetting(payload);
      setThemeSetting(updated);
      toast.success('专题模式已保存');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to save theme setting');
    } finally {
      setSavingTheme(false);
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

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.id - b.id;
    });
  }, [categories]);

  const homeVisibleCategories = useMemo(() => {
    return sortedCategories.filter((item) => item.is_active && item.show_on_home);
  }, [sortedCategories]);

  const visibleCategoryRows = useMemo(() => {
    if (categoryListScope === 'home') {
      return sortedCategories.filter((item) => item.show_on_home);
    }
    return sortedCategories;
  }, [categoryListScope, sortedCategories]);

  const moveCategory = async (categoryId: number, direction: 'up' | 'down') => {
    const index = sortedCategories.findIndex((item) => item.id === categoryId);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sortedCategories.length) return;

    const reordered = [...sortedCategories];
    const current = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = current;

    const payloadList = reordered.map((item, idx) => ({
      id: item.id,
      name: item.name,
      is_active: item.is_active,
      show_on_home: item.show_on_home,
      sort_order: (idx + 1) * 10,
    }));

    try {
      await Promise.all(payloadList.map((item) => updateHomeFeedCategory(item.id, item)));
      setCategories((prev) =>
        prev.map((item) => {
          const next = payloadList.find((row) => row.id === item.id);
          if (!next) return item;
          return { ...item, sort_order: next.sort_order };
        }),
      );
      toast.success('标签顺序已更新');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to update category order');
    }
  };

  if (!ensureSuperAdmin) {
    return (
      <AdminLayout>
        <TopBar title="首页图片流管理" subtitle="仅超管可访问" />
        <div className="px-4 py-6 text-sm text-slate-900">Only super admin can manage homepage feed.</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <TopBar title="首页图片流管理" subtitle="统一配置首页图片、分类和专题模式" />
      <div className="px-4 py-5 space-y-4 lg:px-6">
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
              className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm outline-none focus:border-gold-500"
            />
            <input
              value={imageForm.description}
              onChange={(e) => setImageForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Subtitle / Description"
              className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm outline-none focus:border-gold-500"
            />
            <select
              value={imageForm.status}
              onChange={(e) => setImageForm((prev) => ({ ...prev, status: e.target.value }))}
              className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm outline-none focus:border-gold-500"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="offline">Offline</option>
            </select>
            <div className="space-y-1">
              <input
                type="number"
                value={imageForm.sort_order}
                onChange={(e) => setImageForm((prev) => ({ ...prev, sort_order: Number(e.target.value) || 0 }))}
                placeholder="排序值（越小越靠前）"
                className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm outline-none focus:border-gold-500"
              />
              <p className="text-xs text-slate-900">中文提示：排序值越小，首页展示越靠前。</p>
            </div>
          </div>
          <div className="space-y-2">
            <input type="file" accept="image/png,image/jpeg" onChange={uploadImage} />
            <input
              value={imageForm.image_url}
              onChange={(e) => setImageForm((prev) => ({ ...prev, image_url: e.target.value }))}
              placeholder="Image URL"
              className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm outline-none focus:border-gold-500"
            />
            {imageForm.image_url && (
              <img src={imageForm.image_url} alt="preview" className="h-24 w-24 rounded-lg object-cover border border-blue-100" />
            )}
          </div>
          <div className="space-y-2">
            <p className="text-xs text-slate-900">Categories (multi-select)</p>
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
                          ? 'border-gold-500/60 bg-gold-500/20 text-slate-900'
                          : 'border-blue-200 text-slate-900'
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
              className="rounded-xl border border-gold-500/60 px-4 py-2 text-sm text-slate-900 disabled:opacity-50"
            >
              {savingImage ? 'Saving...' : editingImage ? 'Update Image' : 'Create Image'}
            </button>
            <button onClick={resetImageForm} className="rounded-xl border border-blue-200 px-4 py-2 text-sm text-slate-900">
              Reset
            </button>
          </div>
        </div>

        <div className="card-surface p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Layers className="h-4 w-4 text-gold-500" />
            <span>{editingCategory ? 'Edit Category' : 'Create Category'}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input
              value={categoryForm.name}
              onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Category name"
              className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm outline-none focus:border-gold-500"
            />
            <input
              type="number"
              value={categoryForm.sort_order}
              onChange={(e) => setCategoryForm((prev) => ({ ...prev, sort_order: Number(e.target.value) || 0 }))}
              placeholder="Sort order"
              className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm outline-none focus:border-gold-500"
            />
            <label className="inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm">
              <input
                type="checkbox"
                checked={categoryForm.is_active}
                onChange={(e) => setCategoryForm((prev) => ({ ...prev, is_active: e.target.checked }))}
              />
              Active
            </label>
            <label className="inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm">
              <input
                type="checkbox"
                checked={categoryForm.show_on_home}
                onChange={(e) => setCategoryForm((prev) => ({ ...prev, show_on_home: e.target.checked }))}
              />
              首页标签显示
            </label>
          </div>
          <div className="flex gap-2">
            <button
              onClick={saveCategory}
              disabled={savingCategory}
              className="rounded-xl border border-gold-500/60 px-4 py-2 text-sm text-slate-900 disabled:opacity-50"
            >
              {savingCategory ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}
            </button>
            <button onClick={resetCategoryForm} className="rounded-xl border border-blue-200 px-4 py-2 text-sm text-slate-900">
              Reset
            </button>
          </div>
          <div className="rounded-xl border border-blue-100 bg-white/40 p-3">
            <p className="text-xs text-slate-900">首页标签顺序预览（仅展示 active + 首页显示）</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {homeVisibleCategories.length ? (
                homeVisibleCategories.map((category, index) => (
                  <span
                    key={category.id}
                    className="rounded-full border border-gold-500/40 bg-gold-500/10 px-3 py-1 text-xs text-slate-900"
                  >
                    {index + 1}. {category.name}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-900">暂无首页可见标签</span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-900">分类列表</p>
            <div className="inline-flex rounded-lg border border-blue-200 p-1">
              <button
                onClick={() => setCategoryListScope('all')}
                className={`rounded px-2 py-1 text-xs ${categoryListScope === 'all' ? 'bg-blue-100 text-slate-900' : 'text-slate-900'}`}
              >
                全部
              </button>
              <button
                onClick={() => setCategoryListScope('home')}
                className={`rounded px-2 py-1 text-xs ${categoryListScope === 'home' ? 'bg-blue-100 text-slate-900' : 'text-slate-900'}`}
              >
                仅首页显示
              </button>
            </div>
          </div>
          <div className="space-y-2 pt-2">
            {visibleCategoryRows.map((category, index) => (
              <div key={category.id} className="flex items-center justify-between rounded-lg border border-blue-100 px-3 py-2">
                <div className="text-sm">
                  <span className="font-medium">{category.name}</span>
                  <span className="ml-2 text-xs text-slate-900">
                    sort={category.sort_order} {category.is_active ? 'active' : 'inactive'} {category.show_on_home ? '| home-visible' : '| home-hidden'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={index === 0 || categoryListScope === 'home'}
                    onClick={() => moveCategory(category.id, 'up')}
                    className="rounded border border-blue-200 px-2 py-1 text-xs text-slate-900 disabled:opacity-40"
                  >
                    ↑
                  </button>
                  <button
                    disabled={index === visibleCategoryRows.length - 1 || categoryListScope === 'home'}
                    onClick={() => moveCategory(category.id, 'down')}
                    className="rounded border border-blue-200 px-2 py-1 text-xs text-slate-900 disabled:opacity-40"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => onEditCategory(category)}
                    className="rounded border border-blue-200 px-2 py-1 text-xs text-slate-900"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDeleteCategory(category.id)}
                    className="rounded border border-rose-500/50 px-2 py-1 text-xs text-slate-900"
                  >
                    Disable
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-surface p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Layers className="h-4 w-4 text-gold-500" />
            <span>首页专题模式（按分类聚合）</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <label className="inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm">
              <input
                type="checkbox"
                checked={themeForm.enabled}
                onChange={(e) => setThemeForm((prev) => ({ ...prev, enabled: e.target.checked }))}
              />
              启用专题模式
            </label>
            <select
              value={themeForm.tag_id}
              onChange={(e) => setThemeForm((prev) => ({ ...prev, tag_id: e.target.value }))}
              className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm outline-none focus:border-gold-500"
            >
              <option value="">选择专题分类</option>
              {categories
                .filter((item) => item.is_active)
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
            </select>
            <input
              type="datetime-local"
              value={themeForm.start_at}
              onChange={(e) => setThemeForm((prev) => ({ ...prev, start_at: e.target.value }))}
              className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm outline-none focus:border-gold-500"
            />
            <input
              type="datetime-local"
              value={themeForm.end_at}
              onChange={(e) => setThemeForm((prev) => ({ ...prev, end_at: e.target.value }))}
              className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm outline-none focus:border-gold-500"
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-900">
              中文提示：启用后，H5 首页默认只展示所选分类图片；可设置起止时间，到期自动恢复普通模式。
            </p>
            <button
              onClick={saveThemeSetting}
              disabled={savingTheme}
              className="rounded-xl border border-gold-500/60 px-4 py-2 text-sm text-slate-900 disabled:opacity-50"
            >
              {savingTheme ? 'Saving...' : '保存专题设置'}
            </button>
          </div>
          <p className="text-xs text-slate-900">
            当前状态：{themeSetting?.active ? `生效中（${themeSetting.tag_name || '-'}）` : '未生效'}
          </p>
        </div>

        <div className="card-surface p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title/description"
              className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm outline-none focus:border-gold-500"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm outline-none focus:border-gold-500"
            >
              <option value="all">All status</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="offline">Offline</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm outline-none focus:border-gold-500"
            >
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <button onClick={loadData} className="rounded-xl border border-gold-500/50 px-3 py-2.5 text-sm text-slate-900">
              Refresh
            </button>
          </div>
          {loading ? (
            <div className="text-sm text-slate-900">Loading...</div>
          ) : (
            <div className="space-y-2">
              {filteredImages.map((item) => (
                <div key={item.id} className="flex flex-col gap-2 rounded-xl border border-blue-100 p-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={item.image_url} alt={item.title} className="h-16 w-16 rounded-lg object-cover border border-blue-100" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{item.title}</p>
                      <p className="truncate text-xs text-slate-900">{item.description || '-'}</p>
                      <p className="text-xs text-slate-900 mt-1">
                        status={item.status} | sort={item.sort_order} | categories={item.tags.join(', ') || '-'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEditImage(item)}
                      className="rounded border border-blue-200 px-2 py-1 text-xs text-slate-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => quickSetImageStatus(item, 'published')}
                      className="rounded border border-emerald-500/40 px-2 py-1 text-xs text-slate-900"
                    >
                      Publish
                    </button>
                    <button
                      onClick={() => quickSetImageStatus(item, 'offline')}
                      className="rounded border border-amber-500/40 px-2 py-1 text-xs text-slate-900"
                    >
                      Offline
                    </button>
                    <button
                      onClick={() => quickSetImageStatus(item, 'draft')}
                      className="rounded border border-blue-300 px-2 py-1 text-xs text-slate-900"
                    >
                      Draft
                    </button>
                    <button
                      onClick={() => onDeleteImage(item.id)}
                      className="rounded border border-rose-500/50 px-2 py-1 text-xs text-slate-900"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {!filteredImages.length && <div className="text-sm text-slate-900">No images found.</div>}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default HomeFeedManager;
