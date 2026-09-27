import React, { useState, useEffect } from 'react';
import { OrientationLock } from '../ui/OrientationLock';
import { LoadingScreen } from '../screens/LoadingScreen';
import { MainMenuScreen } from '../screens/MainMenuScreen';

export const App: React.FC = () => {
  const [isCorrectOrientation, setIsCorrectOrientation] = useState(false);
  const [isLoadingDone, setIsLoadingDone] = useState(false);

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

  if (!isCorrectOrientation) {
    return <OrientationLock />;
  }

  if (!isLoadingDone) {
    return <LoadingScreen onLoaded={() => setIsLoadingDone(true)} />;
  }

  return <MainMenuScreen />;
};
