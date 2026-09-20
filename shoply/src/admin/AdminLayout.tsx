import { Link, NavLink, Outlet } from 'react-router-dom';
import {
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Package,
  Settings as SettingsIcon,
  Store,
  Users,
} from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { useSettings } from '../lib/useSettings';
import { useI18n } from '../i18n';

const NAV = [
  { to: '/admin', key: 'admin.nav.dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/products', key: 'admin.nav.products', icon: Package },
  { to: '/admin/orders', key: 'admin.nav.orders', icon: ClipboardList },
  { to: '/admin/users', key: 'admin.nav.users', icon: Users },
  { to: '/admin/providers', key: 'admin.nav.providers', icon: CreditCard },
  { to: '/admin/settings', key: 'admin.nav.settings', icon: SettingsIcon },
];

export default function AdminLayout() {
  const { user } = useAuth();
  const settings = useSettings();
  const { t } = useI18n();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
      isActive
        ? 'bg-brand-600 text-white shadow-sm'
        : 'text-ink-600 hover:bg-brand-50 hover:text-brand-700'
    }`;

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="sticky top-0 z-40 border-b border-ink-200 bg-white">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-4 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Store className="h-5 w-5" />
            </span>
            <span className="font-heading text-lg font-bold">
              {settings.siteName} <span className="text-ink-400">{t('admin.backend')}</span>
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <Link to="/" className="btn-ghost px-3 py-2 text-xs">
              {t('admin.openSite')}
            </Link>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
              {user?.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="hidden text-sm font-semibold sm:inline">{user?.name}</span>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1400px] gap-6 px-4 py-6 sm:px-6">
        <aside className="hidden w-56 shrink-0 lg:block">
          <nav className="sticky top-24 space-y-1">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={linkClass}>
                <n.icon className="h-4 w-4" />
                {t(n.key)}
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          <nav className="mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={linkClass}>
                <n.icon className="h-4 w-4" />
                <span className="whitespace-nowrap">{t(n.key)}</span>
              </NavLink>
            ))}
          </nav>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
