import { motion } from 'framer-motion';

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-paper dark:bg-board px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-6">
          <span className="inline-block font-display font-bold text-2xl uppercase tracking-wide text-ink dark:text-paper">
            Civic AI
          </span>
        </div>
        <div className="bg-white dark:bg-board border border-paper-line dark:border-board-line p-8">
          <h1 className="text-xl font-semibold text-ink dark:text-paper">{title}</h1>
          {subtitle && <p className="text-sm text-ink-soft mt-1">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </motion.div>
    </div>
  );
}
