import React from 'react';

interface HotbarProps {
  selectedSlot: number;
  onSelectSlot: (slot: number) => void;
}

export const Hotbar: React.FC<HotbarProps> = ({ selectedSlot, onSelectSlot }) => {
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
      position: 'relative',
    };
  };

  const renderGunIcon = () => (
    <svg width="28" height="28" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="6" width="9" height="4" fill="#e0e6ed" />
      <rect x="5" y="7" width="3" height="2" fill="#69f0ae" />
      <rect x="3" y="10" width="3" height="3" fill="#263238" />
      <rect x="11" y="5" width="3" height="1" fill="#78909c" />
      <rect x="11" y="10" width="3" height="1" fill="#78909c" />
      <rect x="10" y="7" width="2" height="2" fill="#37474f" />
    </svg>
  );

  return (
    <div style={containerStyle}>
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <div
          key={index}
          style={slotStyle(index)}
          onTouchStart={(e) => {
            e.stopPropagation();
            onSelectSlot(index);
          }}
          onClick={() => onSelectSlot(index)}
        >
          {index === 0 && renderGunIcon()}
        </div>
      ))}
    </div>
  );
};
