import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonIcon, IonItem, IonLabel, IonLoading, IonText, IonCard, IonCardContent, IonSelect, IonSelectOption, IonTextarea } from '@ionic/react';
import { useState, useEffect } from 'react';
import { useHistory, useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { disputeService } from '../../services';
import { chevronBackOutline, createOutline } from 'ionicons/icons';

const NewDisputePage: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const [disputeType, setDisputeType] = useState<'ride' | 'kyc' | 'other'>('ride');
  const [rideId, setRideId] = useState('');
  const [description, setDescription] = useState('');
  
  const history = useHistory();

  const queryParams = new URLSearchParams(location.search);
  const preselectedRideId = queryParams.get('rideId');

  useEffect(() => {
    if (preselectedRideId) {
      setRideId(preselectedRideId);
    }
  }, [preselectedRideId]);

  const handleSubmit = async () => {
    if (!description) {
      setError('Please provide a description');
      return;
    }

    if (!user) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);
    setError('');

    const result = await disputeService.createDispute({
      userId: user.id,
      rideId: rideId || undefined,
      disputeType,
      description,
    });

    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error || 'Failed to create dispute');
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
          <IonTitle>Raise Dispute</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {!success ? (
          <IonCard>
            <IonCardContent>
              <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>Describe Your Issue</h2>
              
              <IonItem>
                <IonLabel position="floating">Dispute Type</IonLabel>
                <IonSelect
                  value={disputeType}
                  onIonChange={(e) => setDisputeType(e.detail.value as 'ride' | 'kyc' | 'other')}
                >
                  <IonSelectOption value="ride">Ride Issue</IonSelectOption>
                  <IonSelectOption value="kyc">KYC Verification</IonSelectOption>
                  <IonSelectOption value="other">Other</IonSelectOption>
                </IonSelect>
              </IonItem>

              <IonItem style={{ marginTop: '8px' }}>
                <IonLabel position="floating">Ride ID (optional)</IonLabel>
                <IonSelect
                  value={rideId}
                  onIonChange={(e) => setRideId(e.detail.value)}
                  placeholder="Select a ride"
                >
                  <IonSelectOption value="">Not related to specific ride</IonSelectOption>
                </IonSelect>
              </IonItem>

              <IonItem style={{ marginTop: '8px' }}>
                <IonLabel position="floating">Description</IonLabel>
                <IonTextarea
                  value={description}
                  onIonChange={(e) => setDescription(e.detail.value || '')}
                  placeholder="Please describe your issue in detail..."
                  rows={6}
                />
              </IonItem>
              
              {error && <IonText color="danger"><p>{error}</p></IonText>}
              
              <IonButton
                expand="block"
                onClick={handleSubmit}
                disabled={loading}
                style={{ marginTop: '16px' }}
              >
                {loading ? 'Submitting...' : 'Submit Dispute'}
              </IonButton>
            </IonCardContent>
          </IonCard>
        ) : (
          <IonCard>
            <IonCardContent style={{ textAlign: 'center' }}>
              <h2 style={{ color: 'var(--ion-color-success)' }}>Dispute Submitted!</h2>
              <p>Your dispute has been submitted successfully. Our support team will review it shortly.</p>
              <IonButton
                expand="block"
                onClick={() => history.replace('/support')}
                style={{ marginTop: '16px' }}
              >
                View My Disputes
              </IonButton>
            </IonCardContent>
          </IonCard>
        )}
      </IonContent>
      <IonLoading isOpen={loading} message="Submitting dispute..." />
    </IonPage>
  );
};

export default NewDisputePage;
