import { useHistory, useLocation } from 'react-router';
import { Award, Car, House, Inbox, Route } from 'lucide-react';

type NavItem = {
  key: string;
  label: string;
  path: string;
  Icon: typeof House;
  matches: (pathname: string) => boolean;
};

const FIRE = 'linear-gradient(100deg, var(--fire-red), var(--fire-amber))';

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
    label: 'Rides',
    path: '/rides',
    Icon: Route,
    matches: (pathname) =>
      pathname === '/rides' ||
      pathname.startsWith('/rides/history') ||
      pathname.startsWith('/rides/detail') ||
      pathname.startsWith('/trips/tracking') ||
      // bare-UUID ride detail (/rides/<uuid>) — was previously unmatched
      /^\/rides\/[0-9a-fA-F-]{36}$/.test(pathname),
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
      className="app-bottom-nav pointer-events-none px-3 pb-1"
      aria-label="Primary navigation"
    >
      <div className="pointer-events-auto mx-auto flex max-w-md items-stretch justify-around gap-1 rounded-[20px] border border-black/5 bg-white/90 px-1.5 py-1.5 shadow-strong backdrop-blur-md">
        {navItems.map(({ key, label, path, Icon, matches }) => {
          const isActive = matches(location.pathname);

          return (
            <button
              key={key}
              type="button"
              onClick={() => handleNavigate(path)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={label}
              className="flex flex-1 flex-col items-center gap-1 py-0.5 transition active:scale-95"
            >
              <span
                className={`flex h-9 w-11 items-center justify-center rounded-xl transition-all duration-200 ${
                  isActive ? 'text-white shadow-glow' : 'text-ink/40'
                }`}
                style={isActive ? { background: FIRE } : undefined}
              >
                <Icon className="h-5 w-5" strokeWidth={2.5} />
              </span>
              <span
                className={`font-display text-[10px] font-bold leading-none tracking-tight ${
                  isActive ? 'text-fire-orange' : 'text-ink/40'
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
