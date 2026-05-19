import React from 'react';
import {
  KeyboardAvoidingView,
  SafeAreaView,
  Platform,
  StyleSheet,
  ViewStyle,
} from 'react-native';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
}

// Standard screen wrapper — every screen should use this instead of a raw SafeAreaView.
// Provides KeyboardAvoidingView so inputs are never hidden behind the keyboard,
// and SafeAreaView so content respects notch/home-indicator insets.
// Background defaults to the app warm white (#FFF7E6).
export default function ScreenContainer({ children, style }: Props) {
  return (
    <KeyboardAvoidingView
      style={styles.kav}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={[styles.safe, style]}>
        {children}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kav: { flex: 1 },
  safe: { flex: 1, backgroundColor: '#FFF7E6' },
});
