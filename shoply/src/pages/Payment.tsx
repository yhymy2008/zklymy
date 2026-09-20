import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  CheckCircle2,
  QrCode,
  ShieldCheck,
  Timer,
  Wallet,
  XCircle,
} from 'lucide-react';
import { api } from '../lib/api';
import type { Order } from '../types';
import { useToast } from '../store/ToastContext';
import { Loading, Spinner } from '../components/ui';
import { useI18n } from '../i18n';

const PAY_WINDOW_MS = 15 * 60 * 1000;

function useCountdown(deadline: number) {
  const [left, setLeft] = useState(Math.max(0, deadline - Date.now()));
  useEffect(() => {
    const t = setInterval(
      () => setLeft(Math.max(0, deadline - Date.now())),
      1000
    );
    return () => clearInterval(t);
  }, [deadline]);
  const m = Math.floor(left / 60000);
  const s = Math.floor((left % 60000) / 1000);
  return { left, text: `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` };
}

export default function Payment() {
  const { orderId = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { t, money, pick } = useI18n();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .order(orderId)
      .then((o) => alive && setOrder(o))
      .catch(() => toast.error(t('error.order.notFound')))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [orderId]);

  const deadline = order ? new Date(order.createdAt).getTime() + PAY_WINDOW_MS : 0;
  const { left, text } = useCountdown(deadline);

  if (loading) return <Loading />;
  if (!order) {
    return (
      <div className="container-page py-24 text-center">
        <p className="text-ink-500">{t('error.order.notFound')}</p>
        <Link to="/orders" className="btn-primary mt-4">
          {t('pay.viewOrders')}
        </Link>
      </div>
    );
  }

  const paid = order.status !== 'pending';

  const doPay = async (success: boolean) => {
    if (!success) {
      await api.cancelOrder(order.id);
      toast.info(t('pay.canceled'));
      navigate('/orders');
      return;
    }
    setPaying(true);
    try {
      await api.pay(order.id);
      toast.success(t('pay.success'));
      navigate('/orders');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="min-h-[70vh] bg-gradient-to-b from-brand-50 to-ink-50 py-10">
      <div className="mx-auto w-full max-w-lg px-4">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-ink-100 bg-white px-6 py-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-brand-600" />
              <span className="font-heading text-base font-bold">
                {t('pay.cashier', { provider: pick(order, 'providerName') })}
              </span>
            </div>
            <span className="badge bg-amber-100 text-amber-700">{t('pay.mockBadge')}</span>
          </div>

          {paid ? (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <CheckCircle2 className="h-14 w-14 text-success" />
              <h2 className="font-heading text-lg font-bold">{t('pay.alreadyPaid')}</h2>
              <p className="text-sm text-ink-500">
                {t('pay.payNo', { no: order.payNo || '-' })}
              </p>
              <Link to="/orders" className="btn-primary mt-2">
                {t('pay.viewOrders')}
              </Link>
            </div>
          ) : (
            <>
              <div className="px-6 py-6 text-center">
                <p className="text-sm text-ink-500">
                  {t('orders.orderNo', { no: order.orderNo })}
                </p>
                <p className="mt-2 font-heading text-4xl font-bold text-ink-900">
                  {money(order.payAmount)}
                </p>

                <div className="mt-6 flex items-center justify-center gap-2 text-sm text-ink-500">
                  <Timer className="h-4 w-4" />
                  {t('pay.countdownInline', { time: text })}
                </div>

                <div className="mx-auto mt-6 flex h-48 w-48 items-center justify-center rounded-2xl border border-dashed border-brand-300 bg-white">
                  <QrCode
                    className="h-28 w-28 text-brand-700"
                    strokeWidth={1.2}
                    aria-label={t('pay.qrAria')}
                  />
                </div>
                <p className="mt-3 text-xs text-ink-400">
                  {t('pay.qrHint', { provider: pick(order, 'providerName') })}
                </p>
              </div>

              <div className="flex flex-col gap-3 border-t border-ink-100 px-6 py-5">
                <button
                  type="button"
                  disabled={paying || left === 0}
                  onClick={() => doPay(true)}
                  className="btn-primary w-full py-3"
                >
                  {paying ? <Spinner className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  {t('pay.mockSuccess')}
                </button>
                <button
                  type="button"
                  disabled={paying}
                  onClick={() => doPay(false)}
                  className="btn-secondary w-full"
                >
                  <XCircle className="h-4 w-4" /> {t('pay.cancel')}
                </button>
                <p className="flex items-center justify-center gap-1.5 text-xs text-ink-400">
                  <ShieldCheck className="h-3.5 w-3.5" /> {t('pay.protection')}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
