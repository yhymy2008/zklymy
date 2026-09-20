import type { OrderStatus } from '../types';

/**
 * 与语言无关的日期格式化。
 * 组件内优先使用 useI18n() 的 money / date，它们会跟随当前语言。
 */
export function formatDate(iso: string | undefined, withTime = true): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  const p = (x: number) => String(x).padStart(2, '0');
  const date = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  return withTime ? `${date} ${p(d.getHours())}:${p(d.getMinutes())}` : date;
}

/** 订单状态配色（文案由 i18n 提供）。 */
export const ORDER_STATUS_CLASS: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-brand-100 text-brand-700',
  shipped: 'bg-sky-100 text-sky-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-ink-100 text-ink-500',
};

export const ORDER_STATUS_SEQUENCE: OrderStatus[] = [
  'pending',
  'paid',
  'shipped',
  'completed',
];

export function maskSecret(s?: string): string {
  if (!s) return '';
  if (s.length <= 8) return '******';
  return `${s.slice(0, 4)}****${s.slice(-4)}`;
}
