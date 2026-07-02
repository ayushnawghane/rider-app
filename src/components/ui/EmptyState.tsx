import React from 'react';
import AppCard from './AppCard';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  message?: string;
  action?: React.ReactNode;
  className?: string;
  card?: boolean;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  message,
  action,
  className = '',
  card = true,
}) => {
  const content = (
    <div className={`text-center ${className}`}>
      {icon && <div className="mx-auto mb-4 flex justify-center text-gray-300">{icon}</div>}
      <h2 className="mb-2 text-xl font-bold text-gray-900">{title}</h2>
      {message && <p className="mb-6 text-gray-500">{message}</p>}
      {action}
    </div>
  );

  if (!card) return content;

  return <AppCard className="p-5">{content}</AppCard>;
};

export default EmptyState;
