import { motion } from 'framer-motion';

export default function AuthLayout({ title, subtitle, children, gradient = 'from-blue-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950' }) {
  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${gradient} px-4`}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-6">
          <span className="inline-block text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
            Civic AI
          </span>
        </div>
        <div className="glass-surface border border-white/60 dark:border-slate-700/60 rounded-2xl shadow-xl shadow-slate-900/5 p-8">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </motion.div>
    </div>
  );
}
