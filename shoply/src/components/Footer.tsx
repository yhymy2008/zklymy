import { Link } from 'react-router-dom';
import { Mail, Phone, ShieldCheck, ShoppingBag, Truck } from 'lucide-react';
import { useSettings } from '../lib/useSettings';
import { useI18n } from '../i18n';

export default function Footer() {
  const s = useSettings();
  const { t, pick, money } = useI18n();
  const slogan = pick(s, 'slogan');
  return (
    <footer className="mt-16 border-t border-ink-200 bg-white">
      <div className="container-page grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
              <ShoppingBag className="h-5 w-5" />
            </span>
            <span className="font-heading text-xl font-bold">{s.siteName}</span>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-500">
            {t('footer.tagline', { slogan })}
          </p>
        </div>

        <div>
          <h4 className="mb-3 font-heading text-sm font-bold">{t('footer.guide')}</h4>
          <ul className="space-y-2 text-sm text-ink-600">
            <li>
              <Link to="/products" className="cursor-pointer hover:text-brand-700">
                {t('nav.products')}
              </Link>
            </li>
            <li>
              <Link to="/cart" className="cursor-pointer hover:text-brand-700">
                {t('nav.cart')}
              </Link>
            </li>
            <li>
              <Link to="/orders" className="cursor-pointer hover:text-brand-700">
                {t('nav.orders')}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 font-heading text-sm font-bold">{t('footer.service')}</h4>
          <ul className="space-y-2 text-sm text-ink-600">
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-success" /> {t('footer.authentic')}
            </li>
            <li className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-success" />{' '}
              {t('footer.freeShipping', { amount: money(s.freeShippingThreshold, s.currency) })}
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-success" /> {t('footer.returns')}
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 font-heading text-sm font-bold">{t('footer.contact')}</h4>
          <ul className="space-y-2 text-sm text-ink-600">
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4" /> {s.supportPhone}
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4" /> {s.supportEmail}
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink-100 py-5 text-center text-xs text-ink-400">
        {t('footer.copyright', { year: new Date().getFullYear(), site: s.siteName })}
      </div>
    </footer>
  );
}
