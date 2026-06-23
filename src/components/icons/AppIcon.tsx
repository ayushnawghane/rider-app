import React from 'react';

export type AppIconName =
  | 'search' | 'map-pin' | 'clock' | 'users' | 'car' | 'award' | 'swap'
  | 'phone' | 'message' | 'map' | 'star' | 'plus' | 'house' | 'inbox'
  | 'route' | 'user' | 'bell' | 'zap';

interface AppIconProps {
  name: AppIconName;
  className?: string;
  alt?: string;
}

/**
 * Custom Blinkcar icon (fire-gradient PNG from public/icons/). Drop-in for the
 * old lucide glyphs on light surfaces. Sized via className (e.g. "h-5 w-5").
 */
const AppIcon: React.FC<AppIconProps> = ({ name, className = 'h-6 w-6', alt = '' }) => (
  <img
    src={`/icons/${name}.png`}
    alt={alt}
    aria-hidden={alt ? undefined : true}
    draggable={false}
    className={`${className} object-contain`}
  />
);

export default AppIcon;
