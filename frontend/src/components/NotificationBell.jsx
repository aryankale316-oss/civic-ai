import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useNotifications } from '../context/NotificationContext';

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleClick(n) {
    if (!n.is_read) markRead(n.id);
    setOpen(false);
    if (n.complaint_id) navigate(`/complaints/${n.complaint_id}`);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-paper-warm dark:hover:bg-board-line"
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-stamp-red text-white text-[10px] leading-none font-mono">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-50 mt-2 max-h-96 w-80 overflow-y-auto rounded-lg border border-paper-line bg-white shadow-lg dark:border-board-line dark:bg-board sm:w-96"
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-paper-line dark:border-board-line">
              <span className="text-sm font-medium text-ink dark:text-paper">Notifications</span>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-ink-soft hover:text-ink dark:hover:text-paper">
                  Mark all read
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <p className="text-sm text-ink-soft text-center py-6">No notifications yet.</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`relative w-full text-left px-3 py-2 border-b border-paper-line dark:border-board-line hover:bg-paper-warm dark:hover:bg-board-line/50 ${
                    n.is_read ? '' : 'bg-civic-soft/50 dark:bg-civic/10'
                  }`}
                >
                  {!n.is_read && <span className="absolute left-1 top-3 h-1.5 w-1.5 rounded-full bg-civic" />}
                  <p className="text-sm text-ink dark:text-paper pl-2">{n.title}</p>
                  <p className="text-xs text-ink-soft pl-2">{n.message}</p>
                  <p className="text-[10px] font-mono text-ink-soft mt-0.5 pl-2">{timeAgo(n.created_at)}</p>
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
