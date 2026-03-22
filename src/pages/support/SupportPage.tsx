import { IonContent, IonPage } from '@ionic/react';
import { useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { disputeService } from '../../services';
import { Plus, MessageSquare, HelpCircle, CheckCircle2, Clock2, ChevronRight, AlertTriangle } from 'lucide-react';
import { SkeletonList } from '../../components/Skeleton';
import type { Dispute } from '../../types';

const SupportPage = () => {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const history = useHistory();

  const fetchDisputes = useCallback(async () => {
    if (!user) {
      setDisputes([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const result = await disputeService.getDisputes(user.id);
      if (result.success && result.disputes) {
        setDisputes(result.disputes);
      } else {
        setError(result.error || 'Failed to load disputes');
      }
    } catch {
      setError('Failed to load disputes');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchDisputes();
  }, [fetchDisputes]);

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
        <IonContent className="bg-gray-50" fullscreen forceOverscroll={false}>
          <div className="mx-auto max-w-2xl px-4 pb-24 pt-[calc(env(safe-area-inset-top)+16px)]">
            <header className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Support & Disputes</h1>
            </header>
            <SkeletonList count={3} lines={3} />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonContent className="bg-gray-50" fullscreen forceOverscroll={false}>
        <div className="mx-auto max-w-2xl px-4 pb-24 pt-[calc(env(safe-area-inset-top)+16px)]">
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

          <button
            onClick={() => void fetchDisputes()}
            className="mb-4 text-sm font-medium text-primary-600 hover:text-primary-700"
            type="button"
          >
            Refresh
          </button>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {disputes.length === 0 ? (
            <div className="card p-8 text-center animate-fade-in">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100">
                <HelpCircle className="h-8 w-8 text-primary-600" />
              </div>
              <h2 className="mb-2 text-xl font-bold text-gray-900">Need Help?</h2>
              <p className="mb-6 text-gray-500">You have no disputes yet. Start one and our support team will respond.</p>
              <button
                onClick={() => history.push('/support/dispute/new')}
                className="w-full btn btn-primary"
              >
                Raise New Dispute
              </button>
            </div>
          ) : (
            <>
              <div className="card p-6 mb-4 animate-fade-in">
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-100">
                    <HelpCircle className="h-7 w-7 text-primary-600" />
                  </div>
                  <h2 className="mb-1 text-lg font-bold text-gray-900">Need more help?</h2>
                  <p className="text-sm text-gray-500 mb-4">Raise another dispute anytime.</p>
                  <button
                    onClick={() => history.push('/support/dispute/new')}
                    className="w-full btn btn-primary"
                  >
                    Raise New Dispute
                  </button>
                </div>
              </div>

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
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default SupportPage;
