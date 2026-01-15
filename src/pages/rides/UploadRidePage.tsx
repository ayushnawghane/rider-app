import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonInput, IonItem, IonLabel, IonLoading, IonText, IonCard, IonCardContent, IonIcon, IonDatetime, IonSelect, IonSelectOption } from '@ionic/react';
import { useState } from 'react';
import { useHistory } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { rideService } from '../../services';
import { locationOutline, carOutline, calendarOutline, chevronBackOutline } from 'ionicons/icons';

const UploadRidePage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const [date, setDate] = useState(new Date().toISOString());
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [referenceId, setReferenceId] = useState('');
  
  const history = useHistory();

  const handleSubmit = async () => {
    if (!startLocation || !endLocation || !vehicleType || !vehicleNumber || !referenceId) {
      setError('All fields are required');
      return;
    }

    if (!user) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);
    setError('');

    const result = await rideService.createRide({
      userId: user.id,
      date,
      startLocation,
      endLocation,
      vehicleType,
      vehicleNumber,
      referenceId,
    });

    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error || 'Failed to upload ride');
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
          <IonTitle>Upload Ride</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {!success ? (
          <IonCard>
            <IonCardContent>
              <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>Add Ride Details</h2>
              
              <IonItem>
                <IonLabel position="floating">Date & Time</IonLabel>
                <IonDatetime
                  presentation="date-time"
                  value={date}
                  onIonChange={(e) => setDate((e.detail.value as string) || new Date().toISOString())}
                />
              </IonItem>

              <IonItem style={{ marginTop: '8px' }}>
                <IonIcon icon={locationOutline} slot="start" />
                <IonLabel position="floating">Start Location</IonLabel>
                <IonInput
                  type="text"
                  value={startLocation}
                  onIonChange={(e) => setStartLocation((e.detail.value as string) || '')}
                  placeholder="Pickup location"
                />
              </IonItem>

              <IonItem style={{ marginTop: '8px' }}>
                <IonIcon icon={locationOutline} slot="start" />
                <IonLabel position="floating">End Location</IonLabel>
                <IonInput
                  type="text"
                  value={endLocation}
                  onIonChange={(e) => setEndLocation((e.detail.value as string) || '')}
                  placeholder="Drop location"
                />
              </IonItem>

              <IonItem style={{ marginTop: '8px' }}>
                <IonIcon icon={carOutline} slot="start" />
                <IonLabel position="floating">Vehicle Type</IonLabel>
                <IonSelect
                  value={vehicleType}
                  onIonChange={(e) => setVehicleType(e.detail.value)}
                  placeholder="Select type"
                >
                  <IonSelectOption value="taxi">Taxi</IonSelectOption>
                  <IonSelectOption value="auto">Auto</IonSelectOption>
                  <IonSelectOption value="bus">Bus</IonSelectOption>
                  <IonSelectOption value="metro">Metro</IonSelectOption>
                  <IonSelectOption value="other">Other</IonSelectOption>
                </IonSelect>
              </IonItem>

              <IonItem style={{ marginTop: '8px' }}>
                <IonIcon icon={carOutline} slot="start" />
                <IonLabel position="floating">Vehicle Number</IonLabel>
                <IonInput
                  type="text"
                  value={vehicleNumber}
                  onIonChange={(e) => setVehicleNumber((e.detail.value as string) || '')}
                  placeholder="e.g., ABC 1234"
                />
              </IonItem>

              <IonItem style={{ marginTop: '8px' }}>
                <IonIcon icon={calendarOutline} slot="start" />
                <IonLabel position="floating">Reference ID / Ticket Number</IonLabel>
                <IonInput
                  type="text"
                  value={referenceId}
                  onIonChange={(e) => setReferenceId((e.detail.value as string) || '')}
                  placeholder="Booking reference"
                />
              </IonItem>
              
              {error && <IonText color="danger"><p>{error}</p></IonText>}
              
              <IonButton
                expand="block"
                onClick={handleSubmit}
                disabled={loading}
                style={{ marginTop: '16px' }}
              >
                {loading ? 'Uploading...' : 'Upload Ride'}
              </IonButton>
            </IonCardContent>
          </IonCard>
        ) : (
          <IonCard>
            <IonCardContent style={{ textAlign: 'center' }}>
              <h2 style={{ color: 'var(--ion-color-success)' }}>Ride Uploaded Successfully!</h2>
              <p>Your ride has been added to your history.</p>
              <IonButton
                expand="block"
                onClick={() => history.replace('/rides/history')}
                style={{ marginTop: '16px' }}
              >
                View My Rides
              </IonButton>
              <IonButton
                fill="clear"
                onClick={() => {
                  setSuccess(false);
                  setStartLocation('');
                  setEndLocation('');
                  setVehicleNumber('');
                  setReferenceId('');
                }}
                style={{ marginTop: '8px' }}
              >
                Upload Another Ride
              </IonButton>
            </IonCardContent>
          </IonCard>
        )}
      </IonContent>
      <IonLoading isOpen={loading} message="Uploading ride..." />
    </IonPage>
  );
};

export default UploadRidePage;
