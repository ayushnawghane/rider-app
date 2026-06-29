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
      className="app-bottom-nav pointer-events-none px-4 pb-3"
      aria-label="Primary navigation"
    >
      <div
        className="pointer-events-auto mx-auto flex max-w-md items-center justify-between gap-1 rounded-[30px] border border-fire-orange/15 bg-white/95 p-2.5 shadow-[0_18px_55px_rgba(24,24,27,0.18),0_0_0_1px_rgba(255,255,255,0.65)_inset] backdrop-blur-2xl"
        style={{
          background:
            'linear-gradient(135deg, rgba(255,255,255,0.97), rgba(255,247,237,0.94))',
        }}
      >
        {navItems.map(({ key, label, path, Icon, matches }) => {
          const isActive = matches(location.pathname);

          return (
            <button
              key={key}
              type="button"
              onClick={() => handleNavigate(path)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={label}
              className={`grain ${isActive ? 'grain-strong' : 'grain-soft'} relative flex items-center justify-center gap-2 overflow-hidden rounded-[18px] py-2.5 transition-all duration-300 active:scale-95 ${
                isActive ? 'px-4 text-white shadow-glow' : 'px-3 text-ink/40 hover:text-ink/70'
              }`}
              style={isActive ? { background: FIRE } : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={2.5} />
              {isActive && (
                <span className="font-display text-sm font-bold tracking-tight">{label}</span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
