import React from 'react';

interface AppCardProps {
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article';
}

const AppCard: React.FC<AppCardProps> = ({ children, className = '', as: Component = 'div' }) => {
  return (
    <Component className={`rounded-2xl bg-white shadow-lg ${className}`}>
      {children}
    </Component>
  );
};

export default AppCard;
