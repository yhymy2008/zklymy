import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { zh } from './locales/zh';
import { en } from './locales/en';
import { ja } from './locales/ja';
import { setApiErrorTranslator } from '../lib/api';

export type Locale = 'zh' | 'en' | 'ja';
export type { Dict } from './locales/zh';

export const LOCALES: { code: Locale; native: string; intl: string; short: string }[] = [
  { code: 'zh', native: '简体中文', intl: 'zh-CN', short: '中' },
  { code: 'en', native: 'English', intl: 'en-US', short: 'EN' },
  { code: 'ja', native: '日本語', intl: 'ja-JP', short: '日' },
];

const DICTS: Record<Locale, Record<string, string>> = { zh, en, ja };
const STORAGE_KEY = 'shoply.locale';

const CURRENCY_SYMBOL: Record<string, string> = {
  CNY: '¥',
  JPY: '¥',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

type Vars = Record<string, string | number>;

function interpolate(text: string, vars?: Vars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (raw, key: string) =>
    vars[key] === undefined ? raw : String(vars[key])
  );
}

export function isLocale(v: unknown): v is Locale {
  return v === 'zh' || v === 'en' || v === 'ja';
}

function detectLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    /* localStorage 不可用（隐私模式等）时忽略 */
  }
  const nav = (typeof navigator !== 'undefined' && navigator.language
    ? navigator.language
    : 'zh'
  ).toLowerCase();
  if (nav.startsWith('ja')) return 'ja';
  if (nav.startsWith('zh')) return 'zh';
  if (nav.startsWith('en')) return 'en';
  return 'zh';
}

/**
 * 读取实体的本地化字段：优先 translations[locale][field]，回落到实体本身的字段。
 * 服务端数据形如 { name, translations: { en: { name }, ja: { name } } }。
 */
export function pickLocalized(
  entity: unknown,
  field: string,
  locale: Locale
): string {
  if (!entity || typeof entity !== 'object') return '';
  const obj = entity as Record<string, unknown>;
  const tr = obj.translations;
  if (tr && typeof tr === 'object') {
    const value = (tr as Record<string, Record<string, unknown>>)[locale]?.[field];
    if (typeof value === 'string' && value) return value;
  }
  const base = obj[field];
  return typeof base === 'string' ? base : '';
}

export interface I18nValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** 按 key 取词，支持 {name} 插值，缺失时回落到中文再回落到 key 本身。 */
  t: (key: string, vars?: Vars) => string;
  /** 金额格式化（默认 CNY）。 */
  money: (n: number, currency?: string) => string;
  num: (n: number) => string;
  /** 日期时间格式化。 */
  date: (iso?: string, withTime?: boolean) => string;
  /** 订单状态等固定枚举的本地化文案。 */
  status: (status: string) => string;
  /** 订单时间轴：优先按 code 翻译，旧数据回落到 text。 */
  timeline: (item: { code?: string; text?: string; params?: Vars }) => string;
  /** 实体字段本地化（商品名、分类名、渠道名等）。 */
  pick: (entity: unknown, field: string) => string;
  intl: string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => detectLocale());

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* 忽略写入失败 */
    }
  }, []);

  const t = useCallback(
    (key: string, vars?: Vars) => {
      const dict = DICTS[locale] || DICTS.zh;
      const text = dict[key] ?? (DICTS.zh as Record<string, string>)[key] ?? key;
      return interpolate(text, vars);
    },
    [locale]
  );

  // 接口错误码 -> 当前语言文案
  useEffect(() => {
    setApiErrorTranslator((code, params) => {
      const dict = DICTS[locale] || DICTS.zh;
      if (!(code in dict)) return undefined;
      return interpolate(dict[code], params as Vars | undefined);
    });
    return () => setApiErrorTranslator(null);
  }, [locale, t]);

  useEffect(() => {
    const meta = LOCALES.find((l) => l.code === locale) || LOCALES[0];
    document.documentElement.lang = meta.intl;
  }, [locale]);

  const value = useMemo<I18nValue>(() => {
    const intl = (LOCALES.find((l) => l.code === locale) || LOCALES[0]).intl;
    const pad = (x: number) => String(x).padStart(2, '0');

    const num = (n: number) => new Intl.NumberFormat(intl).format(Number(n) || 0);

    const money = (n: number, currency = 'CNY') => {
      const digits = currency === 'JPY' ? 0 : 2;
      const formatted = new Intl.NumberFormat(intl, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format(Number(n) || 0);
      return `${CURRENCY_SYMBOL[currency] || '¥'}${formatted}`;
    };

    const date = (iso?: string, withTime = true) => {
      if (!iso) return '-';
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return '-';
      const ymd = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      return withTime ? `${ymd} ${pad(d.getHours())}:${pad(d.getMinutes())}` : ymd;
    };

    return {
      locale,
      setLocale,
      t,
      money,
      num,
      date,
      status: (status: string) => {
        const key = `status.${status}`;
        const dict = DICTS[locale] || DICTS.zh;
        return dict[key] ?? (DICTS.zh as Record<string, string>)[key] ?? status;
      },
      timeline: (item) => {
        if (item?.code) {
          const dict = DICTS[locale] || DICTS.zh;
          const text = dict[item.code];
          if (typeof text === 'string') return interpolate(text, item.params);
        }
        return item?.text || '';
      },
      pick: (entity, field) => pickLocalized(entity, field, locale),
      intl,
    };
  }, [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within <I18nProvider>');
  return ctx;
}
