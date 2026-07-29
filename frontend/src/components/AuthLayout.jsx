import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function AuthLayout({ title, subtitle, children, staff = false }) {
  return (
    <div className="min-h-screen bg-paper dark:bg-board">
      <header className="flex h-16 items-center justify-between border-b border-paper-line bg-white px-5 dark:border-board-line dark:bg-board sm:px-10">
        <Link to="/" className="text-xl font-bold text-civic dark:text-seal-green">
          Civic AI
        </Link>
        <p className="hidden text-sm font-medium text-ink-soft sm:block">
          Transparency through innovation
        </p>
      </header>

      <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
        <div className="hidden city-hero relative items-end p-14 lg:flex">
          <div className="absolute inset-0 bg-[#0b1424]/50" />
          <p className="relative max-w-md text-3xl font-display font-semibold leading-tight text-white">
            “Better cities begin when every voice can be heard.”
          </p>
        </div>

        <div className="flex items-center justify-center px-4 py-10 sm:px-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="w-full max-w-lg"
          >
            <div className="rounded-lg border border-paper-line bg-white p-7 shadow-sm dark:border-board-line dark:bg-board sm:p-10">
              {staff && (
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-civic dark:text-seal-green">
                  Authorized staff portal
                </p>
              )}

              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-seal-green">
                {staff ? 'Staff portal' : 'Citizen portal'}
              </p>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink dark:text-paper">
                {title}
              </h1>

              {subtitle && (
                <p className="mt-2 text-base leading-6 text-ink-soft">
                  {subtitle}
                </p>
              )}

              <div className="mt-8">{children}</div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}