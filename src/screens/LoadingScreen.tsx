import React, { useEffect, useState } from 'react';

interface LoadingScreenProps {
  onLoaded: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onLoaded }) => {
  const [progress, setProgress] = useState(0);
  const [phraseIndex, setPhraseIndex] = useState(0);

  const phrases = ['ам-ам-ам', 'ррр..РррРр!', 'ЭээЭ..ээ'];

  useEffect(() => {
    let current = 0;
    let isCancelled = false;

    const step = () => {
      if (isCancelled) return;

      const increment = Math.random() * 6 + 2;
      current = Math.min(current + increment, 100);
      setProgress(Math.floor(current));

      if (current < 35) {
        setPhraseIndex(0);
      } else if (current < 75) {
        setPhraseIndex(1);
      } else {
        setPhraseIndex(2);
      }

      if (current >= 100) {
        setTimeout(onLoaded, 400);
      } else {
        const delay = Math.random() * 120 + 80;
        setTimeout(step, delay);
      }
    };

    const initTimeout = setTimeout(step, 300);

    return () => {
      isCancelled = true;
      clearTimeout(initTimeout);
    };
  }, [onLoaded]);

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: '#050704',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  };

  const logoWrapperStyle: React.CSSProperties = {
    position: 'relative',
    width: 'min(380px, 46vw)',
    height: 'min(170px, 24vw)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '46px',
  };

  const ambientGlowStyle: React.CSSProperties = {
    position: 'absolute',
    width: '120%',
    height: '140%',
    background: 'radial-gradient(circle, rgba(58, 97, 27, 0.45) 0%, rgba(58, 97, 27, 0) 70%)',
    filter: 'blur(28px)',
    pointerEvents: 'none',
  };

  const logoBackgroundStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    opacity: 0.18,
    filter: 'grayscale(100%) brightness(35%)',
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
    height: 'min(170px, 24vw)',
    objectFit: 'contain',
  };

  const statusTextStyle: React.CSSProperties = {
    color: '#659c34',
    fontSize: '15px',
    fontWeight: 800,
    letterSpacing: '0.22em',
    marginBottom: '12px',
    textTransform: 'uppercase',
  };

  const progressBarTrackStyle: React.CSSProperties = {
    width: 'min(480px, 58vw)',
    height: '3px',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    position: 'relative',
  };

  const progressBarFillStyle: React.CSSProperties = {
    height: '100%',
    width: `${progress}%`,
    backgroundColor: '#659c34',
    boxShadow: '0 0 10px #659c34',
  };

  return (
    <div style={containerStyle}>
      <div style={logoWrapperStyle}>
        <div style={ambientGlowStyle} />
        <img src="/gamelogo.png" alt="Logo Dim" style={logoBackgroundStyle} />
        <div style={logoFilledContainerStyle}>
          <img src="/gamelogo.png" alt="Logo Filled" style={logoFilledStyle} />
        </div>
      </div>

      <div style={statusTextStyle}>{phrases[phraseIndex]}</div>

      <div style={progressBarTrackStyle}>
        <div style={progressBarFillStyle} />
      </div>
    </div>
  );
};
