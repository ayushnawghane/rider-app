import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router';
import { useIonViewWillEnter } from '@ionic/react';
import { ArrowLeft, Send } from 'lucide-react';
import AppIcon from '../../components/icons/AppIcon';
import { useAuth } from '../../context/AuthContext';
import { rideService, rideChatService } from '../../services';
import type { RideMessage } from '../../services';
import type { Ride } from '../../types';

interface InboxLocationState {
  rideId?: string;
  peerId?: string;
}

interface ChatPeer {
  id: string;
  name: string;
  avatar?: string;
}

const FIRE = 'linear-gradient(100deg, var(--fire-red), var(--fire-amber))';

const isChatEligible = (status: Ride['status']) => status === 'pending' || status === 'active';

const peerFromDriver = (ride: Ride): ChatPeer => ({
  id: ride.driverId || ride.userId,
  name: ride.driver?.name || 'Driver',
  avatar: ride.driver?.avatar,
});

/** Conversation list shown when the Inbox tab is opened without a specific ride. */
const ConversationList = () => {
  const { user } = useAuth();
  const history = useHistory();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) {
      setRides([]);
      setLoading(false);
      return;
    }
    const result = await rideService.getRides(user.id);
    if (result.success) {
      setRides((result.rides || []).filter((ride) => isChatEligible(ride.status)));
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);
  useIonViewWillEnter(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-4">
        <p className="mb-1 font-display text-xs font-bold uppercase tracking-[0.2em] text-fire-orange">Messages</p>
        <h1 className="app-page-title">Inbox</h1>
        <p className="mt-2 text-sm font-medium text-ink/50">Chat about your upcoming and active rides</p>
      </header>

      {loading ? (
        <div className="rounded-[18px] border border-black/5 bg-white p-4 text-center shadow-soft">
          <p className="text-sm font-medium text-ink/50">Loading conversations…</p>
        </div>
      ) : rides.length === 0 ? (
        <div className="rounded-[18px] border border-black/5 bg-white p-4 text-center shadow-soft">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-primary-100 bg-gradient-to-br from-primary-50 to-white shadow-soft">
            <AppIcon name="inbox" className="h-11 w-11" />
          </div>
          <h2 className="mt-3 app-section-title">No conversations yet</h2>
          <p className="mt-2 text-sm font-medium text-ink/50">
            Book or publish a ride, then chat with the driver or your passengers here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rides.map((ride) => {
            const asDriver = ride.userRole === 'driver';
            return (
              <button
                key={ride.id}
                onClick={() => history.push('/inbox', { rideId: ride.id })}
                className="flex w-full items-center gap-3 rounded-[14px] border border-black/5 bg-white p-4 text-left shadow-soft transition active:scale-[0.99]"
              >
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl text-white shadow-glow" style={{ background: FIRE }}>
                  <AppIcon name="message" className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-sm font-bold text-ink">
                    {ride.startLocation?.split(',')[0]} → {ride.endLocation?.split(',')[0]}
                  </p>
                  <p className="mt-0.5 truncate text-xs font-medium text-ink/50">
                    {asDriver ? 'Chat with your passengers' : `Chat with ${ride.driver?.name || 'your driver'}`}
                  </p>
                </div>
                <span className="flex-shrink-0 rounded-full bg-paper px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-ink/50">
                  {ride.status === 'active' ? 'Active' : 'Upcoming'}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/** A single 1:1 ride conversation. */
const ChatThread = ({ rideId, initialPeerId }: { rideId: string; initialPeerId?: string }) => {
  const { user } = useAuth();
  const history = useHistory();
  const [ride, setRide] = useState<Ride | null>(null);
  const [peer, setPeer] = useState<ChatPeer | null>(null);
  const [passengerPeers, setPassengerPeers] = useState<ChatPeer[]>([]);
  const [messages, setMessages] = useState<RideMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isDriver = useMemo(
    () => Boolean(user?.id && ride && (ride.userId === user.id || ride.driverId === user.id)),
    [ride, user?.id],
  );
  const canSend = Boolean(ride && isChatEligible(ride.status) && peer);

  // Resolve the ride and the counterpart(s).
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const result = await rideService.getRideById(rideId);
      if (!active) return;
      if (!result.success || !result.ride) {
        setError(result.error || 'Ride not found');
        setLoading(false);
        return;
      }
      const loadedRide = result.ride;
      setRide(loadedRide);

      const viewerIsDriver = Boolean(
        user?.id && (loadedRide.userId === user.id || loadedRide.driverId === user.id),
      );

      if (!viewerIsDriver) {
        // Passenger → always talks to the driver.
        setPeer(peerFromDriver(loadedRide));
      } else {
        // Driver → talks to a chosen passenger.
        const participants = await rideService.getRideParticipants(rideId);
        if (!active) return;
        const peers: ChatPeer[] = (participants.bookings || [])
          .filter((b: any) => b.passenger_id && b.passenger_id !== user?.id)
          .map((b: any) => ({
            id: b.passenger_id,
            name:
              b.passenger?.full_name ||
              [b.passenger?.first_name, b.passenger?.last_name].filter(Boolean).join(' ').trim() ||
              'Passenger',
            avatar: b.passenger?.avatar_url,
          }));
        setPassengerPeers(peers);
        const preselected = initialPeerId ? peers.find((p) => p.id === initialPeerId) : undefined;
        setPeer(preselected || (peers.length === 1 ? peers[0] : null));
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [rideId, user?.id, initialPeerId]);

  // Load the thread + subscribe to live updates once a peer is chosen.
  useEffect(() => {
    if (!user?.id || !peer) return;
    let active = true;

    (async () => {
      const result = await rideChatService.getThread(rideId, user.id, peer.id);
      if (!active) return;
      if (result.success) setMessages(result.messages || []);
      void rideChatService.markThreadRead(rideId, user.id, peer.id);
    })();

    const unsubscribe = rideChatService.subscribe(rideId, (message) => {
      const belongsToThread =
        (message.senderId === user.id && message.receiverId === peer.id) ||
        (message.senderId === peer.id && message.receiverId === user.id);
      if (!belongsToThread) return;
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      if (message.receiverId === user.id) void rideChatService.markThreadRead(rideId, user.id, peer.id);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [rideId, user?.id, peer]);

  // Keep the view pinned to the latest message.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!user?.id || !peer || !draft.trim() || sending) return;
    setSending(true);
    setError(null);
    const content = draft.trim();
    setDraft('');
    const result = await rideChatService.sendMessage(rideId, user.id, peer.id, content);
    if (!result.success) {
      setError(result.error || 'Message failed to send');
      setDraft(content);
    } else if (result.message) {
      setMessages((prev) => (prev.some((m) => m.id === result.message!.id) ? prev : [...prev, result.message!]));
    }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl rounded-[18px] border border-black/5 bg-white p-4 text-center shadow-soft">
        <p className="text-sm font-medium text-ink/50">Loading chat…</p>
      </div>
    );
  }

  if (error && !ride) {
    return (
      <div className="mx-auto max-w-2xl rounded-[18px] border border-black/5 bg-white p-4 text-center shadow-soft">
        <h2 className="font-display text-xl font-extrabold text-ink">Chat unavailable</h2>
        <p className="mt-2 text-sm font-medium text-ink/50">{error}</p>
        <button onClick={() => history.push('/inbox')} className="mt-4 rounded-full px-4 py-2 text-sm font-bold text-white" style={{ background: FIRE }}>
          Back to Inbox
        </button>
      </div>
    );
  }

  // Driver with several passengers and none chosen yet → pick one.
  if (isDriver && !peer) {
    return (
      <div className="mx-auto max-w-2xl">
        <button onClick={() => history.push('/inbox')} className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-ink/60">
          <ArrowLeft className="h-4 w-4" /> Inbox
        </button>
        <h2 className="mb-3 font-display text-xl font-extrabold text-ink">Choose a passenger</h2>
        {passengerPeers.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-primary-200 bg-paper p-4 text-center text-sm font-medium text-ink/50">
            No passengers have joined this ride yet. You can chat here once someone books.
          </div>
        ) : (
          <div className="space-y-2">
            {passengerPeers.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeer(p)}
                className="flex w-full items-center gap-3 rounded-[18px] border border-black/5 bg-white p-3 text-left shadow-soft"
              >
                <img
                  src={p.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random`}
                  alt={p.name}
                  className="h-10 w-10 rounded-xl object-cover"
                />
                <span className="font-display text-sm font-bold text-ink">{p.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3">
        <button onClick={() => history.push('/inbox')} className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-soft">
          <ArrowLeft className="h-5 w-5 text-ink" />
        </button>
        <img
          src={peer?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(peer?.name || 'Chat')}&background=random`}
          alt={peer?.name}
          className="h-10 w-10 rounded-xl object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-bold text-ink">{peer?.name}</p>
          <p className="truncate text-xs font-medium text-ink/50">
            {ride?.startLocation?.split(',')[0]} → {ride?.endLocation?.split(',')[0]}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto rounded-[14px] border border-black/5 bg-white/70 p-3">
        {messages.length === 0 ? (
          <div className="flex h-full min-h-[160px] items-center justify-center text-center">
            <p className="text-sm font-medium text-ink/40">
              No messages yet. Say hello to {peer?.name?.split(' ')[0] || 'them'}.
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const mine = message.senderId === user?.id;
            return (
              <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm font-medium ${
                    mine ? 'text-white shadow-glow' : 'border border-black/5 bg-white text-ink'
                  }`}
                  style={mine ? { background: FIRE } : undefined}
                >
                  {message.content}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      {canSend ? (
        <div className="pt-3">
          {error && <p className="mb-2 text-xs font-semibold text-fire-red">{error}</p>}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder="Type a message…"
              maxLength={1000}
              className="flex-1 rounded-full border-2 border-black/10 px-4 py-2.5 text-sm font-medium focus:border-fire-orange focus:outline-none"
            />
            <button
              onClick={handleSend}
              disabled={sending || !draft.trim()}
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-white shadow-glow disabled:opacity-50"
              style={{ background: FIRE }}
              aria-label="Send message"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="pt-3">
          <div className="rounded-[18px] border border-dashed border-primary-200 bg-paper p-4 text-center text-xs font-semibold text-ink/50">
            This ride has ended, so the chat is now read-only.
          </div>
        </div>
      )}
    </div>
  );
};

const InboxPage = () => {
  const location = useLocation<InboxLocationState>();
  const rideId = location.state?.rideId;
  const peerId = location.state?.peerId;

  return (
    <div className="app-scroll-screen app-bottom-nav-safe relative overflow-hidden bg-white">
      {/* Grainy orange aura, right-weighted */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[320px]">
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(120% 72% at 82% -10%, rgba(255,107,0,0.4) 0%, rgba(255,160,30,0.15) 46%, rgba(255,255,255,0) 74%)' }}
        />
      </div>

      <div className="relative z-10 flex h-full flex-col px-4 pb-6 pt-[calc(env(safe-area-inset-top)+12px)]">
        {rideId ? <ChatThread rideId={rideId} initialPeerId={peerId} /> : <ConversationList />}
      </div>
    </div>
  );
};

export default InboxPage;
