import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function FloatingActionButton({ to, onClick, icon = '+', label }) {
  const inner = (
    <motion.span
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="flex items-center gap-2 px-5 py-3 rounded-full bg-ink text-paper border border-ink"
    >
      <span className="text-lg leading-none">{icon}</span>
      {label && <span className="text-sm font-medium">{label}</span>}
    </motion.span>
  );

  const wrapperClass = 'fixed bottom-6 left-6 z-40 sm:hidden';

  if (to) {
    return (
      <Link to={to} className={wrapperClass} aria-label={label}>
        {inner}
      </Link>
    );
  }
  return (
    <button onClick={onClick} className={wrapperClass} aria-label={label}>
      {inner}
    </button>
  );
}
