import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PackageSearch, Search, SlidersHorizontal } from 'lucide-react';
import { api, type Paged } from '../lib/api';
import type { Category, Product } from '../types';
import ProductCard from '../components/ProductCard';
import { Empty, Loading, Pagination } from '../components/ui';
import { useI18n } from '../i18n';

const SORT_VALUES = ['default', 'sales', 'new', 'price-asc', 'price-desc'] as const;

export default function Products() {
  const { t, pick } = useI18n();
  const [params, setParams] = useSearchParams();
  const keyword = params.get('keyword') || '';
  const categoryId = params.get('categoryId') || '';
  const sort = params.get('sort') || 'default';
  const page = Number(params.get('page') || 1);

  const [categories, setCategories] = useState<Category[]>([]);
  const [data, setData] = useState<Paged<Product>>({
    list: [],
    total: 0,
    page: 1,
    pageSize: 12,
  });
  const [loading, setLoading] = useState(true);
  const [kwInput, setKwInput] = useState(keyword);

  useEffect(() => setKwInput(keyword), [keyword]);

  useEffect(() => {
    api.categories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .products({ keyword, categoryId, sort, page, pageSize: 12 })
      .then((r) => alive && setData(r))
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [keyword, categoryId, sort, page]);

  const update = (patch: Record<string, string | number>) => {
    const next: Record<string, string> = {};
    params.forEach((v, k) => (next[k] = v));
    Object.entries(patch).forEach(([k, v]) => {
      if (v === '' || v === undefined) delete next[k];
      else next[k] = String(v);
    });
    setParams(next);
  };

  return (
    <div className="container-page py-8">
      <div className="flex flex-wrap items-center gap-3">
        <form
          className="flex flex-1 items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            update({ keyword: kwInput, page: 1 });
          }}
        >
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              value={kwInput}
              onChange={(e) => setKwInput(e.target.value)}
              className="input pl-9"
              placeholder={t('nav.searchAria')}
              aria-label={t('nav.searchAria')}
            />
          </div>
          <button type="submit" className="btn-primary">
            {t('common.search')}
          </button>
        </form>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-ink-400" />
          <select
            value={sort}
            onChange={(e) => update({ sort: e.target.value, page: 1 })}
            className="input w-36 cursor-pointer py-2.5"
            aria-label={t('products.sortAria')}
          >
            {SORT_VALUES.map((value) => (
              <option key={value} value={value}>
                {t(`products.sort.${value.replace(/-(\w)/g, (_, c: string) => c.toUpperCase())}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => update({ categoryId: '', page: 1 })}
          className={`cursor-pointer rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
            !categoryId
              ? 'bg-brand-600 text-white'
              : 'bg-white text-ink-600 hover:bg-brand-50 hover:text-brand-700'
          }`}
        >
          {t('common.all')}
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => update({ categoryId: c.id, page: 1 })}
            className={`cursor-pointer rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              categoryId === c.id
                ? 'bg-brand-600 text-white'
                : 'bg-white text-ink-600 hover:bg-brand-50 hover:text-brand-700'
            }`}
          >
            {pick(c, 'name')}
          </button>
        ))}
      </div>

      <p className="mt-5 text-sm text-ink-500">
        {t('products.total', { count: data.total })}
        {keyword && <> · {t('products.keyword', { keyword })}</>}
      </p>

      {loading ? (
        <Loading />
      ) : data.list.length === 0 ? (
        <Empty
          icon={<PackageSearch className="h-12 w-12" />}
          title={t('products.empty.title')}
          desc={t('products.empty.desc')}
        />
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {data.list.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      <Pagination
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        onChange={(p) => update({ page: p })}
      />
    </div>
  );
}
