import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonIcon, IonList, IonItem, IonLabel, IonBadge, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonLoading } from '@ionic/react';
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { rideService } from '../../services';
import { addOutline, timeOutline, notificationsOutline, settingsOutline, helpCircleOutline, shieldOutline, carOutline } from 'ionicons/icons';
import type { Ride } from '../../types';

const HomePage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [activeRide, setActiveRide] = useState<Ride | undefined>();
  const [loading, setLoading] = useState(true);
  const history = useHistory();

  useEffect(() => {
    const fetchActiveRide = async () => {
      if (user) {
        const result = await rideService.getActiveRide(user.id);
        if (result.success) {
          setActiveRide(result.ride);
        }
      }
      setLoading(false);
    };

    fetchActiveRide();
  }, [user]);

  if (authLoading || loading) {
    return <IonLoading isOpen message="Loading..." />;
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>RiderApp</IonTitle>
          <IonButton slot="end" fill="clear" onClick={() => history.push('/notifications')}>
            <IonIcon icon={notificationsOutline} />
          </IonButton>
          <IonButton slot="end" fill="clear" onClick={() => history.push('/settings')}>
            <IonIcon icon={settingsOutline} />
          </IonButton>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div style={{ marginBottom: '24px' }}>
          <h1>Welcome, {user?.fullName || 'Rider'}!</h1>
          {activeRide ? (
            <IonCard color="primary">
              <IonCardHeader>
                <IonCardTitle>Active Ride</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <p><strong>Status:</strong> {activeRide.status}</p>
                <p><strong>Vehicle:</strong> {activeRide.vehicleType} - {activeRide.vehicleNumber}</p>
                <p><strong>From:</strong> {activeRide.startLocation}</p>
                <p><strong>To:</strong> {activeRide.endLocation}</p>
                <IonButton onClick={() => history.push(`/rides/${activeRide.id}`)}>
                  View Details
                </IonButton>
              </IonCardContent>
            </IonCard>
          ) : (
            <IonCard>
              <IonCardContent style={{ textAlign: 'center', padding: '32px' }}>
                <IonIcon icon={carOutline} style={{ fontSize: '48px', color: '#666' }} />
                <p>No active ride</p>
              </IonCardContent>
            </IonCard>
          )}
        </div>

        <h2>Quick Actions</h2>
        <IonList>
          <IonItem button onClick={() => history.push('/rides/upload')}>
            <IonIcon icon={addOutline} slot="start" />
            <IonLabel>Upload Ride</IonLabel>
          </IonItem>
          <IonItem button onClick={() => history.push('/rides/history')}>
            <IonIcon icon={timeOutline} slot="start" />
            <IonLabel>Ride History</IonLabel>
          </IonItem>
          <IonItem button onClick={() => history.push('/support')}>
            <IonIcon icon={helpCircleOutline} slot="start" />
            <IonLabel>Support & Disputes</IonLabel>
          </IonItem>
          <IonItem button onClick={() => history.push('/safety')}>
            <IonIcon icon={shieldOutline} slot="start" />
            <IonLabel>Safety & SOS</IonLabel>
          </IonItem>
        </IonList>

        <h2 style={{ marginTop: '24px' }}>Recent Activity</h2>
        <IonCard>
          <IonCardContent>
            <p style={{ textAlign: 'center', color: '#666' }}>
              Your recent rides and activities will appear here.
            </p>
            <IonButton fill="outline" expand="block" onClick={() => history.push('/rides/history')}>
              View All Rides
            </IonButton>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default HomePage;
