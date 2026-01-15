import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonIcon, IonList, IonItem, IonLabel, IonBadge, IonCard, IonCardContent, IonLoading, IonRefresher, IonRefresherContent } from '@ionic/react';
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services';
import { chevronBackOutline, notificationsOutline } from 'ionicons/icons';
import type { Notification } from '../../types';

const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const history = useHistory();

  const fetchNotifications = async () => {
    if (!user) return;
    
    const result = await notificationService.getNotifications(user.id);
    if (result.success && result.notifications) {
      setNotifications(result.notifications);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ride': return 'car-outline';
      case 'dispute': return 'chatbubbles-outline';
      default: return 'notifications-outline';
    }
  };

  if (loading) {
    return <IonLoading isOpen message="Loading notifications..." />;
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButton slot="start" fill="clear" onClick={() => history.goBack()}>
            <IonIcon icon={chevronBackOutline} />
          </IonButton>
          <IonTitle>Notifications</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        {notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px' }}>
            <IonIcon icon={notificationsOutline} style={{ fontSize: '64px', color: '#ccc' }} />
            <h3>No Notifications</h3>
            <p>You don't have any notifications yet.</p>
          </div>
        ) : (
          <IonList>
            {notifications.map((notification) => (
              <IonItem
                key={notification.id}
                button
                onClick={() => !notification.read && markAsRead(notification.id)}
                style={{ backgroundColor: notification.read ? 'transparent' : 'var(--ion-color-light)' }}
              >
                <IonIcon icon={getTypeIcon(notification.type)} slot="start" />
                <IonLabel>
                  <h3>{notification.title}</h3>
                  <p>{notification.message}</p>
                  <small>{formatDate(notification.createdAt)}</small>
                </IonLabel>
                {!notification.read && (
                  <IonBadge slot="end" color="primary">New</IonBadge>
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
