import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
];

export default function PublicNav() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  return (
    <nav className="sticky top-0 z-40 bg-paper dark:bg-board border-b border-paper-line dark:border-board-line">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 max-w-6xl mx-auto">
        <div className="flex items-center gap-6">
          <Link to="/" className="font-display font-bold text-xl uppercase tracking-wide text-ink dark:text-paper">
            Civic AI
          </Link>
          <div className="hidden sm:flex items-center gap-1">
            {LINKS.map((link) => {
              const active = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-3 py-1.5 text-sm border-b-2 transition-colors ${
                    active
                      ? 'border-brass text-ink dark:text-paper font-medium'
                      : 'border-transparent text-ink-soft hover:text-ink dark:hover:text-paper'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="w-8 h-8 flex items-center justify-center text-ink-soft hover:bg-paper-warm dark:hover:bg-board-line transition-colors"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <Link
            to="/login"
            className="px-3 py-1.5 text-sm text-ink-soft hover:text-ink dark:hover:text-paper transition-colors"
          >
            Log in
          </Link>
          <Link
            to="/register"
            className="px-3 py-1.5 text-sm bg-ink text-paper hover:bg-ink/90 transition-colors"
          >
            Register
          </Link>
        </div>
      </div>
    </nav>
  );
}
