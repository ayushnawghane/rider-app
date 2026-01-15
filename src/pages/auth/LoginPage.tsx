import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonInput, IonItem, IonLabel, IonLoading, IonText, IonCard, IonCardContent, IonIcon } from '@ionic/react';
import { useState } from 'react';
import { useHistory } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { callOutline, chevronBackOutline } from 'ionicons/icons';

const LoginPage: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const { login, verifyOtp } = useAuth();
  const history = useHistory();

  const handleSendOtp = async () => {
    if (!phone || phone.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    setError('');

    const result = await login(phone);

    if (result.success) {
      setOtpSent(true);
    } else {
      setError(result.error || 'Failed to send OTP');
    }

    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 4) {
      setError('Please enter a valid OTP');
      return;
    }

    setLoading(true);
    setError('');

    const result = await verifyOtp(phone, otp);

    if (result.success) {
      history.replace('/home');
    } else {
      setError(result.error || 'Invalid OTP');
    }

    setLoading(false);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButton slot="start" fill="clear">
            <IonIcon icon={chevronBackOutline} />
          </IonButton>
          <IonTitle>Login</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center' }}>
          <IonCard>
            <IonCardContent>
              <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>Welcome to RiderApp</h2>
              
              {!otpSent ? (
                <>
                  <IonItem>
                    <IonLabel position="floating">Phone Number</IonLabel>
                    <IonInput
                      type="tel"
                      value={phone}
                      onIonChange={(e) => setPhone(e.detail.value || '')}
                      placeholder="+1234567890"
                    />
                  </IonItem>
                  
                  {error && <IonText color="danger"><p>{error}</p></IonText>}
                  
                  <IonButton
                    expand="block"
                    onClick={handleSendOtp}
                    disabled={loading}
                    style={{ marginTop: '16px' }}
                  >
                    {loading ? 'Sending...' : 'Send OTP'}
                  </IonButton>
                </>
              ) : (
                <>
                  <IonItem>
                    <IonLabel position="floating">Enter OTP</IonLabel>
                    <IonInput
                      type="number"
                      value={otp}
                      onIonChange={(e) => setOtp(e.detail.value || '')}
                      placeholder="123456"
                    />
                  </IonItem>
                  
                  {error && <IonText color="danger"><p>{error}</p></IonText>}
                  
                  <IonButton
                    expand="block"
                    onClick={handleVerifyOtp}
                    disabled={loading}
                    style={{ marginTop: '16px' }}
                  >
                    {loading ? 'Verifying...' : 'Verify & Login'}
                  </IonButton>
                  
                  <IonButton
                    fill="clear"
                    onClick={() => setOtpSent(false)}
                    disabled={loading}
                    style={{ marginTop: '8px' }}
                  >
                    Change Phone Number
                  </IonButton>
                </>
              )}
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
      <IonLoading isOpen={loading} message="Please wait..." />
    </IonPage>
  );
};

export default LoginPage;
