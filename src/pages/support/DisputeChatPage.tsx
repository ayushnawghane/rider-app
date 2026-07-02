import { IonContent, IonPage } from '@ionic/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useHistory, useParams } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { messageService } from '../../services';
import { Send, User, Headset, Clock, ChevronLeft } from 'lucide-react';
import AppIcon from '../../components/icons/AppIcon';
import type { Message } from '../../types';

const FIRE = 'linear-gradient(100deg, var(--fire-red), var(--fire-amber))';

const DisputeChatPage = () => {
  const { id } = useParams<{ id: string }>();
  const history = useHistory();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const upsertAndSortMessages = useCallback((previous: Message[], incoming: Message[]) => {
    const byId = new Map<string, Message>();
    previous.forEach((message) => byId.set(message.id, message));
    incoming.forEach((message) => byId.set(message.id, message));
    return Array.from(byId.values()).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }, []);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await messageService.getMessages(id);
      if (result.success) {
        setMessages(result.messages || []);
      } else {
        setError(result.error || 'Failed to load messages');
      }
    } catch {
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchMessages();
    let active = true;

    const unsubscribe = messageService.subscribeToMessages(id, (newMessages: Message[]) => {
      if (!active) return;
      setMessages((prev) => upsertAndSortMessages(prev, newMessages));
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [fetchMessages, id, upsertAndSortMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleBack = () => {
    if (history.length > 1) {
      history.goBack();
      return;
    }
    history.replace('/support');
  };

  const handleSend = async () => {
    const trimmedMessage = newMessage.trim();
    if (!trimmedMessage || !user || sending) return;

    setSending(true);
    setError(null);

    try {
      const result = await messageService.sendMessage({
        disputeId: id,
        userId: user.id,
        content: trimmedMessage,
        isFromUser: true,
      });

      const createdMessage = result.message;
      if (result.success && createdMessage) {
        setMessages((prev) => upsertAndSortMessages(prev, [createdMessage]));
        setNewMessage('');
      } else {
        setError(result.error || 'Failed to send message');
      }
    } catch {
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <IonPage>
        <IonContent>
          <div className="app-top-safe min-h-full bg-white">
            <div className="mx-auto max-w-3xl px-4 pb-6 pt-5">
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`flex animate-pulse gap-3 ${i === 2 ? 'flex-row-reverse' : ''}`}>
                    <div className="h-8 w-8 shrink-0 rounded-full bg-primary-50" />
                    <div className="h-16 max-w-xs flex-1 rounded-2xl bg-primary-50" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonContent fullscreen>
        <div className="app-top-safe relative flex min-h-full flex-col overflow-hidden bg-white">
          {/* Grainy orange aura */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[220px]">
            <div
              className="absolute inset-0"
              style={{ background: 'radial-gradient(120% 80% at 82% -20%, rgba(255,107,0,0.36) 0%, rgba(255,160,30,0.14) 46%, rgba(255,255,255,0) 74%)' }}
            />
            <div className="absolute -right-16 -top-12 h-64 w-64 rounded-full animate-aurora-1" style={{ background: 'radial-gradient(circle, rgba(255,200,50,0.58) 0%, transparent 62%)', filter: 'blur(48px)' }} />
          </div>

          <div className="relative z-10 mx-auto flex min-h-full w-full max-w-3xl flex-1 flex-col px-4 pb-6 pt-5">
            <header className="mb-4 flex shrink-0 items-center gap-3">
              <button
                onClick={handleBack}
                aria-label="Back"
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-black/10 bg-white/70 text-ink shadow-soft backdrop-blur-sm transition active:scale-95"
              >
                <ChevronLeft size={22} strokeWidth={2.5} />
              </button>
              <div>
                <p className="mb-0.5 font-display text-xs font-bold uppercase tracking-[0.2em] text-fire-orange">Support chat</p>
                <h1 className="font-display text-xl font-extrabold tracking-tight text-ink">Dispute #{id.slice(0, 8)}</h1>
              </div>
            </header>

            {error && (
              <div className="mb-3 rounded-2xl border border-fire-red/20 bg-fire-red/5 p-3 text-sm font-medium text-fire-red">
                {error}
              </div>
            )}

            <div className="flex-1 overflow-y-auto pb-4">
              {messages.length === 0 ? (
                <div className="mt-3 rounded-[18px] border border-black/5 bg-white p-4 text-center shadow-soft">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-primary-100 bg-gradient-to-br from-primary-50 to-white shadow-soft">
                    <AppIcon name="message" className="h-11 w-11" />
                  </div>
                  <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight text-ink">No messages yet</h2>
                  <p className="mt-2 text-sm font-medium text-ink/50">Start a conversation with our support team.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-2.5 ${message.isFromUser ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white"
                        style={message.isFromUser ? { background: FIRE } : { background: 'var(--ink)' }}
                      >
                        {message.isFromUser ? <User className="h-4 w-4" /> : <Headset className="h-4 w-4" />}
                      </div>
                      <div
                        className={`max-w-[72%] rounded-2xl px-4 py-3 ${
                          message.isFromUser
                            ? 'rounded-tr-sm text-white shadow-glow'
                            : 'rounded-tl-sm border border-black/5 bg-white text-ink shadow-soft'
                        }`}
                        style={message.isFromUser ? { background: FIRE } : undefined}
                      >
                        <p className="text-sm font-medium leading-relaxed">{message.content}</p>
                        <div className={`mt-2 flex items-center gap-1.5 text-xs ${message.isFromUser ? 'text-white/80' : 'text-ink/40'}`}>
                          <Clock className="h-3 w-3" />
                          {formatTime(message.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="sticky bottom-0 mt-2 rounded-[14px] border border-black/5 bg-white/90 p-2.5 shadow-strong backdrop-blur-md">
              <div className="flex gap-2.5">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 rounded-2xl border border-black/10 bg-paper px-4 py-3 font-medium text-ink outline-none transition focus:border-fire-orange"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void handleSend();
                    }
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!newMessage.trim() || sending}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-glow transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ background: FIRE }}
                  aria-label="Send message"
                >
                  <Send className="h-5 w-5" strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default DisputeChatPage;
