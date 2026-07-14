import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center"
      >
        <p className="text-7xl font-bold bg-gradient-to-r from-slate-700 to-slate-400 dark:from-slate-200 dark:to-slate-500 bg-clip-text text-transparent">
          404
        </p>
        <p className="text-lg font-medium text-slate-700 dark:text-slate-200 mt-2">Page not found</p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">The page you're looking for doesn't exist or has moved.</p>
        <Link
          to="/"
          className="inline-block mt-6 px-5 py-2 text-sm bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-md hover:bg-slate-700 dark:hover:bg-white transition-colors"
        >
          Go home
        </Link>
      </motion.div>
    </div>
  );
}
