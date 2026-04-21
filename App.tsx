import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';
import { AuthProvider } from './src/contexts/AuthContext';
import RootNavigator from './src/navigation/AppNavigator';
import { navigationRef } from './src/services/navigationService';

// Cap system font scaling globally — prevents large accessibility text from breaking layouts
Text.defaultProps = { ...Text.defaultProps, maxFontSizeMultiplier: 1.3 };

export default function App() {
  return (
    <AuthProvider>
      <RootNavigator navigationRef={navigationRef} />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}
