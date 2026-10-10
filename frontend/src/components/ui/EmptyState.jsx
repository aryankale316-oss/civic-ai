import { motion } from 'framer-motion';
import { useLanguage } from '../../context/LanguageContext';

export default function EmptyState({ icon = '📭', title, description, action }) {
  const { t } = useLanguage();
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center rounded-lg border border-dashed border-paper-line bg-white/50 px-6 py-16 text-center dark:border-board-line dark:bg-board/50"
    >
      <span className="text-4xl mb-3">{icon}</span>
      <p className="text-base font-medium text-ink dark:text-paper">{t(title)}</p>
      {description && <p className="text-sm text-ink-soft mt-1 max-w-sm">{t(description)}</p>}
      {action && <div className="mt-4">{action}</div>}
    </motion.div>
  );
}
