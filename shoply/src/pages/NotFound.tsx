import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { useI18n } from '../i18n';

export default function NotFound() {
  const { t } = useI18n();

  return (
    <div className="container-page flex flex-col items-center gap-4 py-24 text-center">
      <Compass className="h-14 w-14 text-brand-400" />
      <h1 className="font-heading text-3xl font-bold">404</h1>
      <p className="text-sm text-ink-500">{t('notFound.desc')}</p>
      <Link to="/" className="btn-primary mt-2">
        {t('common.backHome')}
      </Link>
    </div>
  );
}
