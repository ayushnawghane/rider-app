import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonIcon, IonList, IonItem, IonLabel, IonBadge, IonCard, IonCardContent, IonLoading, IonRefresher, IonRefresherContent } from '@ionic/react';
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { rideService } from '../../services';
import { chevronForwardOutline, carOutline, createOutline } from 'ionicons/icons';
import type { Ride } from '../../types';

const RideHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const history = useHistory();

  const fetchRides = async () => {
    if (!user) return;
    
    const result = await rideService.getRides(user.id);
    if (result.success && result.rides) {
      setRides(result.rides);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRides();
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRides();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'active': return 'primary';
      case 'pending': return 'warning';
      case 'cancelled': return 'danger';
      default: return 'medium';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return <IonLoading isOpen message="Loading rides..." />;
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Ride History</IonTitle>
          <IonButton slot="end" fill="clear" onClick={() => history.push('/rides/upload')}>
            <IonIcon icon={createOutline} />
          </IonButton>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        {rides.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px' }}>
            <IonIcon icon={carOutline} style={{ fontSize: '64px', color: '#ccc' }} />
            <h3>No Rides Yet</h3>
            <p>Upload your first ride to get started.</p>
            <IonButton onClick={() => history.push('/rides/upload')}>
              Upload Ride
            </IonButton>
          </div>
        ) : (
          <IonList>
            {rides.map((ride) => (
              <IonItem
                key={ride.id}
                button
                onClick={() => history.push(`/rides/${ride.id}`)}
              >
                <IonIcon icon={carOutline} slot="start" />
                <IonLabel>
                  <h3>{ride.startLocation} → {ride.endLocation}</h3>
                  <p>{formatDate(ride.date)}</p>
                  <p>{ride.vehicleType} - {ride.vehicleNumber}</p>
                </IonLabel>
                <IonBadge slot="end" color={getStatusColor(ride.status) as any}>
                  {ride.status}
                </IonBadge>
                <IonIcon icon={chevronForwardOutline} slot="end" />
              </IonItem>
            ))}
          </IonList>
        )}
      </IonContent>
    </IonPage>
  );
};

export default RideHistoryPage;
