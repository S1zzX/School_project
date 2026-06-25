import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router';
import { Bell, CheckCheck, Loader2, Package, MessageSquare, ArrowLeftRight, Tag } from 'lucide-react';
import {
  apiGetNotifications,
  apiGetUnreadNotificationCount,
  apiMarkNotificationRead,
  apiMarkAllNotificationsRead,
  type NotificationAPI,
  type AuthUser,
} from '../lib/api';
import { useT } from '../lib/i18n';

const CATEGORY_ICON = {
  trades: ArrowLeftRight,
  support: MessageSquare,
  orders: Package,
  promos: Tag,
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

interface NotificationBellProps {
  user: AuthUser | null;
}

export function NotificationBell({ user }: NotificationBellProps) {
  const navigate = useNavigate();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationAPI[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      setUnread(0);
      return;
    }
    try {
      const [list, countRes] = await Promise.all([
        apiGetNotifications(),
        apiGetUnreadNotificationCount(),
      ]);
      setItems(list);
      setUnread(countRes.count);
    } catch {
      /* API offline */
    }
  }, [user]);

  useEffect(() => {
    refresh();
    const onUpdate = () => refresh();
    window.addEventListener('notifications_updated', onUpdate);
    const interval = setInterval(refresh, 30000);
    return () => {
      window.removeEventListener('notifications_updated', onUpdate);
      clearInterval(interval);
    };
  }, [refresh]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = async () => {
    setOpen(o => !o);
    if (!open && user) {
      setLoading(true);
      await refresh();
      setLoading(false);
    }
  };

  const handleClick = async (n: NotificationAPI) => {
    if (!n.read) {
      try {
        await apiMarkNotificationRead(n.id);
        setItems(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
        setUnread(c => Math.max(0, c - 1));
      } catch { /* ignore */ }
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const handleMarkAll = async () => {
    try {
      await apiMarkAllNotificationsRead();
      setItems(prev => prev.map(x => ({ ...x, read: true })));
      setUnread(0);
      window.dispatchEvent(new Event('notifications_updated'));
    } catch { /* ignore */ }
  };

  if (!user) {
    return (
      <Link
        to="/login"
        className="hidden md:flex items-center justify-center w-9 h-9 rounded-lg transition-colors"
        style={{ color: 'rgba(255,255,255,0.65)' }}
        title={t('nav.notifications')}
      >
        <Bell className="size-4" />
      </Link>
    );
  }

  return (
    <div className="relative hidden md:block" ref={ref}>
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center justify-center w-9 h-9 rounded-lg transition-colors relative"
        style={{ color: 'rgba(255,255,255,0.65)' }}
        title={t('nav.notifications')}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center"
            style={{ background: '#ef4444', color: '#fff' }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 rounded-xl border shadow-2xl overflow-hidden z-50"
          style={{ background: 'var(--gs-surface)', borderColor: 'var(--gs-border)' }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: 'var(--gs-border)' }}
          >
            <p className="text-sm font-semibold" style={{ color: 'var(--gs-text)' }}>
              {t('nav.notifications')}
            </p>
            {unread > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="flex items-center gap-1 text-[10px] font-semibold"
                style={{ color: 'var(--gs-accent)' }}
              >
                <CheckCheck className="size-3" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="size-5 animate-spin" style={{ color: 'var(--gs-faint)' }} />
              </div>
            ) : items.length === 0 ? (
              <p className="text-xs text-center py-10 px-4" style={{ color: 'var(--gs-faint)' }}>
                No notifications yet.
              </p>
            ) : (
              items.map(n => {
                const Icon = CATEGORY_ICON[n.category] ?? Bell;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleClick(n)}
                    className="w-full text-left px-4 py-3 border-b transition-colors hover:bg-gs-surface-2"
                    style={{
                      borderColor: 'var(--gs-border)',
                      background: n.read ? 'transparent' : 'color-mix(in oklab, var(--gs-accent) 6%, transparent)',
                    }}
                  >
                    <div className="flex gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: 'var(--gs-surface-2)', color: 'var(--gs-accent)' }}
                      >
                        <Icon className="size-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold truncate" style={{ color: 'var(--gs-text)' }}>
                            {n.title}
                          </p>
                          {!n.read && (
                            <span className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ background: 'var(--gs-accent)' }} />
                          )}
                        </div>
                        <p className="text-[11px] line-clamp-2 mt-0.5" style={{ color: 'var(--gs-muted)' }}>
                          {n.body}
                        </p>
                        <p className="text-[10px] mt-1" style={{ color: 'var(--gs-faint)' }}>
                          {timeAgo(n.created_at)}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <Link
            to="/settings?section=notifications"
            onClick={() => setOpen(false)}
            className="block text-center text-[11px] font-medium py-2.5 border-t transition-colors hover:bg-gs-surface-2"
            style={{ borderColor: 'var(--gs-border)', color: 'var(--gs-muted)' }}
          >
            Notification settings
          </Link>
        </div>
      )}
    </div>
  );
}
