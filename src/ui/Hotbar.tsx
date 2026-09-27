import React, { useState } from 'react';

export const Hotbar: React.FC = () => {
  const [selectedSlot, setSelectedSlot] = useState(0);

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '12px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '6px',
    backgroundColor: 'rgba(12, 16, 10, 0.75)',
    padding: '6px',
    borderRadius: '4px',
    border: '2px solid #2c421b',
    zIndex: 50,
    pointerEvents: 'auto',
  };

  const slotStyle = (index: number): React.CSSProperties => {
    const isSelected = selectedSlot === index;
    return {
      width: '42px',
      height: '42px',
      backgroundColor: isSelected ? 'rgba(85, 140, 40, 0.35)' : 'rgba(0, 0, 0, 0.5)',
      border: isSelected ? '2px solid #7cb342' : '2px solid #3d5427',
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
          onClick={() => setSelectedSlot(index)}
        />
      ))}
    </div>
  );
};
