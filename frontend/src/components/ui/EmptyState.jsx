import { motion } from 'framer-motion';

export default function EmptyState({ icon = '📭', title, description, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center text-center py-16 px-6"
    >
      <span className="text-4xl mb-3">{icon}</span>
      <p className="text-base font-medium text-slate-700 dark:text-slate-200">{title}</p>
      {description && <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </motion.div>
  );
}
