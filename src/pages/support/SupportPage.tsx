import { IonContent, IonPage } from '@ionic/react';
import { useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { disputeService } from '../../services';
import { Plus, MessageSquare, CheckCircle2, Clock2, ChevronRight, ChevronLeft, AlertTriangle } from 'lucide-react';
import { SkeletonList } from '../../components/Skeleton';
import AppIcon from '../../components/icons/AppIcon';
import type { Dispute } from '../../types';

const FIRE = 'linear-gradient(100deg, var(--fire-red), var(--fire-amber))';

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
      open: { icon: Clock2, cls: 'bg-ink/8 text-ink/55', label: 'Open' },
      in_review: { icon: AlertTriangle, cls: 'bg-fire-gold/25 text-[#9a5b00]', label: 'In Review' },
      resolved: { icon: CheckCircle2, cls: 'bg-fire-orange text-white shadow-glow', label: 'Resolved' },
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

  const Aura = () => (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[320px]">
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(120% 72% at 82% -10%, rgba(255,107,0,0.4) 0%, rgba(255,160,30,0.15) 46%, rgba(255,255,255,0) 74%)' }}
      />
      <div className="absolute -right-16 -top-12 h-72 w-72 rounded-full animate-aurora-1" style={{ background: 'radial-gradient(circle, rgba(255,200,50,0.62) 0%, transparent 62%)', filter: 'blur(48px)' }} />
      <div className="absolute -left-20 top-8 h-52 w-52 rounded-full animate-aurora-2" style={{ background: 'radial-gradient(circle, rgba(255,140,0,0.24) 0%, transparent 62%)', filter: 'blur(50px)' }} />
    </div>
  );

  if (loading) {
    return (
      <IonPage>
        <IonContent fullscreen forceOverscroll={false}>
          <div className="relative min-h-full overflow-hidden bg-white">
            <Aura />
            <div className="relative z-10 mx-auto max-w-2xl px-4 pb-24 pt-[calc(env(safe-area-inset-top)+12px)]">
              <header className="mb-3 flex items-center gap-3">
                <button onClick={() => history.length > 1 ? history.goBack() : history.push('/home')} aria-label="Back" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-black/10 bg-white/70 text-ink shadow-soft backdrop-blur-sm transition active:scale-95">
                  <ChevronLeft size={22} strokeWidth={2.5} />
                </button>
                <div>
                  <p className="mb-0.5 font-display text-xs font-bold uppercase tracking-[0.2em] text-fire-orange">Help center</p>
                  <h1 className="font-display text-[1.7rem] font-extrabold leading-[0.95] tracking-tight text-ink">Support</h1>
                </div>
              </header>
              <SkeletonList count={3} lines={3} />
            </div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonContent fullscreen forceOverscroll={false}>
        <div className="relative min-h-full overflow-hidden bg-white">
          <Aura />
          <div className="relative z-10 mx-auto max-w-2xl px-4 pb-24 pt-[calc(env(safe-area-inset-top)+12px)]">
            <header className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button onClick={() => history.length > 1 ? history.goBack() : history.push('/home')} aria-label="Back" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-black/10 bg-white/70 text-ink shadow-soft backdrop-blur-sm transition active:scale-95">
                  <ChevronLeft size={22} strokeWidth={2.5} />
                </button>
                <div>
                  <p className="mb-0.5 font-display text-xs font-bold uppercase tracking-[0.2em] text-fire-orange">Help center</p>
                  <h1 className="font-display text-[1.7rem] font-extrabold leading-[0.95] tracking-tight text-ink">Support</h1>
                  <p className="mt-0.5 text-sm font-medium text-ink/50">{disputes.length} dispute{disputes.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <button
                onClick={() => history.push('/support/dispute/new')}
                className="grain grain-strong relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl text-white shadow-glow transition active:scale-90"
                style={{ background: FIRE }}
                aria-label="Raise new dispute"
              >
                <Plus className="h-6 w-6" strokeWidth={2.75} />
              </button>
            </header>

            <button
              onClick={() => void fetchDisputes()}
              className="mb-4 font-display text-sm font-bold text-fire-orange transition hover:brightness-95"
              type="button"
            >
              Refresh
            </button>

            {error && (
              <div className="mb-4 rounded-2xl border border-fire-red/20 bg-fire-red/5 p-3 text-sm font-medium text-fire-red">
                {error}
              </div>
            )}

            {disputes.length === 0 ? (
              <div className="animate-fade-in rounded-[18px] border border-black/5 bg-white p-4 text-center shadow-soft">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-primary-100 bg-gradient-to-br from-primary-50 to-white shadow-soft">
                  <AppIcon name="message" className="h-11 w-11" />
                </div>
                <h2 className="mt-3 app-section-title">Need help?</h2>
                <p className="mt-2 text-sm font-medium text-ink/50">You have no disputes yet. Start one and our support team will respond.</p>
                <button
                  onClick={() => history.push('/support/dispute/new')}
                  className="grain grain-strong relative mt-4 w-full overflow-hidden rounded-2xl px-4 py-3.5 font-display font-bold text-white shadow-glow transition active:scale-[0.98]"
                  style={{ background: FIRE }}
                >
                  Raise New Dispute
                </button>
              </div>
            ) : (
              <>
                <div className="mb-4 animate-fade-in rounded-[18px] border border-black/5 bg-white p-4 text-center shadow-soft">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-primary-100 bg-gradient-to-br from-primary-50 to-white">
                    <AppIcon name="message" className="h-8 w-8" />
                  </div>
                  <h2 className="mt-3 font-display text-lg font-extrabold tracking-tight text-ink">Need more help?</h2>
                  <p className="mt-1 text-sm font-medium text-ink/50">Raise another dispute anytime.</p>
                  <button
                    onClick={() => history.push('/support/dispute/new')}
                    className="grain grain-strong relative mt-4 w-full overflow-hidden rounded-2xl px-4 py-3.5 font-display font-bold text-white shadow-glow transition active:scale-[0.98]"
                    style={{ background: FIRE }}
                  >
                    Raise New Dispute
                  </button>
                </div>

                <div className="space-y-3">
                  {disputes.map((dispute) => {
                    const status = getStatusBadge(dispute.status);
                    return (
                      <button
                        key={dispute.id}
                        onClick={() => history.push(`/support/dispute/${dispute.id}`)}
                        className="w-full animate-fade-in rounded-[16px] border border-black/5 bg-white p-4 text-left shadow-soft transition active:scale-[0.99]"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary-100 bg-gradient-to-br from-primary-50 to-white">
                            <MessageSquare className="h-6 w-6 text-fire-orange" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <span className="font-display font-bold capitalize text-ink">{dispute.disputeType}</span>
                              <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-display text-[11px] font-bold ${status.cls}`}>
                                <status.icon className="h-3.5 w-3.5" />
                                {status.label}
                              </span>
                            </div>
                            <p className="mb-2 line-clamp-2 text-sm font-medium text-ink/55">{dispute.description}</p>
                            <div className="flex items-center gap-3 text-xs font-medium text-ink/40">
                              <span>#{dispute.id.slice(0, 8)}</span>
                              <span>{formatDate(dispute.createdAt)}</span>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 shrink-0 text-ink/25" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default SupportPage;
