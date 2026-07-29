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
    <nav className="sticky top-0 z-40 border-b border-paper-line bg-white/95 backdrop-blur dark:border-board-line dark:bg-board/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-xl font-bold tracking-tight text-civic dark:text-seal-green">
            Civic AI
          </Link>
          <div className="hidden sm:flex items-center gap-1">
            {LINKS.map((link) => {
              const active = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`border-b-2 px-3 py-5 text-sm font-medium transition-colors ${
                    active
                      ? 'border-civic text-civic dark:border-seal-green dark:text-seal-green'
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
            className="flex h-9 w-9 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-paper-warm dark:hover:bg-board-line"
          >
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
          <Link
            to="/login"
            className="px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-civic"
          >
            Log in
          </Link>
          <Link
            to="/register"
            className="rounded-md bg-civic px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-civic-bright"
          >
            Register
          </Link>
        </div>
      </div>
    </nav>
  );
}
