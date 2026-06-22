import { useHistory, useLocation } from 'react-router';
import { Award, Car, House, Inbox, Route } from 'lucide-react';

type NavItem = {
  key: string;
  label: string;
  path: string;
  Icon: typeof House;
  matches: (pathname: string) => boolean;
};

const navItems: NavItem[] = [
  {
    key: 'home',
    label: 'Home',
    path: '/home',
    Icon: House,
    matches: (pathname) =>
      pathname === '/home' ||
      pathname.startsWith('/notifications') ||
      pathname.startsWith('/safety') ||
      pathname.startsWith('/select-location'),
  },
  {
    key: 'publish',
    label: 'Publish',
    path: '/publish-ride',
    Icon: Car,
    matches: (pathname) =>
      pathname === '/publish-ride' ||
      pathname === '/upload-ride' ||
      pathname.startsWith('/rides/edit') ||
      pathname.startsWith('/rides/active'),
  },
  {
    key: 'rides',
    label: 'Your Rides',
    path: '/rides',
    Icon: Route,
    matches: (pathname) =>
      pathname === '/rides' ||
      pathname.startsWith('/rides/history') ||
      pathname.startsWith('/rides/detail') ||
      pathname.startsWith('/trips/tracking'),
  },
  {
    key: 'inbox',
    label: 'Inbox',
    path: '/inbox',
    Icon: Inbox,
    matches: (pathname) =>
      pathname === '/inbox' ||
      pathname.startsWith('/support') ||
      pathname.startsWith('/messages'),
  },
  {
    key: 'rewards',
    label: 'Rewards',
    path: '/rewards',
    Icon: Award,
    matches: (pathname) => pathname === '/rewards',
  },
];

const MobileBottomNav = () => {
  const history = useHistory();
  const location = useLocation();

  const handleNavigate = (path: string) => {
    if (location.pathname === path) {
      return;
    }

    history.replace(path);
  };

  return (
    <nav
      className="app-bottom-nav border-t border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85"
      aria-label="Primary navigation"
    >
      <div className="mx-auto flex max-w-2xl items-center justify-around px-2 py-2">
        {navItems.map(({ key, label, path, Icon, matches }) => {
          const isActive = matches(location.pathname);

          return (
            <button
              key={key}
              type="button"
              onClick={() => handleNavigate(path)}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2.5 text-xs font-semibold transition ${
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'text-primary-600' : 'text-slate-400'}`} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
