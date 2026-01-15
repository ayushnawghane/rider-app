import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonInput, IonItem, IonLabel, IonLoading, IonText, IonCard, IonCardContent, IonIcon } from '@ionic/react';
import { useState } from 'react';
import { useHistory } from 'react-router';
import { useAuth } from '../../context/AuthContext';

interface RegisterPageProps {}

const RegisterPage: React.FC<RegisterPageProps> = () => {
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const history = useHistory();

  const handleRegister = async () => {
    if (!phone || !fullName || !email) {
      setError('All fields are required');
      return;
    }

    if (phone.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email');
      return;
    }

    setLoading(true);
    setError('');

    const result = await register(phone, fullName, email);

    if (result.success) {
      history.replace('/login');
    } else {
      setError(result.error || 'Registration failed');
    }

    setLoading(false);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Register</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center' }}>
          <IonCard>
            <IonCardContent>
              <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>Create Account</h2>
              
              <IonItem>
                <IonLabel position="floating">Full Name</IonLabel>
                <IonInput
                  type="text"
                  value={fullName}
                  onIonChange={(e) => setFullName(e.detail.value || '')}
                  placeholder="John Doe"
                />
              </IonItem>

              <IonItem style={{ marginTop: '8px' }}>
                <IonLabel position="floating">Phone Number</IonLabel>
                <IonInput
                  type="tel"
                  value={phone}
                  onIonChange={(e) => setPhone(e.detail.value || '')}
                  placeholder="+1234567890"
                />
              </IonItem>

              <IonItem style={{ marginTop: '8px' }}>
                <IonLabel position="floating">Email</IonLabel>
                <IonInput
                  type="email"
                  value={email}
                  onIonChange={(e) => setEmail(e.detail.value || '')}
                  placeholder="john@example.com"
                />
              </IonItem>
              
              {error && <IonText color="danger"><p>{error}</p></IonText>}
              
              <IonButton
                expand="block"
                onClick={handleRegister}
                disabled={loading}
                style={{ marginTop: '16px' }}
              >
                {loading ? 'Registering...' : 'Register'}
              </IonButton>
              
              <IonButton
                fill="clear"
                onClick={() => history.goBack()}
                disabled={loading}
                style={{ marginTop: '8px' }}
              >
                Already have an account? Login
              </IonButton>
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
      <IonLoading isOpen={loading} message="Please wait..." />
    </IonPage>
  );
};

export default RegisterPage;
