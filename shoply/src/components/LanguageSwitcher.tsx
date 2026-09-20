import { useEffect, useRef, useState } from 'react';
import { Check, Globe } from 'lucide-react';
import { LOCALES, useI18n } from '../i18n';

interface Props {
  /** 下拉展开方向，导航栏用向下，后台侧边栏用向上。 */
  direction?: 'down' | 'up';
  className?: string;
}

export default function LanguageSwitcher({ direction = 'down', className = '' }: Props) {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const current = LOCALES.find((l) => l.code === locale) || LOCALES[0];

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={t('locale.label')}
        className="flex cursor-pointer items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-semibold text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900"
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">{current.native}</span>
      </button>

      {open && (
        <div
          role="listbox"
          className={`absolute right-0 z-50 w-40 animate-fade-in-up overflow-hidden rounded-xl border border-ink-200 bg-white py-1 shadow-lg ${
            direction === 'up' ? 'bottom-full mb-2' : 'mt-2'
          }`}
        >
          {LOCALES.map((item) => (
            <button
              key={item.code}
              type="button"
              role="option"
              aria-selected={item.code === locale}
              onClick={() => {
                setLocale(item.code);
                setOpen(false);
              }}
              className="flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left text-sm text-ink-700 hover:bg-ink-50"
            >
              <span>{item.native}</span>
              {item.code === locale && <Check className="h-4 w-4 text-brand-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
