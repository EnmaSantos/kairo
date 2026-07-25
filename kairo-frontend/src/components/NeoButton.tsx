import anime from 'animejs'; // Import default from anime.js v3
import './NeoButton.css'; // We will create this CSS file next
import type {
  ButtonHTMLAttributes,
  CSSProperties,
  MouseEvent,
  ReactNode,
} from 'react';

interface NeoButtonProps {
  text: ReactNode;
  color?: string;
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>['onClick'];
  type?: ButtonHTMLAttributes<HTMLButtonElement>['type'];
  style?: CSSProperties;
  className?: string;
  disabled?: boolean;
}

export function NeoButton({
  text,
  color = '#FFD600',
  onClick,
  type = 'button',
  style,
  className = '',
  disabled = false,
}: NeoButtonProps) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>): void => {
    // Simple click animation using anime.js v3
    anime({
      targets: event.currentTarget,
      top: ['0px', '4px'],
      left: ['0px', '4px'],
      boxShadow: ['4px 4px 0px 0px #000', '0px 0px 0px 0px #000'],
      duration: 100,
      easing: 'easeInOutQuad', // v3 syntax
      direction: 'alternate', // v3 syntax
    });

    // If there's an onClick prop, call it
    onClick?.(event);
  };

  return (
    <button
      className={`neo-button ${className}`}
      style={{ backgroundColor: color, ...style }}
      onClick={handleClick}
      type={type}
      disabled={disabled}
    >
      {text}
    </button>
  );
}
