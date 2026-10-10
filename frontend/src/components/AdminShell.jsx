import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import NotificationBell from './NotificationBell';
import LanguageSelect from './LanguageSelect';
import { useLanguage } from '../context/LanguageContext';

const ADMIN_LINKS = [
  { to: '/admin/dashboard', label: 'Ticket Queue', icon: 'queue' },
  { to: '/admin/analytics', label: 'Department Analytics', icon: 'chart' },
  { to: '/admin/hotspots', label: 'Hotspots', icon: 'map' },
  { to: '/admin/officers', label: 'Officers', icon: 'users' },
  { to: '/admin/reports', label: 'Reports', icon: 'report' },
  { to: '/admin/insights', label: 'AI Insights', icon: 'spark' },
];

const DEPT_ADMIN_LINKS = [{ to: '/admin/dashboard', label: 'Ticket Queue', icon: 'queue' }];

function Icon({ name, className = 'h-5 w-5' }) {
  const paths = {
    queue: <><path d="M4 5h16v14H4z" /><path d="M8 9h8M8 13h8M8 17h5" /></>,
    chart: <><path d="M4 19V5M4 19h16" /><path d="m8 15 3-4 3 2 4-6" /></>,
    map: <><path d="m3 6 5-2 8 2 5-2v14l-5 2-8-2-5 2z" /><path d="M8 4v14M16 6v14" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    report: <><path d="M6 2h9l5 5v15H6z" /><path d="M14 2v6h6M9 13h8M9 17h8" /></>,
    spark: <><path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4z" /><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" /></>,
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M15 3h5v18h-5" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" /></>,
    moon: <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>{paths[name]}</svg>;
}

export default function AdminShell({ children, searchValue = '', onSearchChange, searchPlaceholder = 'Search grievances...' }) {
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const links = user?.role === 'admin' ? ADMIN_LINKS : DEPT_ADMIN_LINKS;
  const initials = user?.name?.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'AD';

  function handleLogout() {
    logout();
    navigate('/admin/login');
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="border-b border-paper-line px-6 py-6 dark:border-board-line">
        <Link to="/admin/dashboard" className="text-2xl font-bold tracking-tight text-civic dark:text-seal-green">{t('Admin Portal')}</Link>
        <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-ink-soft">{t('Civic Governance')}</p>
      </div>
      <nav className="flex-1 space-y-1 px-4 py-6">
        {links.map((link) => {
          const active = location.pathname === link.to;
          return (
            <Link key={link.to} to={link.to} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 rounded-md px-4 py-3 text-sm font-medium transition-colors ${active ? 'bg-civic-soft text-civic dark:bg-civic/20 dark:text-seal-green' : 'text-ink-soft hover:bg-paper-warm hover:text-ink dark:hover:bg-board-line dark:hover:text-paper'}`}>
              <Icon name={link.icon} />
              {t(link.label)}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-paper-line p-4 dark:border-board-line">
        <div className="mb-3 flex items-center gap-3 rounded-md bg-paper-warm p-3 dark:bg-board-line">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-civic text-sm font-semibold text-white">{initials}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink dark:text-paper">{user?.name}</p>
            <p className="truncate text-xs capitalize text-ink-soft">{user?.role?.replace('_', ' ')}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-md px-4 py-2.5 text-sm font-medium text-ink-soft hover:bg-red-50 hover:text-stamp-red dark:hover:bg-red-950/30">
          <Icon name="logout" /> {t('Log out')}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-paper dark:bg-board">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-paper-line bg-white dark:border-board-line dark:bg-board lg:block">{sidebar}</aside>
      {mobileOpen && <div className="fixed inset-0 z-50 bg-black/30 lg:hidden" onClick={() => setMobileOpen(false)}><aside className="h-full w-72 bg-white dark:bg-board" onClick={(event) => event.stopPropagation()}>{sidebar}</aside></div>}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-[72px] items-center gap-3 border-b border-paper-line bg-white/95 px-4 backdrop-blur dark:border-board-line dark:bg-board/95 sm:px-6">
          <button onClick={() => setMobileOpen(true)} className="rounded-md p-2 text-ink-soft hover:bg-paper-warm lg:hidden" aria-label={t('Open navigation')}><Icon name="menu" /></button>
          <Link to="/admin/dashboard" className="text-lg font-bold text-civic lg:hidden">Civic AI</Link>
          {onSearchChange && (
            <div className="relative hidden max-w-lg flex-1 md:block">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
              <input value={searchValue} onChange={(event) => onSearchChange(event.target.value)} placeholder={t(searchPlaceholder)} className="w-full rounded-lg border border-paper-line bg-paper-warm py-2.5 pl-12 pr-4 text-sm text-ink focus:border-civic focus:outline-none focus:ring-2 focus:ring-civic/15 dark:border-board-line dark:bg-board-line dark:text-paper" />
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            <LanguageSelect />
            <NotificationBell />
            <button onClick={toggleTheme} className="rounded-md p-2 text-ink-soft hover:bg-paper-warm dark:hover:bg-board-line" aria-label="Toggle color theme"><Icon name={theme === 'dark' ? 'sun' : 'moon'} /></button>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-civic text-xs font-semibold text-white">{initials}</span>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
