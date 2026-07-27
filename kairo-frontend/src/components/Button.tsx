import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  isLoading?: boolean;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  isLoading = false,
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`button button-${variant} button-${size} ${className}`.trim()}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <span className="button-spinner" aria-hidden="true" /> : icon}
      <span>{children}</span>
    </button>
  );
}
