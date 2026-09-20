import { useEffect, useState, type FormEvent } from 'react';
import { Save, Store } from 'lucide-react';
import { api } from '../lib/api';
import type { Settings } from '../types';
import { refreshSettingsCache } from '../lib/useSettings';
import { useToast } from '../store/ToastContext';
import { Field, Loading } from '../components/ui';
import { useI18n } from '../i18n';

export default function AdminSettings() {
  const toast = useToast();
  const { t } = useI18n();
  const [form, setForm] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.admin.settings().then(setForm).catch(() => {});
  }, []);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      const s = await api.admin.updateSettings(form);
      setForm(s);
      refreshSettingsCache(s);
      toast.success(t('admin.settings.saveOk'));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (!form) return <Loading />;

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold">{t('admin.nav.settings')}</h1>
      <p className="mt-1 text-sm text-ink-500">{t('admin.settings.sub')}</p>

      <form onSubmit={save} className="card mt-5 max-w-3xl p-6">
        <div className="flex items-center gap-2 border-b border-ink-100 pb-4">
          <Store className="h-5 w-5 text-brand-600" />
          <h2 className="font-heading text-base font-bold">{t('admin.settings.base')}</h2>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label={t('admin.settings.siteName')}>
            <input
              className="input"
              value={form.siteName}
              onChange={(e) => setForm({ ...form, siteName: e.target.value })}
            />
          </Field>
          <Field label={t('admin.settings.slogan')}>
            <input
              className="input"
              value={form.slogan}
              onChange={(e) => setForm({ ...form, slogan: e.target.value })}
            />
          </Field>
          <Field label={t('admin.settings.currency')}>
            <select
              className="input cursor-pointer"
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            >
              <option value="CNY">{t('admin.settings.currencyCNY')}</option>
              <option value="USD">{t('admin.settings.currencyUSD')}</option>
            </select>
          </Field>
          <Field label={t('admin.settings.shippingFee')}>
            <input
              type="number"
              min={0}
              step="0.01"
              className="input"
              value={form.shippingFee}
              onChange={(e) => setForm({ ...form, shippingFee: Number(e.target.value) })}
            />
          </Field>
          <Field label={t('admin.settings.freeShipThreshold')}>
            <input
              type="number"
              min={0}
              step="0.01"
              className="input"
              value={form.freeShippingThreshold}
              onChange={(e) =>
                setForm({ ...form, freeShippingThreshold: Number(e.target.value) })
              }
            />
          </Field>
          <Field label={t('admin.settings.supportPhone')}>
            <input
              className="input"
              value={form.supportPhone}
              onChange={(e) => setForm({ ...form, supportPhone: e.target.value })}
            />
          </Field>
          <Field label={t('admin.settings.supportEmail')}>
            <input
              className="input"
              value={form.supportEmail}
              onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
            />
          </Field>
        </div>

        <button type="submit" disabled={saving} className="btn-primary mt-6">
          <Save className="h-4 w-4" /> {saving ? t('admin.saving') : t('admin.settings.saveBtn')}
        </button>
      </form>
    </div>
  );
}
