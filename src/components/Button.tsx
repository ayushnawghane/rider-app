import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  expand?: 'full' | 'block';
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  style?: React.CSSProperties;
  icon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'md',
  expand,
  type = 'button',
  className = '',
  style,
  icon,
}) => {
  const baseStyles = 'font-medium transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantStyles = {
    primary: 'bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 shadow-medium',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300',
    danger: 'bg-danger-500 text-white hover:bg-danger-600 active:bg-danger-700 shadow-medium',
    outline: 'border-2 border-primary-500 text-primary-500 hover:bg-primary-50 active:bg-primary-100 bg-transparent',
    ghost: 'text-primary-500 hover:bg-primary-50 active:bg-primary-100 bg-transparent',
  };

  const sizeStyles = {
    sm: 'px-4 py-2 rounded-lg text-sm',
    md: 'px-6 py-3 rounded-xl text-base',
    lg: 'px-8 py-4 rounded-xl text-lg font-semibold',
  };

  const expandStyles = {
    full: 'w-full',
    block: 'w-full',
  };

  const classes = [
    baseStyles,
    variantStyles[variant],
    sizeStyles[size],
    expand ? expandStyles[expand] : '',
    className,
  ].join(' ');

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={classes}
      style={style}
    >
      {loading && (
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
      )}
      {!loading && icon}
      {children}
    </button>
  );
};

export default Button;