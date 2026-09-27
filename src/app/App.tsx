import React from 'react';

export const App: React.FC = () => {
  const containerStyle: React.CSSProperties = {
    width: '100vw',
    height: '100vh',
    backgroundColor: '#000000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  };

  return <div style={containerStyle} />;
};
