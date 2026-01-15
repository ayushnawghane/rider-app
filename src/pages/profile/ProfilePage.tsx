import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonIcon, IonList, IonItem, IonLabel, IonBadge, IonCard, IonCardContent, IonLoading, IonInput, IonSelect, IonSelectOption, IonToggle } from '@ionic/react';
import { useState } from 'react';
import { useHistory } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services';
import { personOutline, callOutline, documentTextOutline, settingsOutline, languageOutline, notificationsOutline, logOutOutline, shieldOutline, createOutline, chevronForwardOutline, closeOutline } from 'ionicons/icons';

const ProfilePage: React.FC = () => {
  const { user, refreshUser, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [language, setLanguage] = useState(user?.language || 'en');
  const [notifications, setNotifications] = useState<boolean>(user?.notificationPreferences || true);
  const history = useHistory();

  const handleSave = async () => {
    setLoading(true);
    await authService.updateProfile({
      fullName,
      language,
      notificationPreferences: notifications,
    });
    await refreshUser();
    setEditing(false);
    setLoading(false);
  };

  const handleLogout = async () => {
    await logout();
    history.replace('/login');
  };

  const getKycStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'danger';
      default: return 'medium';
    }
  };

  if (!user) {
    return <IonLoading isOpen message="Loading profile..." />;
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Profile</IonTitle>
          <IonButton slot="end" fill="clear" onClick={() => setEditing(!editing)}>
            <IonIcon icon={editing ? closeOutline : createOutline} />
          </IonButton>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonCard>
          <IonCardContent style={{ textAlign: 'center' }}>
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                backgroundColor: 'var(--ion-color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <IonIcon icon={personOutline} style={{ fontSize: '40px', color: 'white' }} />
            </div>
            <h2>{user.fullName}</h2>
            <p>{user.email}</p>
            <p><IonIcon icon={callOutline} /> {user.phone}</p>
            <IonBadge color={getKycStatusColor(user.kycStatus) as any} style={{ marginTop: '8px' }}>
              KYC: {user.kycStatus}
            </IonBadge>
          </IonCardContent>
        </IonCard>

        <IonCard>
          <IonCardContent>
            <h3>Edit Profile</h3>
            <IonItem>
              <IonLabel position="floating">Full Name</IonLabel>
              <IonInput
                value={fullName}
                onIonChange={(e) => setFullName(e.detail.value || '')}
                disabled={!editing}
              />
            </IonItem>
            <IonItem style={{ marginTop: '8px' }}>
              <IonLabel position="floating">Language</IonLabel>
              <IonSelect
                value={language}
                onIonChange={(e) => setLanguage(e.detail.value)}
                disabled={!editing}
              >
                <IonSelectOption value="en">English</IonSelectOption>
                <IonSelectOption value="es">Spanish</IonSelectOption>
                <IonSelectOption value="fr">French</IonSelectOption>
                <IonSelectOption value="de">German</IonSelectOption>
              </IonSelect>
            </IonItem>
            <IonItem style={{ marginTop: '8px' }}>
              <IonLabel>Notifications</IonLabel>
              <IonToggle
                checked={notifications}
                onIonChange={(e) => setNotifications(e.detail.checked)}
                disabled={!editing}
              />
            </IonItem>
            {editing && (
              <IonButton expand="block" onClick={handleSave} disabled={loading} style={{ marginTop: '16px' }}>
                Save Changes
              </IonButton>
            )}
          </IonCardContent>
        </IonCard>

        <IonList>
          <IonItem button onClick={() => history.push('/profile/kyc')}>
            <IonIcon icon={documentTextOutline} slot="start" />
            <IonLabel>KYC Verification</IonLabel>
            <IonBadge slot="end" color={getKycStatusColor(user.kycStatus) as any}>
              {user.kycStatus}
            </IonBadge>
            <IonIcon icon={chevronForwardOutline} slot="end" />
          </IonItem>
          <IonItem button onClick={() => history.push('/settings')}>
            <IonIcon icon={settingsOutline} slot="start" />
            <IonLabel>Settings</IonLabel>
            <IonIcon icon={chevronForwardOutline} slot="end" />
          </IonItem>
          <IonItem button onClick={() => history.push('/safety')}>
            <IonIcon icon={shieldOutline} slot="start" />
            <IonLabel>Safety Center</IonLabel>
            <IonIcon icon={chevronForwardOutline} slot="end" />
          </IonItem>
          <IonItem button onClick={handleLogout} color="danger">
            <IonIcon icon={logOutOutline} slot="start" />
            <IonLabel>Logout</IonLabel>
          </IonItem>
        </IonList>
      </IonContent>
      <IonLoading isOpen={loading} message="Saving..." />
    </IonPage>
  );
};

export default ProfilePage;
