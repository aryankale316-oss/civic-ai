import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';

export default function NotFound() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen flex items-center justify-center bg-paper dark:bg-board px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center"
      >
        <p className="text-7xl font-display font-bold text-ink dark:text-paper">404</p>
        <p className="text-lg font-medium text-ink dark:text-paper mt-2">{t('Page not found')}</p>
        <p className="text-sm text-ink-soft mt-1">{t("The page you're looking for doesn't exist or has moved.")}</p>
        <Link
          to="/"
          className="inline-block mt-6 px-5 py-2 text-sm bg-ink text-paper hover:bg-ink/90 transition-colors"
        >
          {t('Go home')}
        </Link>
      </motion.div>
    </div>
  );
}
