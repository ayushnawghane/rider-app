import { IonContent, IonPage, IonRefresher, IonRefresherContent } from '@ionic/react';
import { useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services';
import AppIcon, { type AppIconName } from '../../components/icons/AppIcon';
import type { Notification } from '../../types';

const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const history = useHistory();

  const fetchNotifications = useCallback(async () => {
    // Always resolve the loading state — even with no user — so the screen can
    // never get stuck on the loading skeleton.
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    try {
      const result = await notificationService.getNotifications(user.id);
      if (result.success && result.notifications) {
        setNotifications(result.notifications);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  // Live updates: new notifications appear without a manual refresh. Guarded so
  // a realtime failure can never crash/blank the screen.
  useEffect(() => {
    if (!user) return;
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = notificationService.subscribeToNotifications(user.id, (notification) => {
        setNotifications((prev) =>
          prev.some((n) => n.id === notification.id) ? prev : [notification, ...prev],
        );
      });
    } catch (error) {
      console.warn('Notification realtime subscription failed:', error);
    }
    return () => unsubscribe?.();
  }, [user]);

  const handleRefresh = async (event: CustomEvent) => {
    await fetchNotifications();
    (event.target as HTMLIonRefresherElement).complete();
  };

  const hasUnread = notifications.some((n) => !n.read);

  const markAllAsRead = async () => {
    if (!user) return;
    await notificationService.markAllAsRead(user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markAsRead = async (notificationId: string) => {
    await notificationService.markAsRead(notificationId);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeIcon = (type: string): AppIconName => {
    switch (type) {
      case 'ride':
        return 'car';
      case 'dispute':
        return 'message';
      default:
        return 'bell';
    }
  };

  return (
    <IonPage>
      <IonContent>
        <div className="app-top-safe relative min-h-full overflow-hidden bg-white">
          {/* Grainy orange aura, right-weighted */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[300px]">
            <div
              className="absolute inset-0"
              style={{ background: 'radial-gradient(120% 72% at 82% -10%, rgba(255,107,0,0.4) 0%, rgba(255,160,30,0.15) 46%, rgba(255,255,255,0) 74%)' }}
            />
            <div className="absolute -right-16 -top-12 h-72 w-72 rounded-full animate-aurora-1" style={{ background: 'radial-gradient(circle, rgba(255,200,50,0.62) 0%, transparent 62%)', filter: 'blur(48px)' }} />
          </div>

         
          <div className="relative z-10 mx-auto max-w-2xl px-4 pb-8 pt-5">
            {/* Header */}
            <div className="mb-4 flex items-center gap-3">
              <button
                onClick={() => history.goBack()}
                aria-label="Back"
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-black/10 bg-white/70 text-ink shadow-soft backdrop-blur-sm transition active:scale-95"
              >
                <ChevronLeft size={22} strokeWidth={2.5} />
              </button>
              <div className="flex-1">
                <p className="mb-0.5 font-display text-xs font-bold uppercase tracking-[0.2em] text-fire-orange">Updates</p>
                <h1 className="font-display text-[2.2rem] font-extrabold leading-[0.9] tracking-tight text-ink">Notifications</h1>
              </div>
              {hasUnread && (
                <button
                  onClick={markAllAsRead}
                  className="shrink-0 rounded-full border border-primary-200 bg-white px-3 py-1.5 font-display text-xs font-bold text-primary-600 shadow-soft transition active:scale-95"
                >
                  Mark all read
                </button>
              )}
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-20 animate-pulse rounded-[14px] bg-primary-50" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="rounded-[18px] border border-black/5 bg-white p-4 text-center shadow-soft">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-primary-100 bg-gradient-to-br from-primary-50 to-white shadow-soft">
                  <AppIcon name="bell" className="h-11 w-11" />
                </div>
                <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight text-ink">No notifications</h2>
                <p className="mt-2 text-sm font-medium text-ink/50">You don't have any notifications yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => !notification.read && markAsRead(notification.id)}
                    className={`flex w-full items-start gap-3 rounded-[14px] border p-4 text-left shadow-soft transition active:scale-[0.99] ${
                      notification.read ? 'border-black/5 bg-white' : 'border-primary-200 bg-primary-50/50'
                    }`}
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary-100 bg-gradient-to-br from-primary-50 to-white">
                      <AppIcon name={getTypeIcon(notification.type)} className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display font-bold text-ink">{notification.title}</h3>
                      <p className="mt-0.5 text-sm font-medium text-ink/55">{notification.message}</p>
                      <p className="mt-1 text-xs font-medium text-ink/35">{formatDate(notification.createdAt)}</p>
                    </div>
                    {!notification.read && (
                      <span className="shrink-0 rounded-full px-2.5 py-1 font-display text-[10px] font-extrabold uppercase tracking-wide text-white shadow-glow" style={{ background: 'linear-gradient(100deg, var(--fire-red), var(--fire-amber))' }}>
                        New
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default NotificationsPage;
