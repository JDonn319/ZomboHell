import React, { useState } from 'react';
import { Volume2, VolumeX, Globe } from 'lucide-react';

interface MainMenuScreenProps {
  onPlay: () => void;
  onOpenSandbox: () => void;
}

export const MainMenuScreen: React.FC<MainMenuScreenProps> = ({ onPlay, onOpenSandbox }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [activeButton, setActiveButton] = useState<'play' | 'sandbox' | 'leaders'>('play');

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
    top: '18px',
    right: '22px',
    display: 'flex',
    gap: '8px',
    zIndex: 10,
  };

  const iconSquareButtonStyle: React.CSSProperties = {
    minWidth: '40px',
    height: '34px',
    padding: '0 8px',
    backgroundColor: 'rgba(9, 15, 7, 0.85)',
    border: '1px solid #2d451b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    cursor: 'pointer',
    color: '#7ba849',
    fontSize: '12px',
    fontWeight: 800,
    letterSpacing: '0.1em',
  };

  const logoSectionStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '10px',
  };

  const ambientGlowStyle: React.CSSProperties = {
    position: 'absolute',
    width: '420px',
    height: '200px',
    background: 'radial-gradient(circle, rgba(58, 97, 27, 0.5) 0%, rgba(58, 97, 27, 0) 70%)',
    filter: 'blur(32px)',
    pointerEvents: 'none',
  };

  const logoStyle: React.CSSProperties = {
    width: 'min(370px, 45vw)',
    maxHeight: '145px',
    objectFit: 'contain',
    position: 'relative',
    zIndex: 1,
  };

  const buttonListStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    width: 'min(500px, 64vw)',
    marginTop: '22px',
    position: 'relative',
    zIndex: 2,
  };

  const activeButtonStyle: React.CSSProperties = {
    height: '38px',
    border: '1px solid #6fa839',
    backgroundColor: '#294317',
    backgroundImage: `
      repeating-linear-gradient(
        to bottom,
        rgba(255, 255, 255, 0.12) 0px,
        rgba(255, 255, 255, 0.12) 2px,
        transparent 2px,
        transparent 4px
      ),
      linear-gradient(180deg, #3c6122 0%, #1c2e10 100%)
    `,
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 900,
    letterSpacing: '0.24em',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  };

  const inactiveButtonStyle: React.CSSProperties = {
    height: '38px',
    border: '1px solid #233615',
    backgroundColor: 'rgba(9, 15, 7, 0.8)',
    backgroundImage: `
      repeating-linear-gradient(
        to bottom,
        rgba(255, 255, 255, 0.03) 0px,
        rgba(255, 255, 255, 0.03) 2px,
        transparent 2px,
        transparent 4px
      )
    `,
    color: '#496d2b',
    fontSize: '14px',
    fontWeight: 900,
    letterSpacing: '0.24em',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  };

  const versionStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '14px',
    right: '22px',
    color: '#263b17',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.18em',
  };

  const dustStyle = (top: string, left: string, size: string, opacity: number): React.CSSProperties => ({
    position: 'absolute',
    top,
    left,
    width: size,
    height: size,
    borderRadius: '50%',
    backgroundColor: '#7ba849',
    opacity,
    pointerEvents: 'none',
  });

  return (
    <div style={containerStyle}>
      <div style={dustStyle('15%', '12%', '3px', 0.2)} />
      <div style={dustStyle('74%', '8%', '2px', 0.15)} />
      <div style={dustStyle('28%', '85%', '3px', 0.25)} />
      <div style={dustStyle('65%', '91%', '2px', 0.15)} />

      <div style={topBarRightStyle}>
        <div style={iconSquareButtonStyle}>
          <Globe size={15} strokeWidth={2.2} />
          <span>RU</span>
        </div>
        <div style={iconSquareButtonStyle} onClick={() => setIsMuted(!isMuted)}>
          {isMuted ? <VolumeX size={16} strokeWidth={2.2} /> : <Volume2 size={16} strokeWidth={2.2} />}
        </div>
      </div>

      <div style={logoSectionStyle}>
        <div style={ambientGlowStyle} />
        <img src="/gamelogo.png" alt="ZomboHell Logo" style={logoStyle} />
      </div>

      <div style={buttonListStyle}>
        <div
          style={activeButton === 'play' ? activeButtonStyle : inactiveButtonStyle}
          onClick={() => {
            setActiveButton('play');
            onPlay();
          }}
        >
          ИГРАТЬ
        </div>
        <div
          style={activeButton === 'sandbox' ? activeButtonStyle : inactiveButtonStyle}
          onClick={() => {
            setActiveButton('sandbox');
            onOpenSandbox();
          }}
        >
          ПЕСОЧНИЦА
        </div>
        <div
          style={activeButton === 'leaders' ? activeButtonStyle : inactiveButtonStyle}
          onClick={() => setActiveButton('leaders')}
        >
          ЛИДЕРЫ
        </div>
      </div>

      <div style={versionStyle}>ALPHA v0.1.0</div>
    </div>
  );
};
