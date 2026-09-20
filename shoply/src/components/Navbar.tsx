import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Package,
  Search,
  ShoppingBag,
  ShoppingCart,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { useCart } from '../store/CartContext';
import { useSettings } from '../lib/useSettings';
import { useI18n } from '../i18n';
import LanguageSwitcher from './LanguageSwitcher';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const settings = useSettings();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [keyword, setKeyword] = useState(params.get('keyword') || '');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setKeyword(params.get('keyword') || '');
  }, [params]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = keyword.trim();
    navigate(q ? `/products?keyword=${encodeURIComponent(q)}` : '/products');
  };

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
      isActive ? 'text-brand-700' : 'text-ink-600 hover:text-brand-700'
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-ink-200/70 bg-white/90 backdrop-blur">
      <div className="container-page flex h-16 items-center gap-4">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
            <ShoppingBag className="h-5 w-5" />
          </span>
          <span className="font-heading text-xl font-bold tracking-tight text-ink-900">
            {settings.siteName}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <NavLink to="/" end className={navClass}>
            {t('nav.home')}
          </NavLink>
          <NavLink to="/products" className={navClass}>
            {t('nav.products')}
          </NavLink>
          <NavLink to="/orders" className={navClass}>
            {t('nav.orders')}
          </NavLink>
          {user?.role === 'admin' && (
            <NavLink to="/admin" className={navClass}>
              {t('nav.admin')}
            </NavLink>
          )}
        </nav>

        <form onSubmit={submit} className="ml-auto hidden flex-1 max-w-md sm:block">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="input pl-9"
              placeholder={t('nav.searchPlaceholder')}
              aria-label={t('nav.searchAria')}
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1 sm:ml-0">
          <Link
            to="/cart"
            className="relative cursor-pointer rounded-xl p-2.5 text-ink-600 transition-colors hover:bg-brand-50 hover:text-brand-700"
            aria-label={t('nav.cartAria', { count: cart.totalQty })}
          >
            <ShoppingCart className="h-5 w-5" />
            {cart.totalQty > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-[11px] font-bold text-white">
                {cart.totalQty > 99 ? '99+' : cart.totalQty}
              </span>
            )}
          </Link>

          <LanguageSwitcher />

          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex cursor-pointer items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-100"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                  {user.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden max-w-24 truncate sm:inline">{user.name}</span>
                <ChevronDown className="h-4 w-4" />
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-48 animate-fade-in-up overflow-hidden rounded-xl border border-ink-200 bg-white py-1 shadow-lg"
                >
                  <div className="border-b border-ink-100 px-3 py-2">
                    <p className="truncate text-sm font-semibold">{user.name}</p>
                    <p className="truncate text-xs text-ink-500">{user.email}</p>
                  </div>
                  <Link
                    to="/account"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-ink-700 hover:bg-ink-50"
                  >
                    <UserIcon className="h-4 w-4" /> {t('nav.account')}
                  </Link>
                  <Link
                    to="/orders"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-ink-700 hover:bg-ink-50"
                  >
                    <Package className="h-4 w-4" /> {t('nav.orders')}
                  </Link>
                  {user.role === 'admin' && (
                    <Link
                      to="/admin"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-ink-700 hover:bg-ink-50"
                    >
                      <LayoutDashboard className="h-4 w-4" /> {t('nav.admin')}
                    </Link>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                      navigate('/');
                    }}
                    className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm text-danger hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" /> {t('nav.logout')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Link to="/login" className="btn-ghost px-3 py-2 text-sm">
                {t('nav.login')}
              </Link>
              <Link to="/register" className="btn-primary px-3 py-2 text-sm">
                {t('nav.register')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
