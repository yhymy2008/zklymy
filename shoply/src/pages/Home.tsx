import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Headset,
  RotateCcw,
  Search,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { api } from '../lib/api';
import type { Category, Product } from '../types';
import { useSettings } from '../lib/useSettings';
import ProductCard from '../components/ProductCard';
import ProductThumb from '../components/ProductThumb';
import { Loading } from '../components/ui';
import { useI18n } from '../i18n';

export default function Home() {
  const settings = useSettings();
  const navigate = useNavigate();
  const { t, money, pick } = useI18n();
  const [categories, setCategories] = useState<Category[]>([]);
  const [hot, setHot] = useState<Product[]>([]);
  const [latest, setLatest] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    let alive = true;
    Promise.all([
      api.categories(),
      api.products({ sort: 'sales', pageSize: 8 }),
      api.products({ sort: 'new', pageSize: 4 }),
    ])
      .then(([cats, hotRes, newRes]) => {
        if (!alive) return;
        setCategories(cats);
        setHot(hotRes.list);
        setLatest(newRes.list);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = keyword.trim();
    navigate(q ? `/products?keyword=${encodeURIComponent(q)}` : '/products');
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900">
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              'radial-gradient(circle at 15% 20%, #fff 0, transparent 35%), radial-gradient(circle at 85% 70%, #A78BFA 0, transparent 40%)',
          }}
        />
        <div className="container-page relative py-16 text-center sm:py-24">
          <span className="badge bg-white/15 text-white ring-1 ring-white/30">
            <BadgeCheck className="h-3.5 w-3.5" /> {t('home.hero.badge')}
          </span>
          <h1 className="mt-5 font-heading text-3xl font-bold leading-tight text-white sm:text-5xl">
            {pick(settings, 'slogan')}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-white/80 sm:text-base">
            {t('home.hero.subtitle', {
              amount: money(settings.freeShippingThreshold, settings.currency),
            })}
          </p>

          <form
            onSubmit={onSearch}
            className="mx-auto mt-8 flex max-w-xl items-center gap-2 rounded-2xl bg-white p-2 shadow-lift"
          >
            <Search className="ml-2 h-5 w-5 shrink-0 text-ink-400" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-ink-400"
              placeholder={t('home.hero.placeholder')}
              aria-label={t('nav.searchAria')}
            />
            <button type="submit" className="btn-primary">
              {t('common.search')}
            </button>
          </form>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-white/85">
            <span className="flex items-center gap-1.5">
              <Truck className="h-4 w-4" /> {t('home.hero.freeShipping')}
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" /> {t('home.feature.authentic.title')}
            </span>
            <span className="flex items-center gap-1.5">
              <RotateCcw className="h-4 w-4" /> {t('home.hero.returns')}
            </span>
            <span className="flex items-center gap-1.5">
              <Headset className="h-4 w-4" /> {t('home.hero.support')}
            </span>
          </div>
        </div>
      </section>

      {/* 分类 */}
      {categories.length > 0 && (
        <section className="container-page -mt-8">
          <div className="card grid grid-cols-3 gap-2 p-4 sm:grid-cols-4 lg:grid-cols-7">
            {categories.map((c) => {
              return (
                <Link
                  key={c.id}
                  to={`/products?categoryId=${c.id}`}
                  className="group flex cursor-pointer flex-col items-center gap-2 rounded-xl px-2 py-3 transition-colors hover:bg-brand-50"
                >
                  <span className="sr-only">{pick(c, 'name')}</span>
                  <ProductThumb
                    hue={(c.name.length * 37) % 360}
                    icon={c.icon}
                    className="h-12 w-12 rounded-xl"
                    iconClassName="h-6 w-6"
                  />
                  <span className="text-xs font-semibold text-ink-700 group-hover:text-brand-700">
                    {pick(c, 'name')}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* 热卖 */}
      <section className="container-page mt-14">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="font-heading text-2xl font-bold">{t('home.hot.title')}</h2>
            <p className="mt-1 text-sm text-ink-500">{t('home.hot.desc')}</p>
          </div>
          <Link
            to="/products?sort=sales"
            className="flex cursor-pointer items-center gap-1 text-sm font-semibold text-brand-700 hover:gap-2"
          >
            {t('common.viewAll')} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <Loading />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {hot.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* 新品 */}
      {latest.length > 0 && (
        <section className="container-page mt-14">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="font-heading text-2xl font-bold">{t('home.new.title')}</h2>
              <p className="mt-1 text-sm text-ink-500">{t('home.new.desc')}</p>
            </div>
            <Link
              to="/products?sort=new"
              className="flex cursor-pointer items-center gap-1 text-sm font-semibold text-brand-700 hover:gap-2"
            >
              {t('common.viewAll')} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {latest.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* 服务保障 */}
      <section className="container-page mt-14">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: ShieldCheck,
              title: t('home.feature.authentic.title'),
              desc: t('home.feature.authentic.desc'),
            },
            {
              icon: Truck,
              title: t('home.feature.fast.title'),
              desc: t('home.feature.fast.desc'),
            },
            {
              icon: RotateCcw,
              title: t('home.feature.returns.title'),
              desc: t('home.feature.returns.desc'),
            },
          ].map((f) => (
            <div key={f.title} className="card flex items-start gap-4 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <f.icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-heading text-sm font-bold">{f.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-ink-500">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
