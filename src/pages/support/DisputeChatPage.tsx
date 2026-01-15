import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonIcon, IonList, IonItem, IonLabel, IonBadge, IonCard, IonCardContent, IonLoading, IonInput, IonTextarea } from '@ionic/react';
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { messageService } from '../../services';
import { sendOutline, chevronBackOutline, personOutline } from 'ionicons/icons';
import type { Message } from '../../types';

const DisputeChatPage: React.FC = () => {
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
    return <IonLoading isOpen message="Loading chat..." />;
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButton slot="start" fill="clear" onClick={() => window.history.back()}>
            <IonIcon icon={chevronBackOutline} />
          </IonButton>
          <IonTitle>Support Chat</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div style={{ padding: '16px' }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#666' }}>
              <p>No messages yet. Start a conversation with our support team.</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                style={{
                  display: 'flex',
                  justifyContent: message.isFromUser ? 'flex-end' : 'flex-start',
                  marginBottom: '12px',
                }}
              >
                <div
                  style={{
                    maxWidth: '70%',
                    padding: '12px 16px',
                    borderRadius: '16px',
                    backgroundColor: message.isFromUser ? 'var(--ion-color-primary)' : '#f0f0f0',
                    color: message.isFromUser ? 'white' : 'black',
                  }}
                >
                  <p>{message.content}</p>
                  <small style={{ opacity: 0.7, fontSize: '11px' }}>
                    {formatTime(message.createdAt)}
                  </small>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '8px 16px',
            background: 'white',
            borderTop: '1px solid #eee',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <IonInput
            value={newMessage}
            onIonChange={(e) => setNewMessage((e.detail.value as string) || '')}
            placeholder="Type a message..."
            style={{ flex: 1 }}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          />
          <IonButton
            fill="solid"
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
          >
            <IonIcon icon={sendOutline} />
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default DisputeChatPage;
