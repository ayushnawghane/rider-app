import { useLocation } from 'react-router';
import { MessageCircle } from 'lucide-react';

interface InboxLocationState {
  rideId?: string;
}

const InboxPage = () => {
  const location = useLocation<InboxLocationState>();
  const rideId = location.state?.rideId;

  return (
    <div className="app-scroll-screen app-bottom-nav-safe bg-gray-50 px-4 py-4">
      <div className="mx-auto max-w-2xl">
        <header className="mb-5">
          <h1 className="text-2xl font-bold text-slate-900">Inbox</h1>
          <p className="mt-1 text-sm text-slate-500">Temporary ride messages</p>
        </header>

        {rideId ? (
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-4 inline-flex rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
              Active ride chat
            </div>
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
              <MessageCircle className="mx-auto h-10 w-10 text-primary-500" />
              <h2 className="mt-3 text-lg font-bold text-slate-900">Ride chat workspace</h2>
              <p className="mt-2 text-sm text-slate-500">
                Messages for this ride open here only while the trip is active.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <MessageCircle className="mx-auto h-12 w-12 text-slate-300" />
            <h2 className="mt-4 text-xl font-bold text-slate-900">No active messages</h2>
            <p className="mt-2 text-sm text-slate-500">
              Open a current ride from Your Rides and tap Message to start a temporary chat.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InboxPage;
