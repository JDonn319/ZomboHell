import React, { useState } from 'react';

export const MainMenuScreen: React.FC = () => {
  const [isMuted, setIsMuted] = useState(false);

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: '#050704',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  };

  const topBarRightStyle: React.CSSProperties = {
    position: 'absolute',
    top: '20px',
    right: '24px',
    display: 'flex',
    gap: '10px',
    zIndex: 10,
  };

  const iconSquareButtonStyle: React.CSSProperties = {
    width: '42px',
    height: '36px',
    backgroundColor: 'rgba(10, 18, 8, 0.7)',
    border: '1px solid #33531e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#8bc34a',
    fontSize: '18px',
    letterSpacing: '0.1em',
  };

  const logoStyle: React.CSSProperties = {
    width: 'min(380px, 46vw)',
    maxHeight: '160px',
    objectFit: 'contain',
    marginBottom: '26px',
    filter: 'drop-shadow(0 0 35px rgba(92, 148, 52, 0.4))',
  };

  const buttonListStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    width: 'min(520px, 66vw)',
  };

  const primaryButtonStyle: React.CSSProperties = {
    height: '46px',
    border: '1px solid #689f38',
    backgroundColor: '#2e4a19',
    backgroundImage: `
      repeating-linear-gradient(
        to bottom,
        rgba(255, 255, 255, 0.12) 0px,
        rgba(255, 255, 255, 0.12) 2px,
        transparent 2px,
        transparent 4px
      ),
      linear-gradient(180deg, #3f6623 0%, #1f3311 100%)
    `,
    color: '#ffffff',
    fontSize: '24px',
    letterSpacing: '0.25em',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  };

  const secondaryButtonStyle: React.CSSProperties = {
    height: '46px',
    border: '1px solid #283e17',
    backgroundColor: 'rgba(10, 18, 8, 0.75)',
    backgroundImage: `
      repeating-linear-gradient(
        to bottom,
        rgba(255, 255, 255, 0.04) 0px,
        rgba(255, 255, 255, 0.04) 2px,
        transparent 2px,
        transparent 4px
      )
    `,
    color: '#558231',
    fontSize: '24px',
    letterSpacing: '0.25em',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  };

  const versionStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '16px',
    right: '24px',
    color: '#2d471b',
    fontSize: '16px',
    letterSpacing: '0.2em',
  };

  const dustStyle = (top: string, left: string, size: string, opacity: number): React.CSSProperties => ({
    position: 'absolute',
    top,
    left,
    width: size,
    height: size,
    borderRadius: '50%',
    backgroundColor: '#8bc34a',
    opacity,
    pointerEvents: 'none',
  });

  return (
    <div style={containerStyle}>
      <div style={dustStyle('18%', '14%', '3px', 0.25)} />
      <div style={dustStyle('72%', '10%', '2px', 0.2)} />
      <div style={dustStyle('30%', '82%', '3px', 0.3)} />
      <div style={dustStyle('68%', '88%', '2px', 0.15)} />

      <div style={topBarRightStyle}>
        <div style={iconSquareButtonStyle}>RU</div>
        <div style={iconSquareButtonStyle} onClick={() => setIsMuted(!isMuted)}>
          {isMuted ? '✕' : '🔊'}
        </div>
      </div>

      <img src="/gamelogo.png" alt="7Days-ZDays Logo" style={logoStyle} />

      <div style={buttonListStyle}>
        <div style={primaryButtonStyle}>ИГРАТЬ</div>
        <div style={secondaryButtonStyle}>СКЛАД</div>
        <div style={secondaryButtonStyle}>ЛИДЕРЫ</div>
      </div>

      <div style={versionStyle}>ALPHA v0.1.0</div>
    </div>
  );
};
