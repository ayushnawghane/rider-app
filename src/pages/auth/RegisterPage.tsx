import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonLoading, IonCard, IonCardContent, IonIcon, IonText } from '@ionic/react';
import { useState, useEffect } from 'react';
import { useHistory } from 'react-router';
import { SignUp } from '@clerk/clerk-react';
import { useAuth } from '../../context/AuthContext';
import { chevronBackOutline, logoGoogle, logoApple } from 'ionicons/icons';

const RegisterPage: React.FC = () => {
  const [showClerkSignUp, setShowClerkSignUp] = useState(false);
  const { user, isClerkLoaded } = useAuth();
  const history = useHistory();

  useEffect(() => {
    if (isClerkLoaded && user) {
      history.replace('/home');
    }
  }, [isClerkLoaded, user, history]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButton slot="start" fill="clear" onClick={() => history.goBack()}>
            <IonIcon icon={chevronBackOutline} />
          </IonButton>
          <IonTitle>Create Account</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding ion-flex-center">
        <div className="register-container">
          <div className="register-header">
            <h1>Join RiderApp</h1>
            <p>Create your account to get started</p>
          </div>

          {!showClerkSignUp ? (
            <div className="register-options">
              <IonCard className="register-card">
                <IonCardContent>
                  <IonButton
                    expand="block"
                    className="register-btn primary-btn"
                    onClick={() => setShowClerkSignUp(true)}
                  >
                    Sign Up with Email or Phone
                  </IonButton>

                  <div className="divider">
                    <span>or continue with</span>
                  </div>

                  <div className="social-buttons">
                    <IonButton fill="outline" className="social-btn">
                      <IonIcon icon={logoGoogle} slot="start" />
                      Google
                    </IonButton>
                    <IonButton fill="outline" className="social-btn">
                      <IonIcon icon={logoApple} slot="start" />
                      Apple
                    </IonButton>
                  </div>

                  <div className="login-link">
                    <IonText>
                      Already have an account?{' '}
                      <a onClick={() => history.push('/login')}>Sign in</a>
                    </IonText>
                  </div>
                </IonCardContent>
              </IonCard>
            </div>
          ) : (
            <IonCard className="clerk-card">
              <IonCardContent>
                <SignUp
                  afterSignInUrl="/home"
                  afterSignUpUrl="/home"
                  appearance={{
                    elements: {
                      rootBox: 'clerk-root-box',
                      card: 'clerk-card-box',
                      headerTitle: 'clerk-header-title',
                      headerSubtitle: 'clerk-header-subtitle',
                      formButtonPrimary: 'clerk-btn-primary',
                      formFieldLabel: 'clerk-form-label',
                      footerActionLink: 'clerk-footer-link',
                    },
                  }}
                />
                <IonButton
                  fill="clear"
                  className="back-btn"
                  onClick={() => setShowClerkSignUp(false)}
                >
                  <IonIcon icon={chevronBackOutline} slot="start" />
                  Back
                </IonButton>
              </IonCardContent>
            </IonCard>
          )}
        </div>
      </IonContent>
      <IonLoading isOpen={!isClerkLoaded} message="Loading..." />
    </IonPage>
  );
};

export default RegisterPage;
