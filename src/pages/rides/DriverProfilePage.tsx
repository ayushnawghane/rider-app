import { useEffect, useState } from 'react';
import { useParams, useHistory } from 'react-router';
import { ChevronLeft, Star, Phone, Mail, ShieldCheck, Car, BadgeCheck } from 'lucide-react';
import { rideService } from '../../services';
import type { DriverProfile } from '../../types';
import { PageLoader } from '../../components/ui';

const FIRE = 'linear-gradient(100deg, var(--fire-red), var(--fire-amber))';

const memberSinceLabel = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

const reviewDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const Stars = ({ value, size = 14 }: { value: number; size?: number }) => (
  <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        style={{ width: size, height: size }}
        className={n <= Math.round(value) ? 'fill-fire-gold text-fire-gold' : 'fill-ink/10 text-ink/15'}
      />
    ))}
  </span>
);

const DriverProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const history = useHistory();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const result = await rideService.getDriverProfile(id);
      if (!active) return;
      if (result.success && result.profile) setProfile(result.profile);
      else setError(result.error || 'Driver not found');
      setLoading(false);
    })();
    return () => { active = false; };
  }, [id]);

  if (loading) return <PageLoader />;

  if (error || !profile) {
    return (
      <div className="app-scroll-screen app-bottom-nav-safe bg-white px-4 pt-[calc(env(safe-area-inset-top)+12px)]">
        <button onClick={() => history.goBack()} aria-label="Back" className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl border border-black/10 bg-white/70 shadow-soft">
          <ChevronLeft size={22} strokeWidth={2.5} />
        </button>
        <div className="app-card text-center">
          <h1 className="app-section-title">Driver unavailable</h1>
          <p className="mt-2 text-sm font-medium text-ink/50">{error}</p>
        </div>
      </div>
    );
  }

  const since = memberSinceLabel(profile.memberSince);
  const verifications = [
    { key: 'phone', label: 'Phone', ok: profile.verifications.phone, Icon: Phone },
    { key: 'email', label: 'Email', ok: profile.verifications.email, Icon: Mail },
    { key: 'kyc', label: 'ID', ok: profile.verifications.kyc, Icon: ShieldCheck },
  ];

  return (
    <div className="app-scroll-screen app-bottom-nav-safe relative overflow-hidden bg-white">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[240px]">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 72% at 82% -10%, rgba(255,107,0,0.35) 0%, rgba(255,160,30,0.14) 46%, rgba(255,255,255,0) 74%)' }} />
      </div>

      <div className="relative z-10 px-4 pb-8 pt-[calc(env(safe-area-inset-top)+12px)]">
        <button onClick={() => history.goBack()} aria-label="Back" className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl border border-black/10 bg-white/70 text-ink shadow-soft backdrop-blur-sm transition active:scale-95">
          <ChevronLeft size={22} strokeWidth={2.5} />
        </button>

        {/* Identity */}
        <div className="app-card">
          <div className="flex items-center gap-4">
            <img
              src={profile.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=random`}
              alt={profile.name}
              className="h-16 w-16 rounded-2xl object-cover"
            />
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-xl font-extrabold tracking-tight text-ink">{profile.name}</h1>
              {profile.rating != null ? (
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="font-display text-sm font-bold text-fire-gold">★ {profile.rating.toFixed(1)}</span>
                  <span className="text-xs font-medium text-ink/45">· {profile.reviewCount} review{profile.reviewCount === 1 ? '' : 's'}</span>
                </div>
              ) : (
                <span className="mt-1 inline-block rounded-full bg-primary-50 px-2.5 py-0.5 text-[11px] font-bold text-primary-600">New driver</span>
              )}
              {since && <p className="mt-1 text-xs font-medium text-ink/45">Member since {since}</p>}
            </div>
          </div>

          {/* Verifications */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {verifications.map(({ key, label, ok, Icon }) => (
              <div
                key={key}
                className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 ${
                  ok ? 'border-emerald-200 bg-emerald-50/60' : 'border-black/5 bg-paper'
                }`}
              >
                <span className="relative">
                  <Icon className={`h-5 w-5 ${ok ? 'text-emerald-600' : 'text-ink/30'}`} strokeWidth={2.4} />
                  {ok && <BadgeCheck className="absolute -bottom-1 -right-1.5 h-3.5 w-3.5 fill-emerald-500 text-white" />}
                </span>
                <span className={`text-[11px] font-bold ${ok ? 'text-emerald-700' : 'text-ink/40'}`}>
                  {label}{ok ? ' ✓' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats + vehicle */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="app-card">
            <p className="font-display text-2xl font-extrabold leading-none text-ink">{profile.ridesPublished}</p>
            <p className="mt-1 font-display text-[11px] font-bold uppercase tracking-wide text-ink/45">Rides published</p>
          </div>
          {profile.vehicle?.vehicleType || profile.vehicle?.vehicleNumber ? (
            <div className="app-card">
              <div className="flex items-center gap-1.5 text-ink">
                <Car className="h-4 w-4 shrink-0 text-fire-orange" />
                <p className="truncate font-display text-sm font-bold capitalize">{profile.vehicle?.vehicleType || 'Vehicle'}</p>
              </div>
              {profile.vehicle?.vehicleNumber && (
                <p className="mt-1 font-display text-[11px] font-bold uppercase tracking-wide text-ink/45">{profile.vehicle.vehicleNumber}</p>
              )}
            </div>
          ) : (
            <div className="app-card flex items-center justify-center text-center">
              <p className="text-xs font-medium text-ink/40">Vehicle added at publish</p>
            </div>
          )}
        </div>

        {/* Reviews */}
        <div className="mt-4">
          <h2 className="app-section-title mb-2">Reviews</h2>
          {profile.reviews.length === 0 ? (
            <div className="app-card text-center">
              <p className="text-sm font-medium text-ink/50">No reviews yet. Be the first to ride with {profile.name.split(' ')[0]}.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {profile.reviews.map((r) => (
                <div key={r.id} className="app-card">
                  <div className="flex items-center gap-3">
                    <img
                      src={r.reviewerAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.reviewerName)}&background=random`}
                      alt={r.reviewerName}
                      className="h-9 w-9 rounded-xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-sm font-bold text-ink">{r.reviewerName}</p>
                      <div className="flex items-center gap-2">
                        <Stars value={r.rating} />
                        <span className="text-[11px] font-medium text-ink/40">{reviewDate(r.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  {r.review && <p className="mt-2 text-sm font-medium text-ink/70">{r.review}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DriverProfilePage;
