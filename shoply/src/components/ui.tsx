import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X } from 'lucide-react';
import type { OrderStatus } from '../types';
import { ORDER_STATUS_CLASS } from '../lib/format';
import { useI18n } from '../i18n';

export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return <Loader2 className={`${className} animate-spin`} />;
}

export function Loading({ text }: { text?: string }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink-500">
      <Spinner />
      {text ?? t('common.loading')}
    </div>
  );
}

export function Empty({
  icon,
  title,
  desc,
  action,
}: {
  icon?: ReactNode;
  title: string;
  desc?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      {icon && <div className="text-ink-300">{icon}</div>}
      <p className="font-heading text-lg font-semibold text-ink-700">{title}</p>
      {desc && <p className="max-w-sm text-sm text-ink-500">{desc}</p>}
      {action}
    </div>
  );
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useI18n();
  const className = ORDER_STATUS_CLASS[status] ?? ORDER_STATUS_CLASS.pending;
  return <span className={`badge ${className}`}>{t(`status.${status}`)}</span>;
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="label">
        {label}
        {hint && (
          <span className="ml-2 font-normal text-ink-400">{hint}</span>
        )}
      </label>
      {children}
      {error && <p className="mt-1 text-xs font-semibold text-danger">{error}</p>}
    </div>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  width = 'max-w-lg',
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  const { t } = useI18n();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  const closeLabel = t('common.close');

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-ink-900/40 p-4 backdrop-blur-sm sm:items-center">
      <div
        className={`w-full ${width} animate-fade-in-up rounded-2xl bg-white shadow-2xl`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <h3 className="font-heading text-base font-semibold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="cursor-pointer rounded-lg p-1 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-ink-100 px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (p: number) => void;
}) {
  const { t } = useI18n();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter(
    (n) => n === 1 || n === pages || Math.abs(n - page) <= 1
  );

  return (
    <nav
      className="mt-8 flex flex-wrap items-center justify-center gap-1.5"
      aria-label={t('common.pagination')}
    >
      <button
        type="button"
        className="btn-secondary px-3 py-2 text-xs"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        {t('common.prev')}
      </button>
      {nums.map((n, i) => (
        <span key={n} className="flex items-center gap-1.5">
          {i > 0 && n - nums[i - 1] > 1 && <span className="text-ink-400">…</span>}
          <button
            type="button"
            onClick={() => onChange(n)}
            className={`h-9 w-9 cursor-pointer rounded-lg text-sm font-semibold transition-colors ${
              n === page
                ? 'bg-brand-600 text-white'
                : 'bg-white text-ink-600 hover:bg-brand-50 hover:text-brand-700'
            }`}
          >
            {n}
          </button>
        </span>
      ))}
      <button
        type="button"
        className="btn-secondary px-3 py-2 text-xs"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        {t('common.next')}
      </button>
    </nav>
  );
}
