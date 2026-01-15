import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonIcon, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonBadge, IonLoading, IonRow, IonCol } from '@ionic/react';
import { useEffect, useState } from 'react';
import { useParams, useHistory } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { rideService } from '../../services';
import { callOutline, chatbubbleOutline, shieldOutline, locationOutline, calendarOutline, chevronBackOutline, timeOutline } from 'ionicons/icons';
import type { Ride } from '../../types';

const RideDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const history = useHistory();

  useEffect(() => {
    const fetchRide = async () => {
      const result = await rideService.getRideById(id);
      if (result.success && result.ride) {
        setRide(result.ride);
      }
      setLoading(false);
    };

    fetchRide();
  }, [id]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleContactDriver = () => {
    if (ride?.driverContact) {
      window.location.href = `tel:${ride.driverContact}`;
    }
  };

  const handleRaiseDispute = () => {
    history.push(`/support/dispute/new?rideId=${ride?.id}`);
  };

  const handleSOS = () => {
    history.push(`/safety/sos?rideId=${ride?.id}`);
  };

  if (loading) {
    return <IonLoading isOpen message="Loading ride details..." />;
  }

  if (!ride) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButton slot="start" fill="clear" onClick={() => history.goBack()}>
              <IonIcon icon={chevronBackOutline} />
            </IonButton>
            <IonTitle>Ride Details</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div style={{ textAlign: 'center', padding: '32px' }}>
            <p>Ride not found</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButton slot="start" fill="clear" onClick={() => history.goBack()}>
            <IonIcon icon={chevronBackOutline} />
          </IonButton>
          <IonTitle>Ride Details</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>
              <IonRow>
                <IonCol>
                  Ride Details
                </IonCol>
                <IonCol style={{ textAlign: 'right' }}>
                  <IonBadge color={ride.status === 'completed' ? 'success' : ride.status === 'active' ? 'primary' : 'warning' as any}>
                    {ride.status}
                  </IonBadge>
                </IonCol>
              </IonRow>
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <p><IonIcon icon={calendarOutline} /> <strong>Date:</strong> {formatDate(ride.date)}</p>
            <p><IonIcon icon={locationOutline} /> <strong>From:</strong> {ride.startLocation}</p>
            <p><IonIcon icon={locationOutline} /> <strong>To:</strong> {ride.endLocation}</p>
            <p><IonIcon icon={timeOutline} /> <strong>Vehicle:</strong> {ride.vehicleType} - {ride.vehicleNumber}</p>
            <p><IonIcon icon={timeOutline} /> <strong>Reference ID:</strong> {ride.referenceId}</p>
            
            {ride.fare && <p><strong>Fare:</strong> ${ride.fare.toFixed(2)}</p>}
            {ride.duration && <p><strong>Duration:</strong> {ride.duration} minutes</p>}
            {ride.distance && <p><strong>Distance:</strong> {ride.distance} km</p>}
          </IonCardContent>
        </IonCard>

        <IonCard>
          <IonCardContent>
            <IonRow>
              <IonCol>
                <IonButton
                  expand="block"
                  onClick={handleContactDriver}
                  disabled={!ride.driverContact}
                >
                  <IonIcon icon={callOutline} slot="start" />
                  Contact Driver
                </IonButton>
              </IonCol>
              <IonCol>
                <IonButton
                  expand="block"
                  fill="outline"
                  onClick={handleRaiseDispute}
                >
                  <IonIcon icon={chatbubbleOutline} slot="start" />
                  Raise Dispute
                </IonButton>
              </IonCol>
            </IonRow>
            <IonRow style={{ marginTop: '8px' }}>
              <IonCol>
                <IonButton
                  expand="block"
                  color="danger"
                  onClick={handleSOS}
                >
                  <IonIcon icon={shieldOutline} slot="start" />
                  SOS Emergency
                </IonButton>
              </IonCol>
            </IonRow>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default RideDetailPage;
