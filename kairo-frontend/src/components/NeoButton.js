import React from 'react';
import anime from 'animejs'; // Import default from anime.js v3
import './NeoButton.css'; // We will create this CSS file next

const NeoButton = ({ text, color = '#FFD600', onClick, type = 'button', style = {}, className = '' }) => {
  const handleClick = (e) => {
    // Simple click animation using anime.js v3
    anime({
      targets: e.currentTarget,
      top: ['0px', '4px'],
      left: ['0px', '4px'],
      boxShadow: ['4px 4px 0px 0px #000', '0px 0px 0px 0px #000'],
      duration: 100,
      easing: 'easeInOutQuad', // v3 syntax
      direction: 'alternate', // v3 syntax
    });

    // If there's an onClick prop, call it
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button
      className={`neo-button ${className}`}
      style={{ backgroundColor: color, ...style }}
      onClick={handleClick}
      type={type}
    >
      {text}
    </button>
  );
}

export default NeoButton;

