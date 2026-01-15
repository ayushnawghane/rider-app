import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonIcon, IonList, IonItem, IonLabel, IonBadge, IonCard, IonCardContent, IonLoading, IonInput, IonSelect, IonSelectOption, IonToggle, IonAvatar, IonSkeletonText } from '@ionic/react';
import { useState, useEffect } from 'react';
import { useHistory } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { UserButton } from '@clerk/clerk-react';
import { authService } from '../../services';
import { personOutline, callOutline, documentTextOutline, settingsOutline, languageOutline, notificationsOutline, logOutOutline, shieldOutline, createOutline, chevronForwardOutline, closeOutline, cameraOutline, checkmarkCircleOutline, timeOutline, alertCircleOutline } from 'ionicons/icons';

const ProfilePage: React.FC = () => {
  const { user, refreshUser, logout, isClerkLoaded } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [language, setLanguage] = useState(user?.language || 'en');
  const [notifications, setNotifications] = useState<boolean>(user?.notificationPreferences || true);
  const history = useHistory();

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setLanguage(user.language);
      setNotifications(user.notificationPreferences);
    }
  }, [user]);

  const handleSave = async () => {
    setLoading(true);
    if (user) {
      await authService.updateProfile({
        fullName,
        language,
        notificationPreferences: notifications,
      }, user.id);
      await refreshUser();
    }
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

  const getKycStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return checkmarkCircleOutline;
      case 'pending': return timeOutline;
      case 'rejected': return alertCircleOutline;
      default: return documentTextOutline;
    }
  };

  if (!isClerkLoaded) {
    return (
      <IonPage>
        <IonContent className="ion-padding">
          <div className="profile-skeleton">
            <IonSkeletonText animated style={{ width: '100px', height: '100px', borderRadius: '50%' }} />
            <IonSkeletonText animated style={{ width: '60%', height: '24px', marginTop: '16px' }} />
            <IonSkeletonText animated style={{ width: '40%', height: '16px', marginTop: '8px' }} />
          </div>
        </IonContent>
      </IonPage>
    );
  }

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
        <div className="profile-header">
          <div className="avatar-container">
            <IonAvatar className="profile-avatar">
              {user.fullName ? (
                <span className="avatar-initials">{user.fullName.charAt(0).toUpperCase()}</span>
              ) : (
                <IonIcon icon={personOutline} />
              )}
            </IonAvatar>
            {editing && (
              <IonButton fill="clear" className="camera-btn">
                <IonIcon icon={cameraOutline} />
              </IonButton>
            )}
          </div>
          <h2 className="profile-name">{user.fullName}</h2>
          <p className="profile-email">{user.email}</p>
          <div className="kyc-badge" slot="end">
            <IonIcon icon={getKycStatusIcon(user.kycStatus)} />
            <span>KYC: {user.kycStatus}</span>
          </div>
        </div>

        <IonCard className="profile-card">
          <IonCardContent>
            <div className="info-row">
              <IonIcon icon={callOutline} />
              <span>{user.phone || 'Not provided'}</span>
            </div>

            {editing && (
              <div className="edit-form">
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
              </div>
            )}
          </IonCardContent>
        </IonCard>

        <IonList className="profile-menu">
          <IonItem button onClick={() => history.push('/profile/kyc')}>
            <IonIcon icon={documentTextOutline} slot="start" />
            <IonLabel>KYC Verification</IonLabel>
            <IonBadge slot="end" color={getKycStatusColor(user.kycStatus) as any}>
              {user.kycStatus}
            </IonBadge>
            <IonIcon icon={chevronForwardOutline} slot="end" />
          </IonItem>
          <IonItem button onClick={() => history.push('/safety')}>
            <IonIcon icon={shieldOutline} slot="start" />
            <IonLabel>Safety Center</IonLabel>
            <IonIcon icon={chevronForwardOutline} slot="end" />
          </IonItem>
          <IonItem button onClick={handleLogout} color="danger">
            <IonIcon icon={logOutOutline} slot="start" />
            <IonLabel>Sign Out</IonLabel>
          </IonItem>
        </IonList>
      </IonContent>
      <IonLoading isOpen={loading} message="Saving..." />
    </IonPage>
  );
};

export default ProfilePage;
