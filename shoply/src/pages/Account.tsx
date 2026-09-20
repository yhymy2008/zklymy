import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Mail, Phone, ShieldCheck, User as UserIcon } from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { useToast } from '../store/ToastContext';
import { useCart } from '../store/CartContext';
import { api } from '../lib/api';
import { formatDate } from '../lib/format';
import { Field } from '../components/ui';
import { useI18n } from '../i18n';

export default function Account() {
  const { user, updateUser, logout } = useAuth();
  const { cart } = useCart();
  const toast = useToast();
  const { t } = useI18n();

  const [profile, setProfile] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [pwd, setPwd] = useState({ oldPassword: '', newPassword: '', confirm: '' });
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { user: u } = await api.updateProfile(profile);
      updateUser(u);
      toast.success(t('account.profileSaved'));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const savePwd = async (e: FormEvent) => {
    e.preventDefault();
    if (pwd.newPassword.length < 6) return toast.error(t('account.err.newPwdShort'));
    if (pwd.newPassword !== pwd.confirm) return toast.error(t('account.err.pwdMismatch'));
    setSaving(true);
    try {
      await api.changePassword({
        oldPassword: pwd.oldPassword,
        newPassword: pwd.newPassword,
      });
      setPwd({ oldPassword: '', newPassword: '', confirm: '' });
      toast.success(t('account.pwdChanged'));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-page py-8">
      <h1 className="font-heading text-2xl font-bold">{t('nav.account')}</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="space-y-4">
          <div className="card p-5 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 font-heading text-2xl font-bold text-brand-700">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <h2 className="mt-3 font-heading text-lg font-bold">{user.name}</h2>
            <p className="text-xs text-ink-500">{user.email}</p>
            <span
              className={`badge mt-3 ${
                user.role === 'admin'
                  ? 'bg-brand-100 text-brand-700'
                  : 'bg-ink-100 text-ink-600'
              }`}
            >
              {user.role === 'admin' ? (
                <ShieldCheck className="h-3.5 w-3.5" />
              ) : (
                <BadgeCheck className="h-3.5 w-3.5" />
              )}
              {user.role === 'admin' ? t('account.roleAdmin') : t('account.roleMember')}
            </span>
            <dl className="mt-4 space-y-1.5 border-t border-ink-100 pt-4 text-left text-xs text-ink-500">
              <div className="flex justify-between">
                <dt>{t('account.registeredAt')}</dt>
                <dd>{formatDate(user.createdAt, false)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>{t('account.lastLogin')}</dt>
                <dd>{formatDate(user.lastLoginAt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>{t('account.myCart')}</dt>
                <dd>{t('common.itemCount', { count: cart.totalQty })}</dd>
              </div>
            </dl>
            {user.role === 'admin' && (
              <Link to="/admin" className="btn-primary mt-4 w-full">
                {t('account.goAdmin')}
              </Link>
            )}
            <button type="button" onClick={logout} className="btn-ghost mt-2 w-full text-xs">
              {t('nav.logout')}
            </button>
          </div>
        </aside>

        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="font-heading text-base font-bold">{t('account.profile')}</h2>
            <form onSubmit={saveProfile} className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label={t('common.name')}>
                <div className="relative">
                  <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <input
                    className="input pl-9"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  />
                </div>
              </Field>
              <Field label={t('common.phone')}>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <input
                    className="input pl-9"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  />
                </div>
              </Field>
              <div className="sm:col-span-2">
                <Field label={t('common.email')} hint={t('account.emailLocked')}>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                    <input className="input pl-9" value={user.email} disabled />
                  </div>
                </Field>
              </div>
              <div className="sm:col-span-2">
                <button type="submit" disabled={saving} className="btn-primary">
                {t('account.saveProfile')}
                </button>
              </div>
            </form>
          </section>

          <section className="card p-5">
            <h2 className="font-heading text-base font-bold">{t('account.changePwd')}</h2>
            <form onSubmit={savePwd} className="mt-4 grid gap-4 sm:grid-cols-3">
              <Field label={t('account.currentPwd')}>
                <input
                  type="password"
                  className="input"
                  value={pwd.oldPassword}
                  onChange={(e) => setPwd({ ...pwd, oldPassword: e.target.value })}
                />
              </Field>
              <Field label={t('account.newPwd')}>
                <input
                  type="password"
                  className="input"
                  value={pwd.newPassword}
                  onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })}
                />
              </Field>
              <Field label={t('account.confirmNewPwd')}>
                <input
                  type="password"
                  className="input"
                  value={pwd.confirm}
                  onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })}
                />
              </Field>
              <div className="sm:col-span-3">
                <button type="submit" disabled={saving} className="btn-secondary">
                  {t('account.changePwd')}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
