import React from 'react';
import { View, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';

interface WaveformProps {
  isRecording?: boolean;
  alwaysShow?: boolean;
  scale?: number;
}

export default function Waveform({ isRecording = false, alwaysShow = false, scale = 0.9 }: WaveformProps) {
  if (!isRecording && !alwaysShow) return null;

  return (
    <View style={styles.container}>
      <LottieView
        source={require('../../assets/animations/recording_wave.json')}
        autoPlay
        loop
        resizeMode="contain"
        style={{ width: 200 * scale, height: 80 * scale }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
});
