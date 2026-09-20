import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CreditCard,
  MapPin,
  Package,
  PackageCheck,
  Receipt,
  X,
} from 'lucide-react';
import { api } from '../lib/api';
import type { Order, OrderStatus } from '../types';
import { formatDate } from '../lib/format';
import { useToast } from '../store/ToastContext';
import ProductThumb from '../components/ProductThumb';
import { Empty, Loading, StatusBadge } from '../components/ui';
import { useI18n } from '../i18n';

const TABS: { value: string; key: string }[] = [
  { value: '', key: 'common.all' },
  { value: 'pending', key: 'orders.tab.pending' },
  { value: 'paid', key: 'orders.tab.paid' },
  { value: 'shipped', key: 'orders.tab.shipped' },
  { value: 'completed', key: 'orders.tab.completed' },
];

export default function Orders() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { t, money, pick, status, timeline } = useI18n();

  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOrders(await api.orders());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (orderId: string, fn: () => Promise<unknown>, msg: string) => {
    setBusyId(orderId);
    try {
      await fn();
      toast.success(msg);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId('');
    }
  };

  if (id) {
    const order = orders.find((o) => o.id === id);
    if (loading && !order) return <Loading />;
    if (!order) {
      return (
        <div className="container-page py-24 text-center">
          <p className="text-ink-500">{t('error.order.notFound')}</p>
          <Link to="/orders" className="btn-primary mt-4">
            {t('orders.backToList')}
          </Link>
        </div>
      );
    }

    return (
      <div className="container-page py-8">
        <button
          type="button"
          onClick={() => navigate('/orders')}
          className="btn-ghost -ml-3 mb-4 text-sm"
        >
          <ArrowLeft className="h-4 w-4" /> {t('orders.backToList')}
        </button>

        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className="space-y-6">
            <section className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="font-heading text-lg font-bold">
                    {t('orders.orderNo', { no: order.orderNo })}
                  </h1>
                  <p className="mt-1 text-xs text-ink-500">
                    {t('orders.createdAt', { date: formatDate(order.createdAt) })}
                  </p>
                </div>
                <StatusBadge status={order.status} />
              </div>

              <div className="mt-5 divide-y divide-ink-100">
                {order.goods.map((g) => (
                  <div key={g.productId} className="flex items-center gap-4 py-3">
                    <ProductThumb
                      hue={g.hue}
                      icon={g.icon}
                      className="h-16 w-16 rounded-xl"
                      iconClassName="h-7 w-7"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-semibold">{pick(g, 'name')}</p>
                      <p className="text-xs text-ink-500">
                        {money(g.price)} × {g.qty}
                      </p>
                    </div>
                    <p className="font-heading font-bold">{money(g.price * g.qty)}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="card p-5">
              <h2 className="font-heading text-base font-bold">{t('orders.timeline')}</h2>
              <ol className="mt-4 space-y-3">
                {order.timeline
                  .slice()
                  .reverse()
                  .map((item, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                          i === 0 ? 'bg-brand-600' : 'bg-ink-300'
                        }`}
                      />
                      <div>
                        <p className={i === 0 ? 'font-semibold text-ink-900' : 'text-ink-600'}>
                          {timeline(item)}
                        </p>
                        <p className="text-xs text-ink-400">{formatDate(item.at)}</p>
                      </div>
                    </li>
                  ))}
              </ol>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="card p-5">
              <h2 className="flex items-center gap-2 font-heading text-base font-bold">
                <MapPin className="h-4 w-4 text-brand-600" /> {t('orders.receiverInfo')}
              </h2>
              <p className="mt-3 text-sm">
                {order.address.name} · {order.address.phone}
              </p>
              <p className="mt-1 text-sm text-ink-500">{order.address.detail}</p>
            </section>

            <section className="card p-5">
              <h2 className="flex items-center gap-2 font-heading text-base font-bold">
                <Receipt className="h-4 w-4 text-brand-600" /> {t('orders.feeInfo')}
              </h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink-500">{t('checkout.amount')}</dt>
                  <dd>{money(order.amount)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-500">{t('checkout.discount')}</dt>
                  <dd className="text-success">-{money(order.discount)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-500">{t('cart.shipping')}</dt>
                  <dd>{money(order.shippingFee)}</dd>
                </div>
                <div className="flex justify-between border-t border-ink-100 pt-2">
                  <dt className="font-semibold">{t('orders.paidAmount')}</dt>
                  <dd className="font-heading text-lg font-bold text-brand-700">
                    {money(order.payAmount)}
                  </dd>
                </div>
                <div className="flex justify-between text-xs text-ink-400">
                  <dt>{t('orders.paymentMethod')}</dt>
                  <dd>
                    {order.providerName}
                    {order.payNo ? ` · ${order.payNo}` : ''}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-col gap-2">
                {order.status === 'pending' && (
                  <>
                    <Link to={`/pay/${order.id}`} className="btn-primary w-full">
                      <CreditCard className="h-4 w-4" /> {t('orders.continuePay')}
                    </Link>
                    <button
                      type="button"
                      disabled={busyId === order.id}
                      onClick={() =>
                        act(order.id, () => api.cancelOrder(order.id), t('orders.canceled'))
                      }
                      className="btn-secondary w-full"
                    >
                      {t('orders.cancelOrder')}
                    </button>
                  </>
                )}
                {order.status === 'shipped' && (
                  <button
                    type="button"
                    disabled={busyId === order.id}
                    onClick={() =>
                      act(order.id, () => api.confirmOrder(order.id), t('orders.receiptConfirmed'))
                    }
                    className="btn-primary w-full"
                  >
                    <PackageCheck className="h-4 w-4" /> {t('orders.confirmReceipt')}
                  </button>
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
    );
  }

  const list = tab ? orders.filter((o) => o.status === tab) : orders;

  return (
    <div className="container-page py-8">
      <h1 className="font-heading text-2xl font-bold">{t('nav.orders')}</h1>

      <div className="mt-5 flex flex-wrap gap-2">
        {TABS.map((tabItem) => (
          <button
            key={tabItem.value}
            type="button"
            onClick={() => setTab(tabItem.value)}
            className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              tab === tabItem.value
                ? 'bg-brand-600 text-white'
                : 'bg-white text-ink-600 hover:bg-brand-50 hover:text-brand-700'
            }`}
          >
            {t(tabItem.key)}
            {tabItem.value && (
              <span className="ml-1 text-xs">
                {orders.filter((o) => o.status === tabItem.value).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <Loading />
      ) : list.length === 0 ? (
        <Empty
          icon={<Package className="h-12 w-12" />}
          title={t('orders.empty.title')}
          desc={t('orders.empty.desc')}
          action={
            <Link to="/products" className="btn-primary">
              {t('common.browse')}
            </Link>
          }
        />
      ) : (
        <div className="mt-5 space-y-4">
          {list.map((o) => (
            <div key={o.id} className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 pb-3">
                <div>
                  <p className="font-heading text-sm font-bold">{o.orderNo}</p>
                  <p className="text-xs text-ink-500">{formatDate(o.createdAt)}</p>
                </div>
                <StatusBadge status={o.status} />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                {o.goods.map((g) => (
                  <ProductThumb
                    key={g.productId}
                    hue={g.hue}
                    icon={g.icon}
                    className="h-16 w-16 rounded-xl"
                    iconClassName="h-7 w-7"
                  />
                ))}
                <div className="ml-auto text-right">
                  <p className="text-xs text-ink-500">
                    {t('common.itemCount', { count: o.goods.reduce((s, g) => s + g.qty, 0) })}
                  </p>
                  <p className="font-heading text-lg font-bold text-brand-700">
                    {money(o.payAmount)}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                <Link to={`/orders/${o.id}`} className="btn-secondary px-3 py-2 text-xs">
                  {t('orders.detail')}
                </Link>
                {o.status === 'pending' && (
                  <>
                    <Link to={`/pay/${o.id}`} className="btn-primary px-3 py-2 text-xs">
                      <CreditCard className="h-3.5 w-3.5" /> {t('orders.goPay')}
                    </Link>
                    <button
                      type="button"
                      disabled={busyId === o.id}
                      onClick={() =>
                        act(o.id, () => api.cancelOrder(o.id), t('orders.canceled'))
                      }
                      className="btn-ghost px-3 py-2 text-xs text-danger"
                    >
                      <X className="h-3.5 w-3.5" /> {t('common.cancel')}
                    </button>
                  </>
                )}
                {o.status === 'shipped' && (
                  <button
                    type="button"
                    disabled={busyId === o.id}
                    onClick={() =>
                      act(o.id, () => api.confirmOrder(o.id), t('orders.receiptConfirmed'))
                    }
                    className="btn-primary px-3 py-2 text-xs"
                  >
                    <PackageCheck className="h-3.5 w-3.5" /> {t('orders.confirmReceipt')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-6 text-xs text-ink-400">
        {t('orders.statusFlow', {
          flow: ['pending', 'paid', 'shipped', 'completed'].map((s) => status(s)).join(' → '),
        })}
      </p>
    </div>
  );
}
