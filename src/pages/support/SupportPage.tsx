import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonIcon, IonList, IonItem, IonLabel, IonBadge, IonCard, IonCardContent, IonLoading, IonRefresher, IonRefresherContent } from '@ionic/react';
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { disputeService } from '../../services';
import { chevronForwardOutline, createOutline, helpCircleOutline } from 'ionicons/icons';
import type { Dispute } from '../../types';

const SupportPage: React.FC = () => {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const history = useHistory();

  const fetchDisputes = async () => {
    if (!user) return;
    
    const result = await disputeService.getDisputes(user.id);
    if (result.success && result.disputes) {
      setDisputes(result.disputes);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDisputes();
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDisputes();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'success';
      case 'in_review': return 'warning';
      case 'open': return 'primary';
      default: return 'medium';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return <IonLoading isOpen message="Loading support tickets..." />;
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Support & Disputes</IonTitle>
          <IonButton slot="end" fill="clear" onClick={() => history.push('/support/dispute/new')}>
            <IonIcon icon={createOutline} />
          </IonButton>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <IonCard>
          <IonCardContent>
            <h3>Need Help?</h3>
            <p>Raise a dispute for a ride or contact our support team.</p>
            <IonButton expand="block" onClick={() => history.push('/support/dispute/new')}>
              Raise New Dispute
            </IonButton>
          </IonCardContent>
        </IonCard>

        <h2 style={{ padding: '0 16px' }}>Your Disputes</h2>

        {disputes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px' }}>
            <IonIcon icon={helpCircleOutline} style={{ fontSize: '64px', color: '#ccc' }} />
            <h3>No Disputes</h3>
            <p>You haven't raised any disputes yet.</p>
          </div>
        ) : (
          <IonList>
            {disputes.map((dispute) => (
              <IonItem
                key={dispute.id}
                button
                onClick={() => history.push(`/support/dispute/${dispute.id}`)}
              >
                <IonLabel>
                  <h3>{dispute.disputeType.toUpperCase()} - {dispute.id.slice(0, 8)}</h3>
                  <p>{dispute.description.slice(0, 100)}...</p>
                  <p>{formatDate(dispute.createdAt)}</p>
                </IonLabel>
                <IonBadge slot="end" color={getStatusColor(dispute.status) as any}>
                  {dispute.status.replace('_', ' ')}
                </IonBadge>
              </IonItem>
            ))}
          </IonList>
        )}
      </IonContent>
    </IonPage>
  );
};

export default SupportPage;
