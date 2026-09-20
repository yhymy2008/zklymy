import { useEffect, useMemo, useState } from 'react';
import { Eye, Search, Truck } from 'lucide-react';
import { api } from '../lib/api';
import type { Order, OrderStatus } from '../types';
import { formatDate } from '../lib/format';
import { useToast } from '../store/ToastContext';
import ProductThumb from '../components/ProductThumb';
import { Loading, Modal, StatusBadge } from '../components/ui';
import { useI18n } from '../i18n';

const TABS: { value: string; key: string }[] = [
  { value: '', key: 'common.all' },
  { value: 'pending', key: 'orders.tab.pending' },
  { value: 'paid', key: 'orders.tab.paid' },
  { value: 'shipped', key: 'admin.orders.tabShipped' },
  { value: 'completed', key: 'orders.tab.completed' },
  { value: 'cancelled', key: 'admin.orders.tabCancelled' },
];

export default function AdminOrders() {
  const toast = useToast();
  const { t, money, status, timeline, pick } = useI18n();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('');
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<Order | null>(null);
  const [busy, setBusy] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      setOrders(await api.admin.orders());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const list = useMemo(
    () =>
      orders
        .filter((o) => !tab || o.status === tab)
        .filter(
          (o) =>
            !keyword ||
            o.orderNo.toLowerCase().includes(keyword.toLowerCase()) ||
            o.userName.toLowerCase().includes(keyword.toLowerCase())
        ),
    [orders, tab, keyword]
  );

  const updateStatus = async (id: string, status: OrderStatus, msg: string) => {
    setBusy(id);
    try {
      const updated = await api.admin.updateOrderStatus(id, status);
      setDetail(updated);
      toast.success(msg);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy('');
    }
  };

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold">{t('admin.nav.orders')}</h1>
      <p className="mt-1 text-sm text-ink-500">{t('admin.orders.sub')}</p>

      <div className="card mt-5 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-ink-100 p-4">
          {TABS.map((tabItem) => (
            <button
              key={tabItem.value}
              type="button"
              onClick={() => setTab(tabItem.value)}
              className={`cursor-pointer rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                tab === tabItem.value
                  ? 'bg-brand-600 text-white'
                  : 'bg-ink-50 text-ink-600 hover:bg-brand-50 hover:text-brand-700'
              }`}
            >
              {t(tabItem.key)}
            </button>
          ))}
          <div className="relative ml-auto w-full sm:w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              className="input pl-9"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={t('admin.orders.searchPlaceholder')}
              aria-label={t('admin.orders.searchAria')}
            />
          </div>
        </div>

        {loading ? (
          <Loading />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-ink-50 text-left text-xs uppercase text-ink-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">{t('admin.table.orderNo')}</th>
                  <th className="px-4 py-3 font-semibold">{t('admin.table.customer')}</th>
                  <th className="px-4 py-3 font-semibold">{t('admin.table.goods')}</th>
                  <th className="px-4 py-3 font-semibold">{t('admin.table.payment')}</th>
                  <th className="px-4 py-3 font-semibold">{t('admin.table.amount')}</th>
                  <th className="px-4 py-3 font-semibold">{t('admin.table.status')}</th>
                  <th className="px-4 py-3 font-semibold">{t('admin.table.createdAt')}</th>
                  <th className="px-4 py-3 text-right font-semibold">{t('admin.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {list.map((o) => (
                  <tr key={o.id} className="hover:bg-ink-50/60">
                    <td className="px-4 py-3 font-semibold">{o.orderNo}</td>
                    <td className="px-4 py-3 text-ink-600">{o.userName}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {o.goods.slice(0, 3).map((g) => (
                          <ProductThumb
                            key={g.productId}
                            hue={g.hue}
                            icon={g.icon}
                            className="h-8 w-8 rounded-lg"
                            iconClassName="h-4 w-4"
                          />
                        ))}
                        <span className="text-xs text-ink-500">
                          {t('common.itemCount', {
                            count: o.goods.reduce((s, g) => s + g.qty, 0),
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-600">{o.providerName}</td>
                    <td className="px-4 py-3 font-semibold">{money(o.payAmount)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-500">{formatDate(o.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {o.status === 'paid' && (
                          <button
                            type="button"
                            disabled={busy === o.id}
                            onClick={() =>
                              updateStatus(o.id, 'shipped', t('admin.orders.shippedMsg'))
                            }
                            className="btn-primary px-2.5 py-1.5 text-xs"
                          >
                            <Truck className="h-3.5 w-3.5" /> {t('admin.orders.ship')}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setDetail(o)}
                          aria-label={t('admin.orders.viewDetailAria')}
                          className="cursor-pointer rounded-lg p-2 text-ink-500 transition-colors hover:bg-brand-50 hover:text-brand-700"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!list.length && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-sm text-ink-400">
                      {t('admin.orders.empty')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={!!detail}
        title={detail ? t('orders.orderNo', { no: detail.orderNo }) : ''}
        onClose={() => setDetail(null)}
        width="max-w-2xl"
        footer={
          detail && (
            <>
              <button type="button" onClick={() => setDetail(null)} className="btn-secondary">
                {t('common.close')}
              </button>
              {detail.status === 'paid' && (
                <button
                  type="button"
                  disabled={busy === detail.id}
                  onClick={() => updateStatus(detail.id, 'shipped', t('admin.orders.shippedMsg'))}
                  className="btn-primary"
                >
                  <Truck className="h-4 w-4" /> {t('admin.orders.markShipped')}
                </button>
              )}
              {detail.status === 'shipped' && (
                <button
                  type="button"
                  disabled={busy === detail.id}
                  onClick={() =>
                    updateStatus(detail.id, 'completed', t('admin.orders.completedMsg'))
                  }
                  className="btn-primary"
                >
                  {t('admin.orders.markCompleted')}
                </button>
              )}
            </>
          )
        }
      >
        {detail && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={detail.status} />
              <span className="text-xs text-ink-500">
                {t('admin.orders.createdBy', {
                  date: formatDate(detail.createdAt),
                  name: detail.userName,
                })}
              </span>
            </div>

            <div className="rounded-xl bg-ink-50 p-4 text-sm">
              <p className="font-semibold">{t('orders.receiverInfo')}</p>
              <p className="mt-1 text-ink-600">
                {detail.address.name} · {detail.address.phone}
              </p>
              <p className="text-ink-600">{detail.address.detail}</p>
            </div>

            <div className="divide-y divide-ink-100">
              {detail.goods.map((g) => (
                <div key={g.productId} className="flex items-center gap-3 py-3">
                  <ProductThumb
                    hue={g.hue}
                    icon={g.icon}
                    className="h-12 w-12 rounded-xl"
                    iconClassName="h-6 w-6"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{pick(g, 'name')}</p>
                    <p className="text-xs text-ink-500">
                      {money(g.price)} × {g.qty}
                    </p>
                  </div>
                  <span className="font-semibold">{money(g.price * g.qty)}</span>
                </div>
              ))}
            </div>

            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div className="flex justify-between">
                <dt className="text-ink-500">{t('checkout.amount')}</dt>
                <dd>{money(detail.amount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500">{t('checkout.discount')}</dt>
                <dd>-{money(detail.discount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500">{t('cart.shipping')}</dt>
                <dd>{money(detail.shippingFee)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500">{t('orders.paidAmount')}</dt>
                <dd className="font-bold text-brand-700">{money(detail.payAmount)}</dd>
              </div>
              <div className="flex justify-between sm:col-span-2">
                <dt className="text-ink-500">{t('admin.orders.payNo')}</dt>
                <dd>
                  {detail.providerName}{' '}
                  {detail.payNo ? `· ${detail.payNo}` : t('admin.orders.unpaid')}
                </dd>
              </div>
            </dl>

            <div>
              <p className="text-xs font-semibold text-ink-500">{t('orders.timeline')}</p>
              <ol className="mt-2 space-y-1.5 text-sm">
                {detail.timeline
                  .slice()
                  .reverse()
                  .map((item, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="text-ink-400">{formatDate(item.at)}</span>
                      <span className={i === 0 ? 'font-semibold' : 'text-ink-600'}>
                        {timeline(item)}
                      </span>
                    </li>
                  ))}
              </ol>
            </div>

            <p className="text-xs text-ink-400">
              {t('admin.orders.statusNote', {
                flow: ['pending', 'paid', 'shipped', 'completed'].map((s) => status(s)).join(' → '),
              })}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
