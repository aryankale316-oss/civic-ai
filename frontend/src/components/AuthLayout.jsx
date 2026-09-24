import { motion } from 'framer-motion';

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-paper">
      <div className="hidden lg:flex city-hero relative items-end p-14">
        <div className="absolute inset-0 bg-[#0b1424]/50" />
        <p className="relative max-w-md text-3xl font-display font-semibold leading-tight text-white">“Better cities begin when every voice can be heard.”</p>
      </div>
      <div className="flex items-center justify-center px-5 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-6">
          <span className="inline-block font-display font-bold text-2xl tracking-tight text-ink">
            CIVIC <span className="text-seal-green">AI</span>
          </span>
        </div>
        <div className="bg-white rounded-2xl border border-paper-line p-8 shadow-xl shadow-[#0b1424]/5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-seal-green">Citizen portal</p>
          <h1 className="mt-2 text-2xl font-semibold text-ink">{title}</h1>
          {subtitle && <p className="text-sm text-ink-soft mt-1">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </motion.div>
      </div>
    </div>
  );
}
