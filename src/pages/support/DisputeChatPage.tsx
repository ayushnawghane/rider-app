import { IonContent, IonPage } from '@ionic/react';
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { messageService } from '../../services';
import { ArrowLeft, Send, User, MessageCircle, Clock } from 'lucide-react';
import type { Message } from '../../types';

const DisputeChatPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    const result = await messageService.getMessages(id);
    if (result.success && result.messages) {
      setMessages(result.messages);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();

    const unsubscribe = messageService.subscribeToMessages(id, (newMessages: Message[]) => {
      setMessages((prev) => [...prev, ...newMessages]);
    });

    return () => {
      unsubscribe();
    };
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user) return;

    setSending(true);

    const result = await messageService.sendMessage({
      disputeId: id,
      userId: user.id,
      content: newMessage,
      isFromUser: true,
    });

    if (result.success && result.message) {
      setMessages((prev) => [...prev, result.message!]);
      setNewMessage('');
    }

    setSending(false);
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
      <IonContent className="ion-padding bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-6 h-screen flex flex-col">
          <header className="mb-6 flex-shrink-0">
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
          </header>

          <div className="flex-1 overflow-y-auto pb-24">
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

          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex-shrink-0 shadow-medium">
            <div className="max-w-3xl mx-auto flex gap-3">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="input flex-1"
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
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
