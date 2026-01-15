import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonIcon, IonList, IonItem, IonLabel, IonBadge, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonLoading, IonSkeletonText, IonFab, IonFabButton } from '@ionic/react';
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { UserButton } from '@clerk/clerk-react';
import { rideService } from '../../services';
import { addOutline, timeOutline, notificationsOutline, settingsOutline, helpCircleOutline, shieldOutline, carOutline, locationOutline, calendarOutline, chevronForwardOutline, alertCircleOutline } from 'ionicons/icons';
import type { Ride } from '../../types';
import './HomePage.css';

const HomePage: React.FC = () => {
  const { user, isClerkLoaded } = useAuth();
  const [activeRide, setActiveRide] = useState<Ride | undefined>();
  const [recentRides, setRecentRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const history = useHistory();

  useEffect(() => {
    const fetchRideData = async () => {
      if (user && isClerkLoaded) {
        setLoading(true);
        const activeResult = await rideService.getActiveRide(user.id);
        if (activeResult.success) {
          setActiveRide(activeResult.ride);
        }

        const historyResult = await rideService.getRides(user.id, 3);
        if (historyResult.success) {
          setRecentRides(historyResult.rides || []);
        }
        setLoading(false);
      }
    };

    fetchRideData();
  }, [user, isClerkLoaded]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'pending': return 'warning';
      case 'completed': return 'primary';
      case 'cancelled': return 'danger';
      default: return 'medium';
    }
  };

  if (!isClerkLoaded) {
    return (
      <IonPage>
        <IonContent className="ion-padding">
          <div className="home-skeleton">
            <IonSkeletonText animated style={{ width: '60%', height: '32px' }} />
            <IonSkeletonText animated style={{ width: '40%', height: '24px', marginTop: '8px' }} />
            <IonSkeletonText animated style={{ width: '100%', height: '150px', marginTop: '24px', borderRadius: '16px' }} />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar className="home-toolbar">
          <IonTitle className="app-title">RiderApp</IonTitle>
          <div slot="end" className="user-menu">
            <IonButton fill="clear" onClick={() => history.push('/notifications')}>
              <IonIcon icon={notificationsOutline} />
            </IonButton>
            <div className="user-avatar-small">
              <UserButton afterSignOutUrl="/login" />
            </div>
          </div>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="home-content">
          <div className="welcome-section">
            <h1>Welcome, {user?.fullName || 'Rider'}!</h1>
            <p className="subtitle">Manage your rides and requests</p>
          </div>

          {loading ? (
            <IonCard className="ride-card">
              <IonCardContent>
                <IonSkeletonText animated style={{ width: '60%' }} />
                <IonSkeletonText animated style={{ width: '80%', marginTop: '8px' }} />
                <IonSkeletonText animated style={{ width: '40%', marginTop: '8px' }} />
              </IonCardContent>
            </IonCard>
          ) : activeRide ? (
            <IonCard className="active-ride-card">
              <IonCardHeader>
                <IonCardTitle>
                  <IonIcon icon={carOutline} className="card-icon" />
                  Active Ride
                </IonCardTitle>
                <IonBadge color={getStatusColor(activeRide.status)}>
                  {activeRide.status}
                </IonBadge>
              </IonCardHeader>
              <IonCardContent>
                <div className="ride-info">
                  <div className="ride-route">
                    <div className="route-point">
                      <IonIcon icon={locationOutline} />
                      <span>{activeRide.startLocation}</span>
                    </div>
                    <div className="route-line"></div>
                    <div className="route-point">
                      <IonIcon icon={locationOutline} />
                      <span>{activeRide.endLocation}</span>
                    </div>
                  </div>
                  <div className="ride-details">
                    <div className="detail-item">
                      <IonIcon icon={calendarOutline} />
                      <span>{new Date(activeRide.date).toLocaleDateString()}</span>
                    </div>
                    <div className="detail-item">
                      <IonIcon icon={carOutline} />
                      <span>{activeRide.vehicleType} - {activeRide.vehicleNumber}</span>
                    </div>
                  </div>
                </div>
                <IonButton expand="block" onClick={() => history.push(`/rides/${activeRide.id}`)}>
                  View Details
                </IonButton>
              </IonCardContent>
            </IonCard>
          ) : (
            <IonCard className="no-ride-card">
              <IonCardContent>
                <div className="no-ride-content">
                  <IonIcon icon={carOutline} className="no-ride-icon" />
                  <h3>No Active Ride</h3>
                  <p>You don't have any active ride at the moment</p>
                </div>
              </IonCardContent>
            </IonCard>
          )}

          <IonButton
            expand="block"
            className="upload-ride-btn"
            onClick={() => history.push('/rides/upload')}
          >
            <IonIcon icon={addOutline} slot="start" />
            Upload New Ride
          </IonButton>

          <div className="quick-actions">
            <h2>Quick Actions</h2>
            <div className="action-grid">
              <div className="action-item" onClick={() => history.push('/rides/upload')}>
                <div className="action-icon">
                  <IonIcon icon={addOutline} />
                </div>
                <span>Upload Ride</span>
              </div>
              <div className="action-item" onClick={() => history.push('/rides/history')}>
                <div className="action-icon">
                  <IonIcon icon={timeOutline} />
                </div>
                <span>Ride History</span>
              </div>
              <div className="action-item" onClick={() => history.push('/support')}>
                <div className="action-icon">
                  <IonIcon icon={helpCircleOutline} />
                </div>
                <span>Support</span>
              </div>
              <div className="action-item" onClick={() => history.push('/safety')}>
                <div className="action-icon sos">
                  <IonIcon icon={shieldOutline} />
                </div>
                <span>SOS</span>
              </div>
            </div>
          </div>

          {recentRides.length > 0 && (
            <div className="recent-section">
              <div className="section-header">
                <h2>Recent Rides</h2>
                <IonButton fill="clear" onClick={() => history.push('/rides/history')}>
                  View All
                  <IonIcon icon={chevronForwardOutline} slot="end" />
                </IonButton>
              </div>
              <IonList className="recent-list">
                {recentRides.map((ride) => (
                  <IonItem key={ride.id} button onClick={() => history.push(`/rides/${ride.id}`)} className="recent-item">
                    <div className="recent-item-content">
                      <div className="recent-route">
                        <span>{ride.startLocation}</span>
                        <IonIcon icon={chevronForwardOutline} />
                        <span>{ride.endLocation}</span>
                      </div>
                      <div className="recent-meta">
                        <IonBadge color={getStatusColor(ride.status)}>{ride.status}</IonBadge>
                        <span>{new Date(ride.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </IonItem>
                ))}
              </IonList>
            </div>
          )}
        </div>

        <IonFab vertical="bottom" horizontal="end" slot="fixed" className="sos-fab">
          <IonFabButton color="danger" onClick={() => history.push('/safety')}>
            <IonIcon icon={alertCircleOutline} />
          </IonFabButton>
        </IonFab>
      </IonContent>
    </IonPage>
  );
};

export default HomePage;
