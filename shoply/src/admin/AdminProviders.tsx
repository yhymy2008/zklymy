import { useEffect, useState } from 'react';
import { CheckCircle2, CreditCard, Pencil, PlugZap, Power } from 'lucide-react';
import { api } from '../lib/api';
import type { PaymentProvider } from '../types';
import { formatDate, maskSecret } from '../lib/format';
import { useToast } from '../store/ToastContext';
import { Field, Loading, Modal, Spinner } from '../components/ui';
import { useI18n } from '../i18n';

const CODE_PRESETS = ['alipay', 'wechat', 'unionpay', 'stripe', 'paypal', 'balance'];

export default function AdminProviders() {
  const toast = useToast();
  const { t, pick } = useI18n();
  const [list, setList] = useState<PaymentProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PaymentProvider | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      setList(await api.admin.providers());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleEnabled = async (p: PaymentProvider) => {
    try {
      await api.admin.updateProvider(p.id, { enabled: !p.enabled });
      toast.success(
        p.enabled
          ? t('admin.providers.toggleOff', { name: pick(p, 'name') })
          : t('admin.providers.toggleOn', { name: pick(p, 'name') })
      );
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const test = async (p: PaymentProvider) => {
    setTesting(p.id);
    try {
      const r = await api.admin.testProvider(p.id);
      r.ok ? toast.success(r.message) : toast.error(r.message);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setTesting('');
    }
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim()) return toast.error(t('admin.providers.errName'));
    setSaving(true);
    try {
      await api.admin.updateProvider(editing.id, {
        name: editing.name,
        code: editing.code,
        enabled: editing.enabled,
        mode: editing.mode,
        appId: editing.appId,
        merchantId: editing.merchantId,
        secret: editing.secret,
        feeRate: Number(editing.feeRate) || 0,
        sort: Number(editing.sort) || 0,
        description: editing.description,
      });
      toast.success(t('admin.providers.saved'));
      setEditing(null);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">{t('admin.nav.providers')}</h1>
          <p className="mt-1 text-sm text-ink-500">{t('admin.providers.sub')}</p>
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {list.map((p) => (
            <div key={p.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                      p.enabled
                        ? 'bg-brand-50 text-brand-700'
                        : 'bg-ink-100 text-ink-400'
                    }`}
                  >
                    <CreditCard className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="font-heading text-base font-bold">{pick(p, 'name')}</h2>
                    <p className="text-xs text-ink-500">
                      {t('admin.providers.code', { code: p.code })}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleEnabled(p)}
                  className={`badge cursor-pointer ${
                    p.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-ink-100 text-ink-500'
                  }`}
                >
                  <Power className="h-3.5 w-3.5" />
                  {p.enabled ? t('admin.providers.enabled') : t('admin.providers.disabled')}
                </button>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-ink-500">
                {pick(p, 'description')}
              </p>

              <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-500">{t('admin.providers.env')}</dt>
                  <dd className="font-semibold">
                    {p.mode === 'sandbox'
                      ? t('admin.providers.sandbox')
                      : t('admin.providers.live')}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-500">{t('admin.providers.feeRate')}</dt>
                  <dd className="font-semibold">{(p.feeRate || 0).toFixed(2)}%</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-500">AppID</dt>
                  <dd className="truncate font-semibold">{p.appId || '-'}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-500">{t('admin.providers.merchantId')}</dt>
                  <dd className="truncate font-semibold">{p.merchantId || '-'}</dd>
                </div>
                <div className="flex justify-between gap-2 sm:col-span-2">
                  <dt className="text-ink-500">{t('admin.providers.secret')}</dt>
                  <dd className="font-semibold">{maskSecret(p.secret) || '-'}</dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditing({ ...p })}
                  className="btn-secondary px-3 py-1.5 text-xs"
                >
                  <Pencil className="h-3.5 w-3.5" /> {t('admin.providers.config')}
                </button>
                <button
                  type="button"
                  disabled={testing === p.id}
                  onClick={() => test(p)}
                  className="btn-secondary px-3 py-1.5 text-xs"
                >
                  {testing === p.id ? (
                    <Spinner className="h-3.5 w-3.5" />
                  ) : (
                    <PlugZap className="h-3.5 w-3.5" />
                  )}
                  {t('admin.providers.test')}
                </button>
                <span className="ml-auto text-xs text-ink-400">
                  {t('admin.providers.updatedAt', { date: formatDate(p.updatedAt) })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!editing}
        title={t('admin.providers.configTitle', { name: pick(editing, 'name') || '' })}
        onClose={() => setEditing(null)}
        footer={
          <>
            <button type="button" onClick={() => setEditing(null)} className="btn-secondary">
              {t('common.cancel')}
            </button>
            <button type="button" onClick={save} disabled={saving} className="btn-primary">
              {saving ? t('admin.saving') : t('admin.settings.saveBtn')}
            </button>
          </>
        }
      >
        {editing && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('admin.providers.name')}>
              <input
                className="input"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </Field>
            <Field label={t('admin.providers.codeLabel')}>
              <select
                className="input cursor-pointer"
                value={editing.code}
                onChange={(e) => setEditing({ ...editing, code: e.target.value })}
              >
                {CODE_PRESETS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('admin.providers.mode')}>
              <select
                className="input cursor-pointer"
                value={editing.mode}
                onChange={(e) =>
                  setEditing({ ...editing, mode: e.target.value as 'sandbox' | 'live' })
                }
              >
                <option value="sandbox">{t('checkout.mode.sandbox')}</option>
                <option value="live">{t('checkout.mode.production')}</option>
              </select>
            </Field>
            <Field label={t('admin.providers.feeRatePct')}>
              <input
                type="number"
                min={0}
                max={100}
                step="0.01"
                className="input"
                value={editing.feeRate}
                onChange={(e) => setEditing({ ...editing, feeRate: Number(e.target.value) })}
              />
            </Field>
            <Field label={t('admin.providers.appId')}>
              <input
                className="input"
                value={editing.appId}
                onChange={(e) => setEditing({ ...editing, appId: e.target.value })}
              />
            </Field>
            <Field label={t('admin.providers.merchantId')}>
              <input
                className="input"
                value={editing.merchantId}
                onChange={(e) => setEditing({ ...editing, merchantId: e.target.value })}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field
                label={t('admin.providers.secretLabel')}
                hint={t('admin.providers.secretHint')}
              >
                <input
                  type="password"
                  className="input"
                  value={editing.secret}
                  onChange={(e) => setEditing({ ...editing, secret: e.target.value })}
                />
              </Field>
            </div>
            <Field label={t('admin.providers.sort')}>
              <input
                type="number"
                className="input"
                value={editing.sort}
                onChange={(e) => setEditing({ ...editing, sort: Number(e.target.value) })}
              />
            </Field>
            <label className="flex items-center gap-2 self-end pb-3 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 cursor-pointer accent-brand-600"
                checked={editing.enabled}
                onChange={(e) => setEditing({ ...editing, enabled: e.target.checked })}
              />
              <CheckCircle2 className="h-4 w-4 text-success" />
              {t('admin.providers.enableChannel')}
            </label>
            <div className="sm:col-span-2">
              <Field label={t('admin.providers.description')}>
                <textarea
                  className="input min-h-20"
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </Field>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
