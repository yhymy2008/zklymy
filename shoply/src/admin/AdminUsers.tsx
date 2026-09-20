import { useEffect, useMemo, useState } from 'react';
import { KeyRound, Search, ShieldCheck, UserCog } from 'lucide-react';
import { api } from '../lib/api';
import type { User } from '../types';
import { formatDate } from '../lib/format';
import { useAuth } from '../store/AuthContext';
import { useToast } from '../store/ToastContext';
import { Field, Loading, Modal } from '../components/ui';
import { useI18n } from '../i18n';

export default function AdminUsers() {
  const toast = useToast();
  const { t } = useI18n();
  const { user: me } = useAuth();
  const [list, setList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [resetting, setResetting] = useState<User | null>(null);
  const [newPwd, setNewPwd] = useState('123456');
  const [busy, setBusy] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      setList(await api.admin.users());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () =>
      list
        .filter((u) => !roleFilter || u.role === roleFilter)
        .filter(
          (u) =>
            !keyword ||
            u.name.toLowerCase().includes(keyword.toLowerCase()) ||
            u.email.toLowerCase().includes(keyword.toLowerCase()) ||
            (u.phone || '').includes(keyword)
        ),
    [list, keyword, roleFilter]
  );

  const toggleRole = async (u: User) => {
    if (u.id === me?.id) return toast.error(t('admin.users.errSelfRole'));
    setBusy(u.id);
    try {
      await api.admin.updateUser(u.id, { role: u.role === 'admin' ? 'customer' : 'admin' });
      toast.success(t('admin.users.roleUpdated'));
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy('');
    }
  };

  const toggleStatus = async (u: User) => {
    if (u.id === me?.id) return toast.error(t('admin.users.errSelfStatus'));
    setBusy(u.id);
    try {
      await api.admin.updateUser(u.id, {
        status: u.status === 'active' ? 'disabled' : 'active',
      });
      toast.success(
        u.status === 'active' ? t('admin.users.disabled') : t('admin.users.enabled')
      );
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy('');
    }
  };

  const doReset = async () => {
    if (!resetting) return;
    if (newPwd.length < 6) return toast.error(t('admin.users.pwdTooShort'));
    setBusy(resetting.id);
    try {
      await api.admin.resetPassword(resetting.id, newPwd);
      toast.success(t('admin.users.resetDone', { name: resetting.name }));
      setResetting(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy('');
    }
  };

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold">{t('admin.nav.users')}</h1>
      <p className="mt-1 text-sm text-ink-500">
        {t('admin.users.sub', { count: list.length })}
      </p>

      <div className="card mt-5 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-ink-100 p-4">
          <div className="relative flex-1 min-w-52">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              className="input pl-9"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={t('admin.users.searchPlaceholder')}
              aria-label={t('admin.users.searchAria')}
            />
          </div>
          <select
            className="input w-32 cursor-pointer"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            aria-label={t('admin.users.roleFilterAria')}
          >
            <option value="">{t('admin.users.allRoles')}</option>
            <option value="admin">{t('admin.users.roleAdmin')}</option>
            <option value="customer">{t('admin.users.roleCustomer')}</option>
          </select>
        </div>

        {loading ? (
          <Loading />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-ink-50 text-left text-xs uppercase text-ink-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">{t('admin.table.user')}</th>
                  <th className="px-4 py-3 font-semibold">{t('common.phone')}</th>
                  <th className="px-4 py-3 font-semibold">{t('admin.users.role')}</th>
                  <th className="px-4 py-3 font-semibold">{t('admin.table.status')}</th>
                  <th className="px-4 py-3 font-semibold">{t('account.registeredAt')}</th>
                  <th className="px-4 py-3 font-semibold">{t('account.lastLogin')}</th>
                  <th className="px-4 py-3 text-right font-semibold">{t('admin.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-ink-50/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                          {u.name.slice(0, 1).toUpperCase()}
                        </span>
                        <div>
                          <p className="font-semibold">{u.name}</p>
                          <p className="text-xs text-ink-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-600">{u.phone || '-'}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={busy === u.id || u.id === me?.id}
                        onClick={() => toggleRole(u)}
                        className={`badge cursor-pointer disabled:cursor-not-allowed ${
                          u.role === 'admin'
                            ? 'bg-brand-100 text-brand-700'
                            : 'bg-ink-100 text-ink-600'
                        }`}
                      >
                        {u.role === 'admin' && <ShieldCheck className="h-3.5 w-3.5" />}
                        {u.role === 'admin'
                          ? t('admin.users.roleAdmin')
                          : t('admin.users.roleCustomer')}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={busy === u.id || u.id === me?.id}
                        onClick={() => toggleStatus(u)}
                        className={`badge cursor-pointer disabled:cursor-not-allowed ${
                          u.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {u.status === 'active'
                          ? t('admin.users.statusActive')
                          : t('admin.users.statusDisabled')}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-500">{formatDate(u.createdAt, false)}</td>
                    <td className="px-4 py-3 text-xs text-ink-500">{formatDate(u.lastLoginAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setResetting(u);
                            setNewPwd('123456');
                          }}
                          className="btn-secondary px-2.5 py-1.5 text-xs"
                        >
                          <KeyRound className="h-3.5 w-3.5" /> {t('admin.users.resetPwd')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-sm text-ink-400">
                      {t('admin.users.empty')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={!!resetting}
        title={t('admin.users.resetTitle', { name: resetting?.name || '' })}
        width="max-w-sm"
        onClose={() => setResetting(null)}
        footer={
          <>
            <button type="button" onClick={() => setResetting(null)} className="btn-secondary">
              {t('common.cancel')}
            </button>
            <button type="button" onClick={doReset} disabled={!!busy} className="btn-primary">
              <UserCog className="h-4 w-4" /> {t('admin.users.resetOk')}
            </button>
          </>
        }
      >
        <Field label={t('account.newPwd')} hint={t('admin.users.pwdHint')}>
          <input
            className="input"
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
            placeholder={t('admin.users.newPwdPlaceholder')}
          />
        </Field>
      </Modal>
    </div>
  );
}
