import React, { useState, useEffect } from 'react';
import { OrientationLock } from '../ui/OrientationLock';
import { LoadingScreen } from '../screens/LoadingScreen';
import { MainMenuScreen } from '../screens/MainMenuScreen';
import { SandboxScreen } from '../screens/SandboxScreen';

export const App: React.FC = () => {
  const [isCorrectOrientation, setIsCorrectOrientation] = useState(false);
  const [isLoadingDone, setIsLoadingDone] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<'menu' | 'sandbox'>('menu');
  const [fadeOpacity, setFadeOpacity] = useState(0);

  useEffect(() => {
    const checkOrientation = () => {
      const isLandscape = window.innerWidth > window.innerHeight;
      setIsCorrectOrientation(isLandscape);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  const startSandboxTransition = () => {
    setFadeOpacity(1);
    setTimeout(() => {
      setCurrentScreen('sandbox');
      setTimeout(() => {
        setFadeOpacity(0);
      }, 1500);
    }, 600);
  };

  if (!isCorrectOrientation) {
    return <OrientationLock />;
  }

  if (!isLoadingDone) {
    return <LoadingScreen onLoaded={() => setIsLoadingDone(true)} />;
  }

  const fadeOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: '#000000',
    opacity: fadeOpacity,
    transition: 'opacity 0.6s ease-in-out',
    pointerEvents: fadeOpacity > 0 ? 'all' : 'none',
    zIndex: 99999,
  };

  return (
    <>
      <div style={fadeOverlayStyle} />
      {currentScreen === 'menu' && (
        <MainMenuScreen
          onPlay={() => {}}
          onOpenSandbox={startSandboxTransition}
        />
      )}
      {currentScreen === 'sandbox' && <SandboxScreen />}
    </>
  );
};
