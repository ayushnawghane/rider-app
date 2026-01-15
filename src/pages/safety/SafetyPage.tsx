import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonIcon, IonCard, IonCardContent, IonRow, IonCol, IonLoading } from '@ionic/react';
import { useState } from 'react';
import { useHistory, useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { sosService } from '../../services';
import { warningOutline, locationOutline, callOutline, chevronBackOutline } from 'ionicons/icons';

const SafetyPage: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [sosSent, setSosSent] = useState(false);
  const history = useHistory();

  const queryParams = new URLSearchParams(location.search);
  const preselectedRideId = queryParams.get('rideId');

  const handleSOS = async () => {
    if (!user) return;

    setLoading(true);

    const result = await sosService.createSosAlert({
      userId: user.id,
      rideId: preselectedRideId || undefined,
      location: {
        lat: 0,
        lng: 0,
      },
    });

    if (result.success) {
      setSosSent(true);
    }

    setLoading(false);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButton slot="start" fill="clear" onClick={() => history.goBack()}>
            <IonIcon icon={chevronBackOutline} />
          </IonButton>
          <IonTitle>Safety & SOS</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {!sosSent ? (
          <>
            <IonCard color="danger" style={{ textAlign: 'center', padding: '24px' }}>
              <IonIcon icon={warningOutline} style={{ fontSize: '64px', marginBottom: '16px' }} />
              <h2>Emergency SOS</h2>
              <p>In case of emergency, tap the button below to alert our support team with your location.</p>
              <IonButton
                size="large"
                onClick={handleSOS}
                disabled={loading}
                style={{ marginTop: '16px' }}
              >
                {loading ? 'Sending Alert...' : 'SOS EMERGENCY'}
              </IonButton>
            </IonCard>

            <h2 style={{ marginTop: '24px' }}>Emergency Instructions</h2>
            <IonCard>
              <IonCardContent>
                <IonRow>
                  <IonCol>
                    <IonIcon icon={callOutline} />
                    <p><strong>Call Emergency Services</strong></p>
                    <p>Dial 112 for immediate emergency assistance.</p>
                  </IonCol>
                </IonRow>
              </IonCardContent>
            </IonCard>

            <IonCard>
              <IonCardContent>
                <IonRow>
                  <IonCol>
                    <IonIcon icon={locationOutline} />
                    <p><strong>Share Your Location</strong></p>
                    <p>Always share your ride details with a trusted contact.</p>
                  </IonCol>
                </IonRow>
              </IonCardContent>
            </IonCard>

            <h2 style={{ marginTop: '24px' }}>Important Contacts</h2>
            <IonCard>
              <IonCardContent>
                <IonButton expand="block" onClick={() => window.location.href = 'tel:112'}>
                  Emergency Services (112)
                </IonButton>
                <IonButton expand="block" fill="outline" style={{ marginTop: '8px' }}>
                  RiderApp Support
                </IonButton>
              </IonCardContent>
            </IonCard>
          </>
        ) : (
          <IonCard>
            <IonCardContent style={{ textAlign: 'center' }}>
              <IonIcon icon={warningOutline} style={{ fontSize: '64px', color: 'var(--ion-color-danger)', marginBottom: '16px' }} />
              <h2 style={{ color: 'var(--ion-color-danger)' }}>SOS Alert Sent!</h2>
              <p>Our support team has been notified and will contact you immediately.</p>
              <IonButton
                expand="block"
                onClick={() => history.replace('/home')}
                style={{ marginTop: '16px' }}
              >
                Return to Home
              </IonButton>
            </IonCardContent>
          </IonCard>
        )}
      </IonContent>
      <IonLoading isOpen={loading} message="Sending SOS alert..." />
    </IonPage>
  );
};

export default SafetyPage;
