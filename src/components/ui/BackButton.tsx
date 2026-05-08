import React from 'react';
import { useHistory } from 'react-router';
import { ArrowLeft, ChevronLeft } from 'lucide-react';

type BackButtonVariant = 'light' | 'dark' | 'text' | 'icon';

interface BackButtonProps {
  onClick?: () => void;
  fallbackPath?: string;
  label?: string;
  variant?: BackButtonVariant;
  className?: string;
  icon?: 'arrow' | 'chevron';
  'aria-label'?: string;
}

const variantClasses: Record<BackButtonVariant, string> = {
  light: 'h-10 w-10 rounded-xl bg-white/20 text-white backdrop-blur-sm hover:bg-white/30',
  dark: 'h-10 w-10 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200',
  text: 'gap-2 text-gray-600 hover:text-gray-900',
  icon: 'h-10 w-10 rounded-full text-gray-700 hover:bg-gray-100',
};

const BackButton: React.FC<BackButtonProps> = ({
  onClick,
  fallbackPath = '/home',
  label,
  variant = 'text',
  className = '',
  icon = 'arrow',
  'aria-label': ariaLabel,
}) => {
  const history = useHistory();
  const Icon = icon === 'chevron' ? ChevronLeft : ArrowLeft;

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }

    if (history.length > 1) {
      history.goBack();
      return;
    }

    history.replace(fallbackPath);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center justify-center transition-colors active:scale-95 ${variantClasses[variant]} ${className}`}
      aria-label={ariaLabel || label || 'Go back'}
    >
      <Icon className={variant === 'text' ? 'h-5 w-5' : 'h-6 w-6'} />
      {label && <span>{label}</span>}
    </button>
  );
};

export default BackButton;
