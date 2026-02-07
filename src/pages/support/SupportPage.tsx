import { IonContent, IonPage, IonRefresher, IonRefresherContent } from '@ionic/react';
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { disputeService } from '../../services';
import { ArrowLeft, Plus, MessageSquare, HelpCircle, CheckCircle2, Clock2, XCircle, ChevronRight, AlertTriangle } from 'lucide-react';
import type { Dispute } from '../../types';

const SupportPage = () => {
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

  const getStatusBadge = (status: string) => {
    const statusMap = {
      open: { icon: Clock2, color: 'status-completed', label: 'Open' },
      in_review: { icon: AlertTriangle, color: 'status-pending', label: 'In Review' },
      resolved: { icon: CheckCircle2, color: 'status-active', label: 'Resolved' },
    };
    return statusMap[status as keyof typeof statusMap] || statusMap.open;
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
    return (
      <IonPage>
        <IonContent className="ion-padding bg-gray-50">
          <div className="max-w-2xl mx-auto px-4 py-6">
            <header className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Support & Disputes</h1>
            </header>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card p-4 animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-3" />
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                </div>
              ))}
            </div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonContent className="ion-padding bg-gray-50">
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
          <header className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Support & Disputes</h1>
              <p className="text-gray-500 mt-1">{disputes.length} dispute{disputes.length !== 1 ? 's' : ''}</p>
            </div>
            <button
              onClick={() => history.push('/support/dispute/new')}
              className="p-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 active:scale-95 transition-all"
            >
              <Plus className="w-6 h-6" />
            </button>
          </header>

          <div className="card p-6 mb-6 animate-fade-in">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <HelpCircle className="w-8 h-8 text-primary-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Need Help?</h2>
              <p className="text-gray-500">Raise a dispute for a ride or contact our support team</p>
            </div>
            <button
              onClick={() => history.push('/support/dispute/new')}
              className="w-full btn btn-primary"
            >
              Raise New Dispute
            </button>
          </div>

          {disputes.length === 0 ? (
            <div className="card p-8 text-center animate-fade-in">
              <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">No Disputes</h2>
              <p className="text-gray-500 mb-6">You haven't raised any disputes yet</p>
              <button
                onClick={() => history.push('/support/dispute/new')}
                className="w-full btn btn-primary"
              >
                Raise Your First Dispute
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {disputes.map((dispute) => {
                const status = getStatusBadge(dispute.status);
                return (
                  <button
                    key={dispute.id}
                    onClick={() => history.push(`/support/dispute/${dispute.id}`)}
                    className="card p-4 text-left hover:shadow-medium transition-all w-full animate-fade-in"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-warning-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="w-6 h-6 text-warning-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-gray-900 capitalize">{dispute.disputeType}</span>
                          <span className={`badge ${status.color} flex items-center gap-1.5`}>
                            <status.icon className="w-3.5 h-3.5" />
                            {status.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 line-clamp-2 mb-2">{dispute.description}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-500">#{dispute.id.slice(0, 8)}</span>
                          <span className="text-gray-500">{formatDate(dispute.createdAt)}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default SupportPage;
