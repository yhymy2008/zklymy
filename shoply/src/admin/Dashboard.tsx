import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CreditCard,
  ShoppingCart,
  TrendingUp,
  Users,
} from 'lucide-react';
import { api } from '../lib/api';
import type { OrderStatus, Stats } from '../types';
import { formatDate } from '../lib/format';
import { Loading, StatusBadge } from '../components/ui';
import { useI18n } from '../i18n';

const STATUS_KEYS: OrderStatus[] = [
  'pending',
  'paid',
  'shipped',
  'completed',
  'cancelled',
];

export default function Dashboard() {
  const { t, money, status } = useI18n();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let alive = true;
    api.admin.stats().then((s) => alive && setStats(s)).catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!stats) return <Loading text={t('admin.loadingStats')} />;

  const cards = [
    {
      label: t('admin.stat.gmv'),
      value: money(stats.gmv),
      icon: TrendingUp,
      tone: 'bg-brand-50 text-brand-700',
    },
    {
      label: t('admin.stat.orders'),
      value: t('admin.unit.order', { count: stats.orderCount }),
      icon: ShoppingCart,
      tone: 'bg-sky-50 text-sky-700',
    },
    {
      label: t('admin.stat.users'),
      value: t('admin.unit.user', { count: stats.userCount }),
      icon: Users,
      tone: 'bg-emerald-50 text-emerald-700',
    },
    {
      label: t('admin.stat.products'),
      value: t('admin.unit.product', { count: stats.productCount }),
      icon: Boxes,
      tone: 'bg-amber-50 text-amber-700',
    },
    {
      label: t('admin.stat.todayGmv'),
      value: money(stats.todayGmv),
      icon: CreditCard,
      tone: 'bg-violet-50 text-violet-700',
    },
    {
      label: t('admin.stat.pending'),
      value: t('admin.unit.order', { count: stats.pendingOrderCount }),
      icon: AlertTriangle,
      tone: 'bg-rose-50 text-rose-700',
    },
  ];

  const maxStatus = Math.max(1, ...STATUS_KEYS.map((k) => stats.statusCount[k] || 0));

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold">{t('admin.nav.dashboard')}</h1>
      <p className="mt-1 text-sm text-ink-500">
        {t('admin.dashboard.sub', { count: stats.todayOrderCount })}
        {stats.lowStockCount > 0 && (
          <span className="ml-2 text-danger">
            {t('admin.dashboard.lowStock', { count: stats.lowStockCount })}
          </span>
        )}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="card flex items-center gap-4 p-5">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${c.tone}`}>
              <c.icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-ink-500">{c.label}</p>
              <p className="truncate font-heading text-xl font-bold">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-heading text-base font-bold">{t('admin.dashboard.statusDist')}</h2>
          <div className="mt-4 space-y-3">
            {STATUS_KEYS.map((k) => {
              const n = stats.statusCount[k] || 0;
              return (
                <div key={k}>
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-ink-600">{status(k)}</span>
                    <span className="text-ink-500">
                      {t('admin.unit.order', { count: n })}
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink-100">
                    <div
                      className="h-full rounded-full bg-brand-500 transition-all duration-500"
                      style={{ width: `${(n / maxStatus) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-bold">
              {t('admin.dashboard.recentOrders')}
            </h2>
            <Link
              to="/admin/orders"
              className="flex cursor-pointer items-center gap-1 text-xs font-semibold text-brand-700 hover:gap-2"
            >
              {t('common.viewAll')} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {stats.recentOrders.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-400">
              {t('admin.dashboard.noOrders')}
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-ink-100">
              {stats.recentOrders.map((o) => (
                <li key={o.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{o.orderNo}</p>
                    <p className="text-xs text-ink-400">{formatDate(o.createdAt)}</p>
                  </div>
                  <StatusBadge status={o.status} />
                  <span className="font-heading text-sm font-bold text-brand-700">
                    {money(o.payAmount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
