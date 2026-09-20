import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { useCart } from '../store/CartContext';
import { useToast } from '../store/ToastContext';
import { useSettings } from '../lib/useSettings';
import ProductThumb from '../components/ProductThumb';
import { Empty, Loading } from '../components/ui';
import { useI18n } from '../i18n';

export default function CartPage() {
  const { cart, loading, setQty, remove, clear } = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const settings = useSettings();
  const { t, money, pick } = useI18n();
  const [busy, setBusy] = useState(false);

  const shipping =
    cart.totalAmount >= settings.freeShippingThreshold || cart.totalAmount === 0
      ? 0
      : settings.shippingFee;

  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="container-page py-8">
      <h1 className="font-heading text-2xl font-bold">{t('nav.cart')}</h1>

      {cart.items.length === 0 ? (
        <Empty
          icon={<ShoppingCart className="h-12 w-12" />}
          title={t('cart.empty.title')}
          desc={t('cart.empty.desc')}
          action={
            <Link to="/products" className="btn-primary">
              {t('common.browse')}
            </Link>
          }
        />
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="card divide-y divide-ink-100">
            {cart.items.map(({ product, qty }) => (
              <div key={product.id} className="flex gap-4 p-4">
                <Link to={`/products/${product.id}`} className="shrink-0 cursor-pointer">
                  <ProductThumb
                    hue={product.hue}
                    icon={product.icon}
                    className="h-20 w-20 rounded-xl sm:h-24 sm:w-24"
                    iconClassName="h-8 w-8"
                  />
                </Link>

                <div className="flex min-w-0 flex-1 flex-col">
                  <Link
                    to={`/products/${product.id}`}
                    className="line-clamp-1 cursor-pointer font-heading text-sm font-semibold hover:text-brand-700"
                  >
                    {pick(product, 'name')}
                  </Link>
                  <p className="mt-0.5 line-clamp-1 text-xs text-ink-500">
                    {pick(product, 'subtitle')}
                  </p>
                  <p className="mt-1 font-heading text-base font-bold text-brand-700">
                    {money(product.price)}
                  </p>

                  <div className="mt-auto flex items-center justify-between pt-2">
                    <div className="flex items-center rounded-lg border border-ink-200">
                      <button
                        type="button"
                        aria-label={t('product.decreaseAria')}
                        disabled={busy}
                        onClick={() => act(() => setQty(product.id, qty - 1))}
                        className="flex h-8 w-8 cursor-pointer items-center justify-center text-ink-600 hover:text-brand-700"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-10 text-center text-sm font-semibold">{qty}</span>
                      <button
                        type="button"
                        aria-label={t('product.increaseAria')}
                        disabled={busy || qty >= product.stock}
                        onClick={() => act(() => setQty(product.id, qty + 1))}
                        className="flex h-8 w-8 cursor-pointer items-center justify-center text-ink-600 hover:text-brand-700 disabled:text-ink-300"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => act(() => remove(product.id))}
                      className="flex cursor-pointer items-center gap-1 text-xs text-ink-400 transition-colors hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" /> {t('cart.remove')}
                    </button>
                  </div>
                </div>

                <div className="hidden text-right sm:block">
                  <p className="font-heading text-base font-bold text-ink-900">
                    {money(product.price * qty)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <aside className="card h-fit p-5 lg:sticky lg:top-20">
            <h2 className="font-heading text-base font-bold">{t('cart.summary')}</h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-500">{t('cart.itemCount')}</dt>
                <dd className="font-semibold">{t('common.itemCount', { count: cart.totalQty })}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500">{t('cart.subtotal')}</dt>
                <dd className="font-semibold">{money(cart.totalAmount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500">{t('cart.shipping')}</dt>
                <dd className="font-semibold">
                  {shipping === 0 ? t('cart.freeShipping') : money(shipping)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-ink-100 pt-3">
                <dt className="font-semibold">{t('cart.total')}</dt>
                <dd className="font-heading text-xl font-bold text-brand-700">
                  {money(cart.totalAmount + shipping)}
                </dd>
              </div>
            </dl>

            <button
              type="button"
              onClick={() => navigate('/checkout')}
              className="btn-primary mt-5 w-full py-3"
            >
              {t('cart.checkout')}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                await act(clear);
                toast.success(t('cart.cleared'));
              }}
              className="btn-ghost mt-2 w-full text-xs"
            >
              {t('cart.clear')}
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}
