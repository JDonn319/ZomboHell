import React, { useEffect, useState } from 'react';

interface LoadingScreenProps {
  onLoaded: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onLoaded }) => {
  const [progress, setProgress] = useState(0);

  const statusTexts = [
    'ПОДКЛЮЧЕНИЕ СИСТЕМ НАВЕДЕНИЯ...',
    'КАЛИБРОВКА ДАТЧИКОВ ОКРУЖЕНИЯ...',
    'ЗАГРУЗКА БОЕВЫХ ПРОТОКОЛОВ...',
    'СИНХРОНИЗАЦИЯ С СЕРВЕРОМ...',
  ];

  const currentStatusIndex = Math.min(
    Math.floor((progress / 100) * statusTexts.length),
    statusTexts.length - 1
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(onLoaded, 300);
          return 100;
        }
        return prev + 1;
      });
    }, 30);

    return () => clearInterval(interval);
  }, [onLoaded]);

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: '#000000',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  };

  const logoWrapperStyle: React.CSSProperties = {
    position: 'relative',
    width: 'min(360px, 50vw)',
    height: 'min(180px, 25vw)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '40px',
  };

  const logoBackgroundStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    opacity: 0.15,
    filter: 'grayscale(100%) brightness(50%)',
  };

  const logoFilledContainerStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: '100%',
    height: `${progress}%`,
    overflow: 'hidden',
  };

  const logoFilledStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: '100%',
    height: 'min(180px, 25vw)',
    objectFit: 'contain',
    filter: 'drop-shadow(0 0 15px rgba(92, 148, 52, 0.7))',
  };

  const scanlineStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    bottom: `${progress}%`,
    width: '100%',
    height: '2px',
    backgroundColor: '#7cb342',
    boxShadow: '0 0 12px 2px #7cb342',
    display: progress > 0 && progress < 100 ? 'block' : 'none',
  };

  const statusTextStyle: React.CSSProperties = {
    color: '#689f38',
    fontSize: '18px',
    letterSpacing: '0.25em',
    marginBottom: '14px',
    textTransform: 'uppercase',
  };

  const progressBarTrackStyle: React.CSSProperties = {
    width: 'min(500px, 60vw)',
    height: '3px',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    position: 'relative',
  };

  const progressBarFillStyle: React.CSSProperties = {
    height: '100%',
    width: `${progress}%`,
    backgroundColor: '#689f38',
    boxShadow: '0 0 8px #689f38',
  };

  return (
    <div style={containerStyle}>
      <div style={logoWrapperStyle}>
        <img src="/gamelogo.png" alt="Logo BG" style={logoBackgroundStyle} />
        <div style={logoFilledContainerStyle}>
          <img src="/gamelogo.png" alt="Logo Filled" style={logoFilledStyle} />
        </div>
        <div style={scanlineStyle} />
      </div>

      <div style={statusTextStyle}>{statusTexts[currentStatusIndex]}</div>

      <div style={progressBarTrackStyle}>
        <div style={progressBarFillStyle} />
      </div>
    </div>
  );
};
