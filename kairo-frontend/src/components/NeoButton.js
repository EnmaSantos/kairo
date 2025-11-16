import React from 'react';
import { animate } from 'animejs'; // Import animate from anime.js v4
import './NeoButton.css'; // We will create this CSS file next

const NeoButton = ({ text, color = '#FFD600', onClick, type = 'button' }) => {
  const handleClick = (e) => {
    // Simple click animation using anime.js v4
    animate(e.currentTarget, {
      top: ['0px', '4px'],
      left: ['0px', '4px'],
      boxShadow: ['4px 4px 0px 0px #000', '0px 0px 0px 0px #000'],
      duration: 100,
      ease: 'inOut(2)', // v4 uses 'ease' instead of 'easing'
      alternate: true, // v4 uses boolean instead of 'direction'
    });
    
    // If there's an onClick prop, call it
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button 
      className="neo-button" 
      style={{ backgroundColor: color }}
      onClick={handleClick}
      type={type}
    >
      {text}
    </button>
  );
}

export default NeoButton;

