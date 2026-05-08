import React from 'react';

interface StatusBadgeProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  tone?: 'active' | 'pending' | 'completed' | 'cancelled' | 'danger' | 'neutral' | 'success' | 'warning';
  className?: string;
}

const toneClasses: Record<NonNullable<StatusBadgeProps['tone']>, string> = {
  active: 'bg-green-50 text-green-700 border-green-100',
  pending: 'bg-amber-50 text-amber-700 border-amber-100',
  completed: 'bg-orange-50 text-orange-700 border-orange-100',
  cancelled: 'bg-red-50 text-red-700 border-red-100',
  danger: 'bg-red-50 text-red-700 border-red-100',
  neutral: 'bg-gray-50 text-gray-700 border-gray-100',
  success: 'bg-green-50 text-green-700 border-green-100',
  warning: 'bg-amber-50 text-amber-700 border-amber-100',
};

const StatusBadge: React.FC<StatusBadgeProps> = ({
  children,
  icon,
  tone = 'neutral',
  className = '',
}) => {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${toneClasses[tone]} ${className}`}>
      {icon}
      {children}
    </span>
  );
};

export default StatusBadge;
