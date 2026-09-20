import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import type { Category, Product } from '../types';
import { formatDate } from '../lib/format';
import { useToast } from '../store/ToastContext';
import ProductThumb from '../components/ProductThumb';
import { Field, Loading, Modal } from '../components/ui';
import { pickLocalized, useI18n } from '../i18n';

const ICON_OPTIONS = [
  'smartphone',
  'laptop',
  'headphones',
  'watch',
  'camera',
  'shirt',
  'home',
  'coffee',
  'gift',
  'gamepad',
  'book',
  'dumbbell',
  'cpu',
  'package',
];

const EMPTY: Partial<Product> = {
  name: '',
  subtitle: '',
  description: '',
  categoryId: '',
  price: 99,
  originalPrice: 129,
  stock: 100,
  hue: 265,
  icon: 'package',
  status: 'on',
  featured: false,
};

export default function AdminProducts() {
  const toast = useToast();
  const { t, money, pick, locale } = useI18n();
  const [list, setList] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([api.admin.products(), api.categories()]);
      setList(p);
      setCategories(c);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return list.filter((p) => {
      if (statusFilter && p.status !== statusFilter) return false;
      if (!kw) return true;
      const haystack = [pickLocalized(p, 'name', locale), pickLocalized(p, 'subtitle', locale)]
        .join(' ')
        .toLowerCase();
      return haystack.includes(kw);
    });
  }, [list, keyword, statusFilter]);

  const openNew = () => {
    setIsNew(true);
    setEditing({ ...EMPTY, categoryId: categories[0]?.id || '' });
  };

  const openEdit = (p: Product) => {
    setIsNew(false);
    setEditing({ ...p });
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.name?.trim()) return toast.error(t('admin.products.errName'));
    if (!editing.categoryId) return toast.error(t('admin.products.errCategory'));
    setSaving(true);
    try {
      if (isNew) await api.admin.createProduct(editing);
      else await api.admin.updateProduct(editing.id!, editing);
      toast.success(isNew ? t('admin.products.created') : t('admin.products.updated'));
      setEditing(null);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (p: Product) => {
    try {
      await api.admin.updateProduct(p.id, { status: p.status === 'on' ? 'off' : 'on' });
      toast.success(
        p.status === 'on' ? t('admin.products.toggleOff') : t('admin.products.toggleOn')
      );
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await api.admin.deleteProduct(deleting.id);
      toast.success(t('admin.products.deleted'));
      setDeleting(null);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">{t('admin.nav.products')}</h1>
          <p className="mt-1 text-sm text-ink-500">
            {t('admin.products.sub', { count: list.length })}
          </p>
        </div>
        <button type="button" onClick={openNew} className="btn-primary">
          <Plus className="h-4 w-4" /> {t('admin.products.create')}
        </button>
      </div>

      <div className="card mt-5 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-ink-100 p-4">
          <div className="relative flex-1 min-w-52">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              className="input pl-9"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={t('admin.products.searchPlaceholder')}
              aria-label={t('admin.products.searchAria')}
            />
          </div>
          <select
            className="input w-32 cursor-pointer"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label={t('admin.products.statusFilterAria')}
          >
            <option value="">{t('admin.filter.allStatus')}</option>
            <option value="on">{t('admin.status.on')}</option>
            <option value="off">{t('admin.status.off')}</option>
          </select>
        </div>

        {loading ? (
          <Loading />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead className="bg-ink-50 text-left text-xs uppercase text-ink-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">{t('admin.table.product')}</th>
                  <th className="px-4 py-3 font-semibold">{t('admin.table.category')}</th>
                  <th className="px-4 py-3 font-semibold">{t('admin.table.price')}</th>
                  <th className="px-4 py-3 font-semibold">{t('admin.table.stock')}</th>
                  <th className="px-4 py-3 font-semibold">{t('admin.table.sales')}</th>
                  <th className="px-4 py-3 font-semibold">{t('admin.table.status')}</th>
                  <th className="px-4 py-3 font-semibold">{t('admin.table.createdAt')}</th>
                  <th className="px-4 py-3 text-right font-semibold">{t('admin.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-ink-50/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ProductThumb
                          hue={p.hue}
                          icon={p.icon}
                          className="h-10 w-10 rounded-lg"
                          iconClassName="h-5 w-5"
                        />
                        <div className="min-w-0">
                          <p className="max-w-52 truncate font-semibold">{pick(p, 'name')}</p>
                          <p className="max-w-52 truncate text-xs text-ink-400">
                            {pick(p, 'subtitle')}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-600">
                      {pick(categories.find((c) => c.id === p.categoryId), 'name') || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold">{money(p.price)}</span>
                      {p.originalPrice > p.price && (
                        <span className="ml-1 text-xs text-ink-400 line-through">
                          {money(p.originalPrice)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={p.stock < 10 ? 'font-bold text-danger' : ''}>{p.stock}</span>
                    </td>
                    <td className="px-4 py-3 text-ink-600">{p.sales}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggleStatus(p)}
                        className={`badge cursor-pointer ${
                          p.status === 'on'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-ink-100 text-ink-500'
                        }`}
                      >
                        {p.status === 'on' ? t('admin.status.on') : t('admin.status.off')}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-500">
                      {formatDate(p.createdAt, false)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          aria-label={t('admin.editItemAria', { name: pick(p, 'name') })}
                          className="cursor-pointer rounded-lg p-2 text-ink-500 transition-colors hover:bg-brand-50 hover:text-brand-700"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(p)}
                          aria-label={t('admin.deleteItemAria', { name: pick(p, 'name') })}
                          className="cursor-pointer rounded-lg p-2 text-ink-500 transition-colors hover:bg-red-50 hover:text-danger"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-sm text-ink-400">
                      {t('admin.products.empty')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={!!editing}
        title={isNew ? t('admin.products.create') : t('admin.products.edit')}
        onClose={() => setEditing(null)}
        footer={
          <>
            <button type="button" onClick={() => setEditing(null)} className="btn-secondary">
              {t('common.cancel')}
            </button>
            <button type="button" onClick={save} disabled={saving} className="btn-primary">
              {saving ? t('admin.saving') : t('admin.save')}
            </button>
          </>
        }
      >
        {editing && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label={t('admin.form.name')}>
                <input
                  className="input"
                  value={editing.name || ''}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label={t('admin.form.subtitle')}>
                <input
                  className="input"
                  value={editing.subtitle || ''}
                  onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })}
                />
              </Field>
            </div>
            <Field label={t('admin.table.category')}>
              <select
                className="input cursor-pointer"
                value={editing.categoryId || ''}
                onChange={(e) => setEditing({ ...editing, categoryId: e.target.value })}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {pick(c, 'name')}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('admin.form.icon')}>
              <select
                className="input cursor-pointer"
                value={editing.icon || 'package'}
                onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
              >
                {ICON_OPTIONS.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('admin.form.price')}>
              <input
                type="number"
                min={0}
                step="0.01"
                className="input"
                value={editing.price ?? 0}
                onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })}
              />
            </Field>
            <Field label={t('admin.form.originalPrice')}>
              <input
                type="number"
                min={0}
                step="0.01"
                className="input"
                value={editing.originalPrice ?? 0}
                onChange={(e) => setEditing({ ...editing, originalPrice: Number(e.target.value) })}
              />
            </Field>
            <Field label={t('admin.form.stock')}>
              <input
                type="number"
                min={0}
                className="input"
                value={editing.stock ?? 0}
                onChange={(e) => setEditing({ ...editing, stock: Number(e.target.value) })}
              />
            </Field>
            <Field label={t('admin.form.hue')}>
              <input
                type="number"
                min={0}
                max={360}
                className="input"
                value={editing.hue ?? 265}
                onChange={(e) => setEditing({ ...editing, hue: Number(e.target.value) })}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label={t('admin.form.description')}>
                <textarea
                  className="input min-h-24"
                  value={editing.description || ''}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </Field>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 cursor-pointer accent-brand-600"
                checked={editing.status === 'on'}
                onChange={(e) =>
                  setEditing({ ...editing, status: e.target.checked ? 'on' : 'off' })
                }
              />
              {t('admin.form.publishNow')}
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 cursor-pointer accent-brand-600"
                checked={!!editing.featured}
                onChange={(e) => setEditing({ ...editing, featured: e.target.checked })}
              />
              {t('admin.form.featured')}
            </label>
          </div>
        )}
      </Modal>

      <Modal
        open={!!deleting}
        title={t('admin.products.deleteTitle')}
        width="max-w-sm"
        onClose={() => setDeleting(null)}
        footer={
          <>
            <button type="button" onClick={() => setDeleting(null)} className="btn-secondary">
              {t('common.cancel')}
            </button>
            <button type="button" onClick={confirmDelete} className="btn-danger">
              {t('admin.products.deleteOk')}
            </button>
          </>
        }
      >
        <p className="text-sm text-ink-600">
          {t('admin.products.deleteConfirm', { name: pick(deleting, 'name') })}
        </p>
      </Modal>
    </div>
  );
}
