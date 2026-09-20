import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ChevronRight,
  Minus,
  Plus,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Zap,
} from 'lucide-react';
import { api } from '../lib/api';
import type { Product } from '../types';
import ProductThumb from '../components/ProductThumb';
import ProductCard from '../components/ProductCard';
import { Loading } from '../components/ui';
import { useCart } from '../store/CartContext';
import { useToast } from '../store/ToastContext';
import { useSettings } from '../lib/useSettings';
import { useI18n } from '../i18n';

export default function ProductDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { add } = useCart();
  const settings = useSettings();
  const { t, money, pick } = useI18n();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .product(id)
      .then(async (p) => {
        if (!alive) return;
        setProduct(p);
        const r = await api.products({ categoryId: p.categoryId, pageSize: 5 });
        if (alive) setRelated(r.list.filter((x) => x.id !== p.id).slice(0, 4));
      })
      .catch(() => toast.error(t('error.product.unavailable')))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) return <Loading />;
  if (!product) {
    return (
      <div className="container-page py-24 text-center">
        <p className="text-ink-500">{t('error.product.unavailable')}</p>
        <Link to="/products" className="btn-primary mt-4">
          {t('product.backToList')}
        </Link>
      </div>
    );
  }

  const off =
    product.originalPrice > product.price
      ? Math.round((1 - product.price / product.originalPrice) * 100)
      : 0;

  const onAdd = async () => {
    try {
      await add(product, qty);
      toast.success(t('product.addedToCart'));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const onBuy = () => {
    navigate(`/checkout?direct=${product.id}&qty=${qty}`);
  };

  return (
    <div className="container-page py-8">
      <nav
        className="flex items-center gap-1 text-xs text-ink-400"
        aria-label={t('common.breadcrumb')}
      >
        <Link to="/" className="cursor-pointer hover:text-brand-700">
          {t('nav.home')}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link to="/products" className="cursor-pointer hover:text-brand-700">
          {t('nav.products')}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-ink-600">{pick(product, 'name')}</span>
      </nav>

      <div className="mt-5 grid gap-8 lg:grid-cols-2">
        <div className="card overflow-hidden">
          <ProductThumb
            hue={product.hue}
            icon={product.icon}
            className="aspect-square w-full"
            iconClassName="h-32 w-32"
          />
        </div>

        <div>
          <h1 className="font-heading text-2xl font-bold sm:text-3xl">
            {pick(product, 'name')}
          </h1>
          <p className="mt-2 text-sm text-ink-500">{pick(product, 'subtitle')}</p>

          <div className="mt-5 rounded-2xl bg-brand-50 p-5">
            <div className="flex items-end gap-3">
              <span className="font-heading text-3xl font-bold text-brand-700">
                {money(product.price)}
              </span>
              {off > 0 && (
                <>
                  <span className="text-sm text-ink-400 line-through">
                    {money(product.originalPrice)}
                  </span>
                  <span className="badge bg-danger text-white">
                    {t('product.savePercent', { percent: off })}
                  </span>
                </>
              )}
            </div>
            <p className="mt-2 text-xs text-ink-500">
              {t('product.meta', {
                sold: product.sales,
                rating: product.rating.toFixed(1),
                stock: product.stock,
              })}
            </p>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <span className="text-sm font-semibold text-ink-700">{t('common.qty')}</span>
            <div className="flex items-center rounded-xl border border-ink-200">
              <button
                type="button"
                aria-label={t('product.decreaseAria')}
                disabled={qty <= 1}
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="flex h-9 w-9 cursor-pointer items-center justify-center text-ink-600 hover:text-brand-700 disabled:cursor-not-allowed disabled:text-ink-300"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-12 text-center text-sm font-semibold">{qty}</span>
              <button
                type="button"
                aria-label={t('product.increaseAria')}
                disabled={qty >= product.stock}
                onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                className="flex h-9 w-9 cursor-pointer items-center justify-center text-ink-600 hover:text-brand-700 disabled:cursor-not-allowed disabled:text-ink-300"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onAdd}
              disabled={product.stock <= 0}
              className="btn-secondary flex-1 py-3"
            >
              <ShoppingCart className="h-4 w-4" /> {t('product.addToCart')}
            </button>
            <button
              type="button"
              onClick={onBuy}
              disabled={product.stock <= 0}
              className="btn-primary flex-1 py-3"
            >
              <Zap className="h-4 w-4" /> {t('product.buyNow')}
            </button>
          </div>

          <ul className="mt-6 space-y-2 text-xs text-ink-500">
            <li className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-success" />
              {t('product.shippingNote', {
                threshold: money(settings.freeShippingThreshold, settings.currency),
                fee: money(settings.shippingFee, settings.currency),
              })}
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-success" /> {t('product.authenticNote')}
            </li>
            <li className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-success" /> {t('footer.returns')}
            </li>
          </ul>
        </div>
      </div>

      <section className="card mt-8 p-6">
        <h2 className="font-heading text-lg font-bold">{t('product.detailTitle')}</h2>
        <p className="mt-3 whitespace-pre-line text-sm leading-7 text-ink-600">
          {pick(product, 'description')}
        </p>
      </section>

      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 font-heading text-lg font-bold">{t('product.relatedTitle')}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
