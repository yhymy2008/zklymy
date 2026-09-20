import type { MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Star } from 'lucide-react';
import type { Product } from '../types';
import { useCart } from '../store/CartContext';
import { useToast } from '../store/ToastContext';
import { useI18n } from '../i18n';
import ProductThumb from './ProductThumb';

export default function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const toast = useToast();
  const { t, money, pick } = useI18n();
  const name = pick(product, 'name');
  const off =
    product.originalPrice > product.price
      ? Math.round((1 - product.price / product.originalPrice) * 100)
      : 0;

  const onAdd = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await add(product, 1);
      toast.success(t('product.addedToCart'));
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <Link
      to={`/products/${product.id}`}
      className="group card flex cursor-pointer flex-col overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:border-brand-300 hover:shadow-lift"
    >
      <div className="relative">
        <ProductThumb
          hue={product.hue}
          icon={product.icon}
          className="aspect-square w-full"
          iconClassName="h-16 w-16 transition-transform duration-300 group-hover:scale-110"
        />
        {off > 0 && (
          <span className="absolute left-3 top-3 badge bg-danger text-white">
            {t('product.offPercent', { percent: off })}
          </span>
        )}
        {product.stock <= 0 && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm font-bold text-ink-600">
            {t('product.outOfStock')}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-1 font-heading text-sm font-semibold text-ink-900 group-hover:text-brand-700">
          {name}
        </h3>
        <p className="line-clamp-1 text-xs text-ink-500">{pick(product, 'subtitle')}</p>

        <div className="mt-auto flex items-end justify-between pt-2">
          <div>
            <span className="font-heading text-lg font-bold text-brand-700">
              {money(product.price)}
            </span>
            {off > 0 && (
              <span className="ml-1.5 text-xs text-ink-400 line-through">
                {money(product.originalPrice)}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onAdd}
            disabled={product.stock <= 0}
            aria-label={t('product.addToCartAria', { name })}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition-colors duration-200 hover:bg-brand-600 hover:text-white disabled:cursor-not-allowed disabled:bg-ink-100 disabled:text-ink-400"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs text-ink-400">
          <span className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            {product.rating.toFixed(1)}
          </span>
          <span>{t('product.soldCount', { count: product.sales })}</span>
          <span className="ml-auto">{t('product.stockCount', { count: product.stock })}</span>
        </div>
      </div>
    </Link>
  );
}
