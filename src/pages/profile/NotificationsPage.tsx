import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonBackButton,
  IonContent,
  IonRefresher,
  IonRefresherContent,
  IonList,
  IonItem,
  IonLabel,
  IonNote,
  IonSpinner,
  IonIcon,
} from '@ionic/react';
import { useCallback, useEffect, useState } from 'react';
import { carOutline, chatbubbleEllipsesOutline, notificationsOutline } from 'ionicons/icons';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services';
import type { Notification } from '../../types';

const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    // Always resolve the loading state — even when there is no user yet — so the
    // screen can never get stuck on the spinner.
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

  // Live updates. Guarded so a realtime error can never blank the screen.
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

  const markAsRead = async (notificationId: string) => {
    await notificationService.markAsRead(notificationId);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
    );
  };

  const hasUnread = notifications.some((n) => !n.read);

  const markAllAsRead = async () => {
    if (!user) return;
    await notificationService.markAllAsRead(user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const iconFor = (type: string) => {
    if (type === 'ride') return carOutline;
    if (type === 'dispute') return chatbubbleEllipsesOutline;
    return notificationsOutline;
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/profile" />
          </IonButtons>
          <IonTitle>Notifications</IonTitle>
          {hasUnread && (
            <IonButtons slot="end">
              <IonButton onClick={markAllAsRead}>Mark all read</IonButton>
            </IonButtons>
          )}
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        {loading ? (
          <div className="ion-text-center" style={{ paddingTop: '40%' }}>
            <IonSpinner name="crescent" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="ion-text-center ion-padding" style={{ paddingTop: '35%' }}>
            <IonIcon icon={notificationsOutline} style={{ fontSize: 56, color: 'var(--ion-color-medium)' }} />
            <h2 style={{ fontWeight: 700 }}>No notifications</h2>
            <IonNote>You don't have any notifications yet.</IonNote>
          </div>
        ) : (
          <IonList>
            {notifications.map((notification) => (
              <IonItem
                key={notification.id}
                button
                detail={false}
                onClick={() => !notification.read && markAsRead(notification.id)}
                color={notification.read ? undefined : 'light'}
              >
                <IonIcon icon={iconFor(notification.type)} slot="start" color="warning" aria-hidden="true" />
                <IonLabel className="ion-text-wrap">
                  <h2 style={{ fontWeight: 700 }}>{notification.title}</h2>
                  <p>{notification.message}</p>
                  <IonNote>{formatDate(notification.createdAt)}</IonNote>
                </IonLabel>
                {!notification.read && (
                  <IonNote slot="end" color="warning" style={{ fontWeight: 700 }}>New</IonNote>
                )}
              </IonItem>
            ))}
          </IonList>
        )}
      </IonContent>
    </IonPage>
  );
};

export default NotificationsPage;
