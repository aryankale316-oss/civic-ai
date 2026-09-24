import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import NotificationBell from './NotificationBell';

const CITIZEN_LINKS = [{ to: '/complaints/new', label: 'New Complaint' }];

const ADMIN_LINKS = [
  { to: '/admin/dashboard', label: 'Dashboard' },
  { to: '/admin/analytics', label: 'Analytics' },
  { to: '/admin/hotspots', label: 'Hotspots' },
  { to: '/admin/officers', label: 'Officers' },
  { to: '/admin/departments', label: 'Departments' },
  { to: '/admin/reports', label: 'Reports' },
  { to: '/admin/insights', label: 'Insights' },
];

// Cross-department analytics/officer-management stay platform-admin only;
// a dept_admin only needs their own (already department-scoped) queue.
const DEPT_ADMIN_LINKS = [{ to: '/admin/dashboard', label: 'Dashboard' }];

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
      className="w-8 h-8 flex items-center justify-center text-ink-soft hover:bg-paper-warm dark:hover:bg-board-line transition-colors"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}

function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = user.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-8 h-8 rounded-full border border-ink dark:border-paper-line text-ink dark:text-paper text-xs font-mono font-semibold flex items-center justify-center hover:bg-paper-warm dark:hover:bg-board-line transition-colors"
        aria-label="Account menu"
      >
        {initials}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-48 bg-white dark:bg-board border border-paper-line dark:border-board-line overflow-hidden z-50"
          >
            <div className="px-4 py-3 border-b border-paper-line dark:border-board-line">
              <p className="text-sm font-medium text-ink dark:text-paper truncate">{user.name}</p>
              <p className="text-xs text-ink-soft uppercase tracking-wide font-mono">{user.role}</p>
            </div>
            <Link
              to="/profile"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm text-ink dark:text-paper hover:bg-paper-warm dark:hover:bg-board-line"
            >
              Profile & settings
            </Link>
            <button
              onClick={onLogout}
              className="w-full text-left px-4 py-2.5 text-sm text-stamp-red hover:bg-paper-warm dark:hover:bg-board-line"
            >
              Log out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isStaff = user?.role === 'admin' || user?.role === 'dept_admin';

  function handleLogout() {
    logout();
    navigate(isStaff ? '/admin/login' : '/login');
  }

  const links =
    user?.role === 'admin' ? ADMIN_LINKS : user?.role === 'dept_admin' ? DEPT_ADMIN_LINKS : user?.role === 'citizen' ? CITIZEN_LINKS : [];

  return (
    <nav className="sticky top-0 z-40 bg-paper dark:bg-board border-b border-paper-line dark:border-board-line">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3">
        <div className="flex items-center gap-6">
          <Link
            to={isStaff ? '/admin/dashboard' : '/dashboard'}
            className="font-display font-bold text-xl uppercase tracking-wide text-ink dark:text-paper"
          >
            Civic AI
          </Link>

          {user && (
            <div className="hidden md:flex items-center gap-1">
              {links.map((link) => {
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
          )}
        </div>

        <div className="flex items-center gap-2">
          {user && (
            <>
              <button
                onClick={() => setMobileOpen((o) => !o)}
                className="md:hidden w-8 h-8 flex items-center justify-center text-ink-soft hover:bg-paper-warm dark:hover:bg-board-line"
                aria-label="Toggle menu"
              >
                {mobileOpen ? '✕' : '☰'}
              </button>
              <ThemeToggle />
              <NotificationBell />
              <UserMenu user={user} onLogout={handleLogout} />
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {user && mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden border-t border-paper-line dark:border-board-line"
          >
            <div className="flex flex-col p-2">
              {links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-2 text-sm text-ink-soft hover:bg-paper-warm dark:hover:bg-board-line"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {user?.role === 'citizen' && (
        <div className="fixed bottom-4 left-4 right-4 z-50 flex items-center justify-around rounded-2xl border border-white/10 bg-[#0b1424]/95 px-2 py-2 text-xs text-[#a6b6c8] shadow-2xl backdrop-blur md:hidden">
          <Link to="/dashboard" className={`px-3 py-2 ${location.pathname === '/dashboard' ? 'text-[#55e0ce]' : ''}`}>Home</Link>
          <Link to="/complaints/new" className={`rounded-xl px-3 py-2 ${location.pathname === '/complaints/new' ? 'bg-[#55e0ce] text-[#0b1424]' : ''}`}>Report</Link>
          <Link to="/profile" className={`px-3 py-2 ${location.pathname === '/profile' ? 'text-[#55e0ce]' : ''}`}>Profile</Link>
        </div>
      )}
    </nav>
  );
}
