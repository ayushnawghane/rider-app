import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import LoadingOverlay from '../../components/LoadingOverlay';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

type AdminSection = 'users' | 'rides' | 'disputes';

interface AdminRow {
  id: string;
  title: string;
  subtitle: string;
  meta?: string;
}

const sectionTitles: Record<AdminSection, string> = {
  users: 'Users',
  rides: 'Rides',
  disputes: 'Disputes',
};

const isAdminSection = (value: string): value is AdminSection =>
  ['users', 'rides', 'disputes'].includes(value);

const AdminListPage: React.FC = () => {
  const { user } = useAuth();
  const { section = 'users' } = useParams<{ section: string }>();
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRows = async () => {
      if (user?.role !== 'admin' || !isAdminSection(section)) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        if (section === 'users') {
          const { data, error: queryError } = await supabase
            .from('profiles')
            .select('id, full_name, email, phone, role, kyc_status')
            .order('created_at', { ascending: false })
            .limit(100);

          if (queryError) throw queryError;
          setRows((data || []).map((profile: any) => ({
            id: profile.id,
            title: profile.full_name || profile.email || 'Unnamed user',
            subtitle: [profile.email, profile.phone].filter(Boolean).join(' • '),
            meta: `${profile.role || 'rider'} • KYC ${profile.kyc_status || 'pending'}`,
          })));
        }

        if (section === 'rides') {
          const { data, error: queryError } = await supabase
            .from('rides')
            .select('id, start_location, end_location, date, status, booked_seats, available_seats')
            .order('date', { ascending: false })
            .limit(100);

          if (queryError) throw queryError;
          setRows((data || []).map((ride: any) => ({
            id: ride.id,
            title: `${ride.start_location} -> ${ride.end_location}`,
            subtitle: new Date(ride.date).toLocaleString(),
            meta: `${ride.status} • ${ride.booked_seats ?? 0}/${ride.available_seats ?? 0} seats`,
          })));
        }

        if (section === 'disputes') {
          const { data, error: queryError } = await supabase
            .from('disputes')
            .select('id, dispute_type, description, status, created_at')
            .order('created_at', { ascending: false })
            .limit(100);

          if (queryError) throw queryError;
          setRows((data || []).map((dispute: any) => ({
            id: dispute.id,
            title: `${dispute.dispute_type} dispute`,
            subtitle: dispute.description,
            meta: dispute.status,
          })));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load admin data');
      } finally {
        setLoading(false);
      }
    };

    fetchRows();
  }, [section, user]);

  if (user?.role !== 'admin') {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Admin Panel</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <h2>Access Denied</h2>
          <p>You don't have permission to access the admin panel.</p>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin" />
          </IonButtons>
          <IonTitle>{isAdminSection(section) ? sectionTitles[section] : 'Admin'}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <LoadingOverlay isOpen={loading} variant="fullscreen" message="Loading admin data..." />
        {error && <p style={{ color: 'var(--ion-color-danger)' }}>{error}</p>}
        {!loading && !error && rows.length === 0 && <p>No records found.</p>}
        <IonList>
          {rows.map((row) => (
            <IonItem key={row.id}>
              <IonLabel>
                <h2>{row.title}</h2>
                <p>{row.subtitle}</p>
                {row.meta && <p>{row.meta}</p>}
              </IonLabel>
            </IonItem>
          ))}
        </IonList>
      </IonContent>
    </IonPage>
  );
};

export default AdminListPage;
