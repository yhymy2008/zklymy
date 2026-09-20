import { useEffect, useState } from 'react';
import { api } from './api';
import type { Settings } from '../types';

const DEFAULTS: Settings = {
  siteName: 'Shoply',
  slogan: '好物精选，放心购',
  currency: 'CNY',
  shippingFee: 12,
  freeShippingThreshold: 199,
  supportPhone: '400-800-1234',
  supportEmail: 'support@shoply.com',
  defaultLocale: 'zh',
  translations: {
    en: { slogan: 'Curated goods, shop with confidence' },
    ja: { slogan: '厳選された商品を、安心して' },
  },
};

let cache: Settings = DEFAULTS;
let loaded = false;

export function useSettings(): Settings {
  const [s, setS] = useState<Settings>(cache);
  useEffect(() => {
    if (loaded) return;
    let alive = true;
    api
      .settings()
      .then((v) => {
        cache = v;
        loaded = true;
        if (alive) setS(v);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return s;
}

export function refreshSettingsCache(v: Settings) {
  cache = v;
  loaded = true;
}

export { DEFAULTS as DEFAULT_SETTINGS };
