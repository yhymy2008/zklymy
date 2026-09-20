import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { Loading } from './ui';
import { ShieldAlert } from 'lucide-react';
import { useI18n } from '../i18n';

export default function ProtectedRoute({
  adminOnly = false,
  children,
}: {
  adminOnly?: boolean;
  children?: ReactNode;
}) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { t } = useI18n();

  if (loading) return <Loading text={t('guard.checking')} />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (adminOnly && user.role !== 'admin') {
    return (
      <div className="container-page flex flex-col items-center gap-3 py-24 text-center">
        <ShieldAlert className="h-12 w-12 text-danger" />
        <h1 className="font-heading text-xl font-bold">{t('guard.noAccess')}</h1>
        <p className="text-sm text-ink-500">{t('guard.noAccessDesc')}</p>
      </div>
    );
  }

  if (user.status === 'disabled') {
    return (
      <div className="container-page flex flex-col items-center gap-3 py-24 text-center">
        <ShieldAlert className="h-12 w-12 text-danger" />
        <h1 className="font-heading text-xl font-bold">{t('guard.disabled')}</h1>
        <p className="text-sm text-ink-500">{t('guard.disabledDesc')}</p>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
}
