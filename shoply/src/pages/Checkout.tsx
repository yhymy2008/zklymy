import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CreditCard, MapPin, Ticket, Wallet } from 'lucide-react';
import { api } from '../lib/api';
import type { CouponResult, PaymentProvider, Product } from '../types';
import { useAuth } from '../store/AuthContext';
import { useCart } from '../store/CartContext';
import { useToast } from '../store/ToastContext';
import { useSettings } from '../lib/useSettings';
import ProductThumb from '../components/ProductThumb';
import { Field, Loading } from '../components/ui';
import { useI18n } from '../i18n';

interface Line {
  product: Product;
  qty: number;
}

export default function Checkout() {
  const [params] = useSearchParams();
  const directId = params.get('direct') || '';
  const directQty = Number(params.get('qty') || 1);

  const { user } = useAuth();
  const { cart, refresh } = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const settings = useSettings();
  const { t, money, pick } = useI18n();

  const [directProduct, setDirectProduct] = useState<Product | null>(null);
  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  const [providerId, setProviderId] = useState('');
  const [address, setAddress] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    detail: '',
  });
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState<CouponResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    Promise.all([api.providers(), directId ? api.product(directId) : Promise.resolve(null)])
      .then(([ps, p]) => {
        if (!alive) return;
        setProviders(ps);
        setProviderId(ps[0]?.id || '');
        setDirectProduct(p);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [directId]);

  const lines: Line[] = useMemo(() => {
    if (directProduct) return [{ product: directProduct, qty: directQty }];
    return cart.items.map((i) => ({ product: i.product, qty: i.qty }));
  }, [directProduct, directQty, cart.items]);

  const amount = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
  const discount = coupon?.valid ? coupon.discount ?? 0 : 0;
  const shipping =
    amount - discount >= settings.freeShippingThreshold || amount === 0
      ? 0
      : settings.shippingFee;
  const payAmount = Math.max(0, amount - discount + shipping);
  const provider = providers.find((p) => p.id === providerId);
  const fee = provider ? payAmount * (provider.feeRate / 100) : 0;

  const validateCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      const r = await api.validateCoupon(couponCode.trim(), amount);
      setCoupon(r);
      if (!r.valid) toast.error(r.message);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const submit = async () => {
    const errs: Record<string, string> = {};
    if (!address.name.trim()) errs.name = t('checkout.err.name');
    if (!/^1\d{10}$/.test(address.phone.trim())) errs.phone = t('checkout.err.phone');
    if (address.detail.trim().length < 5) errs.detail = t('checkout.err.detail');
    if (!providerId) errs.provider = t('checkout.err.provider');
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSubmitting(true);
    try {
      const order = await api.checkout({
        address,
        providerId,
        couponCode: coupon?.valid ? coupon.code : undefined,
        items: directProduct
          ? [{ productId: directProduct.id, qty: directQty }]
          : undefined,
      } as any);
      await refresh();
      toast.success(t('checkout.orderCreated'));
      navigate(`/pay/${order.id}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading />;

  if (!lines.length) {
    return (
      <div className="container-page py-24 text-center">
        <p className="text-ink-500">{t('error.order.empty')}</p>
        <button type="button" onClick={() => navigate('/products')} className="btn-primary mt-4">
          {t('checkout.pickProducts')}
        </button>
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      <h1 className="font-heading text-2xl font-bold">{t('checkout.title')}</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* 收货地址 */}
          <section className="card p-5">
            <h2 className="flex items-center gap-2 font-heading text-base font-bold">
              <MapPin className="h-4 w-4 text-brand-600" /> {t('checkout.address')}
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label={t('checkout.receiver')} error={errors.name}>
                <input
                  className="input"
                  value={address.name}
                  onChange={(e) => setAddress({ ...address, name: e.target.value })}
                  placeholder={t('checkout.receiverPlaceholder')}
                />
              </Field>
              <Field label={t('common.phone')} error={errors.phone}>
                <input
                  className="input"
                  value={address.phone}
                  onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                  placeholder={t('checkout.phonePlaceholder')}
                  inputMode="numeric"
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label={t('checkout.detail')} error={errors.detail}>
                  <textarea
                    className="input min-h-20"
                    value={address.detail}
                    onChange={(e) => setAddress({ ...address, detail: e.target.value })}
                    placeholder={t('checkout.detailPlaceholder')}
                  />
                </Field>
              </div>
            </div>
          </section>

          {/* 支付方式 */}
          <section className="card p-5">
            <h2 className="flex items-center gap-2 font-heading text-base font-bold">
              <Wallet className="h-4 w-4 text-brand-600" /> {t('checkout.payment')}
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {providers.map((p) => (
                <label
                  key={p.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-colors ${
                    providerId === p.id
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-ink-200 hover:border-brand-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="provider"
                    value={p.id}
                    checked={providerId === p.id}
                    onChange={() => setProviderId(p.id)}
                    className="h-4 w-4 cursor-pointer accent-brand-600"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{pick(p, 'name')}</p>
                    <p className="text-xs text-ink-500">
                      {t('checkout.providerMeta', {
                        rate: (p.feeRate || 0).toFixed(2),
                        mode:
                          p.mode === 'sandbox'
                            ? t('checkout.mode.sandbox')
                            : t('checkout.mode.production'),
                      })}
                    </p>
                  </div>
                </label>
              ))}
              {!providers.length && (
                <p className="text-sm text-ink-500">{t('checkout.noProviders')}</p>
              )}
            </div>
            {errors.provider && (
              <p className="mt-2 text-xs font-semibold text-danger">{errors.provider}</p>
            )}
          </section>

          {/* 商品清单 */}
          <section className="card p-5">
            <h2 className="font-heading text-base font-bold">{t('checkout.items')}</h2>
            <div className="mt-4 divide-y divide-ink-100">
              {lines.map(({ product, qty }) => (
                <div key={product.id} className="flex items-center gap-4 py-3">
                  <ProductThumb
                    hue={product.hue}
                    icon={product.icon}
                    className="h-16 w-16 rounded-xl"
                    iconClassName="h-7 w-7"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-semibold">{pick(product, 'name')}</p>
                    <p className="text-xs text-ink-500">
                      {money(product.price)} × {qty}
                    </p>
                  </div>
                  <p className="font-heading font-bold text-ink-900">
                    {money(product.price * qty)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* 结算摘要 */}
        <aside className="card h-fit p-5 lg:sticky lg:top-20">
          <h2 className="font-heading text-base font-bold">{t('checkout.fees')}</h2>

          <div className="mt-4 flex gap-2">
            <input
              className="input"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder={t('checkout.couponPlaceholder')}
              aria-label={t('checkout.couponPlaceholder')}
            />
            <button type="button" onClick={validateCoupon} className="btn-secondary shrink-0">
              <Ticket className="h-4 w-4" /> {t('checkout.couponApply')}
            </button>
          </div>
          {coupon?.valid && (
            <p className="mt-2 text-xs font-semibold text-success">
              {t('checkout.couponApplied', {
                label: pick(coupon, 'label'),
                amount: money(coupon.discount ?? 0),
              })}
            </p>
          )}

          <dl className="mt-4 space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-500">{t('checkout.amount')}</dt>
              <dd className="font-semibold">{money(amount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">{t('checkout.discount')}</dt>
              <dd className="font-semibold text-success">-{money(discount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">{t('cart.shipping')}</dt>
              <dd className="font-semibold">
                {shipping === 0 ? t('cart.freeShipping') : money(shipping)}
              </dd>
            </div>
            {provider && (
              <div className="flex justify-between text-xs text-ink-400">
                <dt>{t('checkout.providerFee', { provider: pick(provider, 'name') })}</dt>
                <dd>{money(fee)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-ink-100 pt-3">
              <dt className="font-semibold">{t('checkout.payAmount')}</dt>
              <dd className="font-heading text-2xl font-bold text-brand-700">
                {money(payAmount)}
              </dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={submit}
            disabled={submitting || !providerId}
            className="btn-primary mt-5 w-full py-3"
          >
            <CreditCard className="h-4 w-4" />
            {submitting ? t('checkout.submitting') : t('checkout.submit')}
          </button>
          <p className="mt-3 text-center text-xs text-ink-400">
            {t('checkout.redirectNote', {
              provider: (provider && pick(provider, 'name')) || t('checkout.thirdParty'),
            })}
          </p>
        </aside>
      </div>
    </div>
  );
}
