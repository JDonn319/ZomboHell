import React, { useState } from 'react';

export const Hotbar: React.FC = () => {
  const [selectedSlot, setSelectedSlot] = useState(0);

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '14px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    zIndex: 50,
    pointerEvents: 'auto',
    backgroundColor: 'rgba(40, 45, 50, 0.35)',
    backdropFilter: 'blur(4px)',
  };

  const slotStyle = (index: number): React.CSSProperties => {
    const isSelected = selectedSlot === index;
    return {
      width: '44px',
      height: '44px',
      backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.3)' : 'rgba(20, 25, 30, 0.45)',
      border: isSelected ? '2px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.35)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      boxSizing: 'border-box',
    };
  };

  return (
    <div style={containerStyle}>
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <div
          key={index}
          style={slotStyle(index)}
          onTouchStart={(e) => {
            e.stopPropagation();
            setSelectedSlot(index);
          }}
          onClick={() => setSelectedSlot(index)}
        />
      ))}
    </div>
  );
};
