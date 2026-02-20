import { IonContent, IonPage } from '@ionic/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useHistory, useParams } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { messageService } from '../../services';
import { ArrowLeft, Send, User, MessageCircle, Clock } from 'lucide-react';
import type { Message } from '../../types';

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
        <IonContent className="ion-padding bg-gray-50">
          <div className="max-w-3xl mx-auto px-4 py-6">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex-shrink-0" />
                  <div className="h-16 bg-gray-200 rounded-2xl flex-1 max-w-xs" />
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
      <IonContent className="ion-padding bg-gray-50" fullscreen>
        <div className="max-w-3xl mx-auto px-4 py-6 min-h-full flex flex-col">
          <header className="mb-4 flex-shrink-0">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
          </header>

          {error && (
            <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex-1 overflow-y-auto pb-4">
            {messages.length === 0 ? (
              <div className="empty-state">
                <MessageCircle className="empty-icon" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Messages Yet</h3>
                <p className="empty-text">Start a conversation with our support team</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.isFromUser ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                      ${message.isFromUser ? 'bg-primary-500' : 'bg-gray-300'}
                    `}>
                      {message.isFromUser ? (
                        <User className="w-4 h-4 text-white" />
                      ) : (
                        <MessageCircle className="w-4 h-4 text-gray-600" />
                      )}
                    </div>
                    <div className={`max-w-[70%] px-4 py-3 rounded-2xl
                      ${message.isFromUser
                        ? 'bg-primary-500 text-white rounded-tr-sm'
                        : 'bg-white text-gray-900 border border-gray-200 rounded-tl-sm'
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      <div className={`flex items-center gap-1.5 mt-2 text-xs
                        ${message.isFromUser ? 'text-primary-100' : 'text-gray-500'}
                      `}>
                        <Clock className="w-3 h-3" />
                        {formatTime(message.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="sticky bottom-0 mt-2 rounded-t-2xl border border-gray-200 bg-white p-3 shadow-medium">
            <div className="flex gap-3">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="input flex-1"
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
                className="p-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default DisputeChatPage;
