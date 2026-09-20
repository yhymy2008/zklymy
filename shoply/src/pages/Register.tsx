import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, Phone, User as UserIcon } from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { useToast } from '../store/ToastContext';
import { Field } from '../components/ui';
import { useI18n } from '../i18n';

export default function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { t } = useI18n();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirm: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (form.name.trim().length < 2) errs.name = t('error.auth.nameTooShort');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = t('error.auth.invalidEmail');
    if (!/^1\d{10}$/.test(form.phone)) errs.phone = t('auth.err.phone');
    if (form.password.length < 6) errs.password = t('error.auth.weakPassword');
    if (form.password !== form.confirm) errs.confirm = t('auth.err.passwordMismatch');
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSubmitting(true);
    try {
      const user = await register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone,
        password: form.password,
      });
      toast.success(t('auth.registerSuccess', { name: user.name }));
      navigate('/', { replace: true });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <h1 className="text-center font-heading text-2xl font-bold">{t('auth.registerTitle')}</h1>
        <p className="mt-1 text-center text-sm text-ink-500">{t('auth.registerSub')}</p>

        <form onSubmit={submit} className="card mt-6 space-y-4 p-6">
          <Field label={t('common.name')} error={errors.name}>
            <div className="relative">
              <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                className="input pl-9"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t('auth.namePlaceholder')}
              />
            </div>
          </Field>

          <Field label={t('common.email')} error={errors.email}>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                type="email"
                className="input pl-9"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder={t('auth.emailPlaceholder')}
                autoComplete="email"
              />
            </div>
          </Field>

          <Field label={t('common.phone')} error={errors.phone}>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                className="input pl-9"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder={t('auth.phonePlaceholder')}
                inputMode="numeric"
              />
            </div>
          </Field>

          <Field
            label={t('common.password')}
            hint={t('auth.passwordHint')}
            error={errors.password}
          >
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                type="password"
                className="input pl-9"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={t('auth.newPasswordPlaceholder')}
                autoComplete="new-password"
              />
            </div>
          </Field>

          <Field label={t('auth.confirmPassword')} error={errors.confirm}>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                type="password"
                className="input pl-9"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                placeholder={t('auth.confirmPlaceholder')}
                autoComplete="new-password"
              />
            </div>
          </Field>

          <button type="submit" disabled={submitting} className="btn-primary w-full py-3">
            {submitting ? t('auth.registering') : t('auth.registerSubmit')}
          </button>

          <p className="text-center text-sm text-ink-500">
            {t('auth.haveAccount')}
            <Link to="/login" className="ml-1 cursor-pointer font-semibold text-brand-700 hover:underline">
              {t('auth.goLogin')}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
