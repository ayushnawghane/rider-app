import { AlertCircle, ChevronRight } from 'lucide-react';
import { useHistory, useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { getProfileCompletion } from '../../utils/profileCompletion';

const ProfileCompletionBanner = () => {
  const { user } = useAuth();
  const history = useHistory();
  const location = useLocation();
  const completion = getProfileCompletion(user);

  if (!user || completion.complete) {
    return null;
  }

  if (
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname.startsWith('/profile')
  ) {
    return null;
  }

  const firstMissing = completion.missing[0];

  return (
    <button
      type="button"
      onClick={() => history.push('/profile', { openEditor: true, requireCompletion: true })}
      className="fixed left-3 right-3 top-[calc(env(safe-area-inset-top)+10px)] z-50 mx-auto flex max-w-2xl items-center gap-3 rounded-2xl border border-orange-200 bg-white px-4 py-3 text-left shadow-lg shadow-orange-950/10"
    >
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-100 text-orange-700">
        <AlertCircle size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-900">
          Complete your profile
          <span className="ml-2 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
            {completion.percent}%
          </span>
        </p>
        <p className="truncate text-xs text-slate-500">
          {firstMissing ? `${firstMissing} missing` : 'Finish remaining details'}
        </p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
    </button>
  );
};

export default ProfileCompletionBanner;
