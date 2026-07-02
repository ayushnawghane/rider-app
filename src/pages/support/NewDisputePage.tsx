import { IonContent, IonPage } from '@ionic/react';
import { useState, useEffect } from 'react';
import { useHistory, useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { disputeService } from '../../services';
import { isUuid } from '../../utils/helpers';
import { MessageSquare, CheckCircle2, AlertCircle, Car, FileText, HelpCircle, ChevronLeft } from 'lucide-react';

const FIRE = 'linear-gradient(100deg, var(--fire-red), var(--fire-amber))';

const NewDisputePage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [disputeType, setDisputeType] = useState<'ride' | 'kyc' | 'other'>('ride');
  const [rideId, setRideId] = useState('');
  const [description, setDescription] = useState('');

  const history = useHistory();

  const queryParams = new URLSearchParams(location.search);
  const preselectedRideId = queryParams.get('rideId');

  useEffect(() => {
    if (preselectedRideId) {
      setRideId(preselectedRideId);
    }
  }, [preselectedRideId]);

  const handleBack = () => {
    if (history.length > 1) {
      history.goBack();
      return;
    }
    history.replace('/support');
  };

  const handleSubmit = async () => {
    const trimmedDescription = description.trim();
    if (!trimmedDescription) {
      setError('Please provide a description');
      return;
    }

    if (trimmedDescription.length < 10) {
      setError('Please share a little more detail (at least 10 characters).');
      return;
    }

    const trimmedRideId = rideId.trim();
    if (trimmedRideId && !isUuid(trimmedRideId)) {
      setError('That ride ID is not valid. Leave it blank or paste a ride ID from Your Rides.');
      return;
    }

    if (!user) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await disputeService.createDispute({
        userId: user.id,
        rideId: trimmedRideId || undefined,
        disputeType,
        description: trimmedDescription,
      });

      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || 'Failed to create dispute');
      }
    } catch {
      setError('Failed to create dispute');
    } finally {
      setLoading(false);
    }
  };

  const disputeTypes: { key: 'ride' | 'kyc' | 'other'; Icon: typeof Car; label: string }[] = [
    { key: 'ride', Icon: Car, label: 'Ride Issue' },
    { key: 'kyc', Icon: FileText, label: 'KYC Verification' },
    { key: 'other', Icon: HelpCircle, label: 'Other Issue' },
  ];

  return (
    <IonPage>
      <IonContent>
        <div className="app-top-safe relative min-h-full overflow-hidden bg-white">
          {/* Grainy orange aura */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[300px]">
            <div
              className="absolute inset-0"
              style={{ background: 'radial-gradient(120% 72% at 82% -10%, rgba(255,107,0,0.4) 0%, rgba(255,160,30,0.15) 46%, rgba(255,255,255,0) 74%)' }}
            />
            <div className="absolute -right-16 -top-12 h-72 w-72 rounded-full animate-aurora-1" style={{ background: 'radial-gradient(circle, rgba(255,200,50,0.62) 0%, transparent 62%)', filter: 'blur(48px)' }} />
          </div>

          <div className="relative z-10 mx-auto max-w-2xl px-4 pb-6 pt-5">
            {/* Header */}
            <div className="mb-6 flex items-center gap-3">
              <button
                onClick={handleBack}
                aria-label="Back"
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-black/10 bg-white/70 text-ink shadow-soft backdrop-blur-sm transition active:scale-95"
              >
                <ChevronLeft size={22} strokeWidth={2.5} />
              </button>
              <div>
                <p className="mb-0.5 font-display text-xs font-bold uppercase tracking-[0.2em] text-fire-orange">Support</p>
                <h1 className="font-display text-[2.2rem] font-extrabold leading-[0.9] tracking-tight text-ink">Raise dispute</h1>
              </div>
            </div>

            {!success ? (
              <div className="animate-fade-in space-y-6 rounded-[18px] border border-black/5 bg-white p-4 shadow-soft">
                <div>
                  <label className="mb-2 block font-display text-[11px] font-bold uppercase tracking-wide text-ink/45">Dispute type</label>
                  <div className="grid grid-cols-3 gap-3">
                    {disputeTypes.map(({ key, Icon, label }) => {
                      const selected = disputeType === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setDisputeType(key)}
                          className={`rounded-2xl border-2 p-4 text-center transition-all ${
                            selected ? 'border-primary-500 bg-primary-50 shadow-soft' : 'border-black/10 hover:border-primary-300'
                          }`}
                        >
                          <Icon className={`mx-auto mb-2 h-6 w-6 ${selected ? 'text-fire-orange' : 'text-ink/35'}`} />
                          <p className={`font-display text-xs font-bold ${selected ? 'text-primary-700' : 'text-ink/55'}`}>{label}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {disputeType === 'ride' && (
                  <div>
                    <label className="mb-2 block font-display text-[11px] font-bold uppercase tracking-wide text-ink/45">Ride ID (optional)</label>
                    <input
                      type="text"
                      value={rideId}
                      onChange={(e) => setRideId(e.target.value)}
                      placeholder="Enter related ride ID"
                      className="w-full rounded-2xl border-2 border-black/10 bg-white px-4 py-3 font-medium text-ink outline-none transition focus:border-fire-orange focus:ring-2 focus:ring-[rgba(255,107,0,0.18)]"
                    />
                  </div>
                )}

                <div>
                  <label className="mb-2 block font-display text-[11px] font-bold uppercase tracking-wide text-ink/45">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Please describe your issue in detail. Include any relevant information such as ride ID, date, and specific concerns..."
                    rows={6}
                    className="w-full resize-none rounded-2xl border-2 border-black/10 bg-white px-4 py-3 font-medium text-ink outline-none transition focus:border-fire-orange focus:ring-2 focus:ring-[rgba(255,107,0,0.18)]"
                    maxLength={500}
                  />
                  <p className="mt-2 text-xs font-medium text-ink/45">{description.length} / 500 characters</p>
                </div>

                {error && (
                  <div className="flex items-start gap-3 rounded-2xl border border-fire-red/20 bg-fire-red/5 p-4">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-fire-red" />
                    <p className="text-sm font-medium text-fire-red">{error}</p>
                  </div>
                )}

                <div className="rounded-2xl border border-primary-100 bg-primary-50/60 p-4">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-fire-orange" />
                    <div>
                      <p className="font-display font-bold text-ink">Tips for a good dispute</p>
                      <ul className="mt-2 list-inside list-disc space-y-1 text-sm font-medium text-ink/60">
                        <li>Be as specific as possible about the issue</li>
                        <li>Include relevant dates and times</li>
                        <li>Attach any supporting documents if available</li>
                        <li>Keep your tone professional and constructive</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="grain grain-strong relative w-full overflow-hidden rounded-2xl py-4 font-display text-lg font-bold tracking-tight text-white shadow-glow transition-all active:scale-[0.98] disabled:opacity-80"
                  style={{ background: FIRE }}
                >
                  {loading ? 'Submitting...' : 'Submit Dispute'}
                </button>
              </div>
            ) : (
              <div className="animate-fade-in rounded-[18px] border border-black/5 bg-white p-5 text-center shadow-soft">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                </div>
                <h2 className="mt-5 font-display text-2xl font-extrabold tracking-tight text-ink">Dispute submitted!</h2>
                <p className="mt-2 text-sm font-medium text-ink/50">Your dispute has been submitted successfully. Our support team will review it shortly and get back to you.</p>
                <div className="mt-6 rounded-2xl border border-primary-100 bg-primary-50/60 p-4 text-left">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-fire-orange" />
                    <div>
                      <p className="font-display font-bold text-ink">What happens next?</p>
                      <p className="mt-1 text-sm font-medium text-ink/60">
                        You'll receive updates on your dispute status through notifications. Our team typically responds within 24-48 hours.
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => history.replace('/support')}
                  className="grain grain-strong relative mt-6 w-full overflow-hidden rounded-2xl py-3.5 font-display font-bold text-white shadow-glow transition active:scale-[0.98]"
                  style={{ background: FIRE }}
                >
                  View My Disputes
                </button>
              </div>
            )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default NewDisputePage;
