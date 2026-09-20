import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useI18n } from '../i18n';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastApi {
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
}

const ToastCtx = createContext<ToastApi>({
  success: () => {},
  error: () => {},
  info: () => {},
});

let seed = 0;

const STYLE: Record<ToastType, { cls: string; Icon: typeof Info }> = {
  success: { cls: 'bg-emerald-600', Icon: CheckCircle2 },
  error: { cls: 'bg-danger', Icon: AlertCircle },
  info: { cls: 'bg-brand-600', Icon: Info },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t: translate } = useI18n();
  const [list, setList] = useState<ToastItem[]>([]);

  const push = useCallback((type: ToastType, message: string) => {
    const id = ++seed;
    setList((s) => [...s, { id, type, message }]);
    setTimeout(() => setList((s) => s.filter((t) => t.id !== id)), 3000);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push('success', m),
      error: (m) => push('error', m),
      info: (m) => push('info', m),
    }),
    [push]
  );

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed left-1/2 top-4 z-[100] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4">
        {list.map((t) => {
          const { cls, Icon } = STYLE[t.type];
          return (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto flex animate-fade-in-up items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg ${cls}`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{t.message}</span>
              <button
                type="button"
                aria-label={translate('common.closeToast')}
                onClick={() => setList((s) => s.filter((x) => x.id !== t.id))}
                className="cursor-pointer rounded p-0.5 hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
