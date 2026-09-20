import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Lock, Mail, ShoppingBag } from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { useToast } from '../store/ToastContext';
import { Field } from '../components/ui';
import { useI18n } from '../i18n';

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const { t } = useI18n();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.email.trim()) errs.email = t('auth.err.emailRequired');
    if (!form.password) errs.password = t('auth.err.passwordRequired');
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSubmitting(true);
    try {
      const user = await login(form.email.trim(), form.password);
      toast.success(t('auth.welcomeBack', { name: user.name }));
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const fill = (email: string, password: string) =>
    setForm({ email, password });

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white">
            <ShoppingBag className="h-6 w-6" />
          </span>
          <h1 className="mt-4 font-heading text-2xl font-bold">{t('auth.loginTitle')}</h1>
          <p className="mt-1 text-sm text-ink-500">{t('auth.loginSub')}</p>
        </div>

        <form onSubmit={submit} className="card space-y-4 p-6">
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

          <Field label={t('common.password')} error={errors.password}>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                type="password"
                className="input pl-9"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={t('auth.passwordPlaceholder')}
                autoComplete="current-password"
              />
            </div>
          </Field>

          <button type="submit" disabled={submitting} className="btn-primary w-full py-3">
            {submitting ? t('auth.loggingIn') : t('auth.loginSubmit')}
          </button>

          <p className="text-center text-sm text-ink-500">
            {t('auth.noAccount')}
            <Link to="/register" className="ml-1 cursor-pointer font-semibold text-brand-700 hover:underline">
              {t('auth.goRegister')}
            </Link>
          </p>
        </form>

        <div className="card mt-4 p-4">
          <p className="text-xs font-semibold text-ink-600">{t('auth.demoAccounts')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fill('admin@shoply.com', 'admin123')}
              className="btn-secondary px-3 py-1.5 text-xs"
            >
              {t('auth.demoAdmin')}
            </button>
            <button
              type="button"
              onClick={() => fill('demo@shoply.com', '123456')}
              className="btn-secondary px-3 py-1.5 text-xs"
            >
              {t('auth.demoUser')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
