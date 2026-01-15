import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonLoading, IonCard, IonCardContent, IonIcon, IonText } from '@ionic/react';
import { useState, useEffect } from 'react';
import { useHistory } from 'react-router';
import { SignIn } from '@clerk/clerk-react';
import { useAuth } from '../../context/AuthContext';
import { chevronBackOutline, logoGoogle, logoApple } from 'ionicons/icons';

const LoginPage: React.FC = () => {
  const [showClerkSignIn, setShowClerkSignIn] = useState(false);
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
          <IonTitle>Welcome Back</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding ion-flex-center">
        <div className="login-container">
          <div className="login-header">
            <h1>RiderApp</h1>
            <p>Sign in to continue to your account</p>
          </div>

          {!showClerkSignIn ? (
            <div className="login-options">
              <IonCard className="login-card">
                <IonCardContent>
                  <IonButton
                    expand="block"
                    className="login-btn primary-btn"
                    onClick={() => setShowClerkSignIn(true)}
                  >
                    Sign In with Email or Phone
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

                  <div className="register-link">
                    <IonText>
                      Don't have an account?{' '}
                      <a onClick={() => history.push('/register')}>Sign up</a>
                    </IonText>
                  </div>
                </IonCardContent>
              </IonCard>
            </div>
          ) : (
            <IonCard className="clerk-card">
              <IonCardContent>
                <SignIn
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
                  onClick={() => setShowClerkSignIn(false)}
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

export default LoginPage;
