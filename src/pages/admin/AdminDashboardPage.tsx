import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonIcon, IonList, IonItem, IonLabel, IonBadge, IonCard, IonCardContent, IonLoading } from '@ionic/react';
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { peopleOutline, carOutline, alertCircleOutline, statsChartOutline, chevronForwardOutline, settingsOutline, logOutOutline } from 'ionicons/icons';
import type { User, Ride, Dispute } from '../../types';

const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRides: 0,
    openDisputes: 0,
    activeSos: 0,
  });
  const [loading, setLoading] = useState(true);
  const history = useHistory();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersResult, ridesResult, disputesResult, sosResult] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact' }),
          supabase.from('rides').select('id', { count: 'exact' }),
          supabase.from('disputes').select('id', { count: 'exact' }).eq('status', 'open'),
          supabase.from('sos_alerts').select('id', { count: 'exact' }).eq('status', 'active'),
        ]);

        setStats({
          totalUsers: usersResult.count || 0,
          totalRides: ridesResult.count || 0,
          openDisputes: disputesResult.count || 0,
          activeSos: sosResult.count || 0,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
      setLoading(false);
    };

    if (user?.role === 'admin') {
      fetchStats();
    } else {
      setLoading(false);
    }
  }, [user]);

  if (user?.role !== 'admin') {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Admin Panel</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div style={{ textAlign: 'center', padding: '32px' }}>
            <h2>Access Denied</h2>
            <p>You don't have permission to access the admin panel.</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (loading) {
    return <IonLoading isOpen message="Loading dashboard..." />;
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Admin Dashboard</IonTitle>
          <IonButton slot="end" fill="clear">
            <IonIcon icon={settingsOutline} />
          </IonButton>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <h1>Dashboard</h1>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <IonCard>
            <IonCardContent style={{ textAlign: 'center' }}>
              <IonIcon icon={peopleOutline} style={{ fontSize: '32px', color: 'var(--ion-color-primary)' }} />
              <h2>{stats.totalUsers}</h2>
              <p>Total Users</p>
            </IonCardContent>
          </IonCard>
          <IonCard>
            <IonCardContent style={{ textAlign: 'center' }}>
              <IonIcon icon={carOutline} style={{ fontSize: '32px', color: 'var(--ion-color-success)' }} />
              <h2>{stats.totalRides}</h2>
              <p>Total Rides</p>
            </IonCardContent>
          </IonCard>
          <IonCard>
            <IonCardContent style={{ textAlign: 'center' }}>
              <IonIcon icon={alertCircleOutline} style={{ fontSize: '32px', color: 'var(--ion-color-warning)' }} />
              <h2>{stats.openDisputes}</h2>
              <p>Open Disputes</p>
            </IonCardContent>
          </IonCard>
          <IonCard>
            <IonCardContent style={{ textAlign: 'center' }}>
              <IonIcon icon={statsChartOutline} style={{ fontSize: '32px', color: 'var(--ion-color-danger)' }} />
              <h2>{stats.activeSos}</h2>
              <p>Active SOS</p>
            </IonCardContent>
          </IonCard>
        </div>

        <h2>Quick Actions</h2>
        <IonList>
          <IonItem button onClick={() => history.push('/admin/users')}>
            <IonIcon icon={peopleOutline} slot="start" />
            <IonLabel>User Management</IonLabel>
            <IonIcon icon={chevronForwardOutline} slot="end" />
          </IonItem>
          <IonItem button onClick={() => history.push('/admin/rides')}>
            <IonIcon icon={carOutline} slot="start" />
            <IonLabel>Ride Management</IonLabel>
            <IonIcon icon={chevronForwardOutline} slot="end" />
          </IonItem>
          <IonItem button onClick={() => history.push('/admin/disputes')}>
            <IonIcon icon={alertCircleOutline} slot="start" />
            <IonLabel>Dispute Queue</IonLabel>
            <IonIcon icon={chevronForwardOutline} slot="end" />
          </IonItem>
        </IonList>
      </IonContent>
    </IonPage>
  );
};

export default AdminDashboardPage;
