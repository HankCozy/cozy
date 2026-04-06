import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/contexts/AuthContext';
import RootNavigator from './src/navigation/AppNavigator';
import { navigationRef } from './src/services/navigationService';

export default function App() {
  return (
    <AuthProvider>
      <RootNavigator navigationRef={navigationRef} />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}
