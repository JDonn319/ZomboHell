import React from 'react';

export const OrientationLock: React.FC = () => {
  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: '#000000',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '24px',
    zIndex: 9999,
  };

  const textStyle: React.CSSProperties = {
    color: '#ffffff',
    fontSize: '20px',
    letterSpacing: '0.25em',
    textTransform: 'uppercase',
    textAlign: 'center',
    padding: '0 20px',
  };

  const svgStyle: React.CSSProperties = {
    width: '72px',
    height: '72px',
    stroke: '#4a852c',
    animation: 'phoneRotate 2s ease-in-out infinite',
  };

  return (
    <div style={containerStyle}>
      <style>
        {`
          @keyframes phoneRotate {
            0% { transform: rotate(0deg); }
            35% { transform: rotate(-90deg); }
            70% { transform: rotate(-90deg); }
            100% { transform: rotate(0deg); }
          }
        `}
      </style>
      <svg style={svgStyle} viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="3" />
        <line x1="12" y1="18" x2="12" y2="18.01" strokeWidth="2.5" />
      </svg>
      <div style={textStyle}>Пожалуйста, поверните устройство</div>
    </div>
  );
};
