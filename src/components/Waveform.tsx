import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface WaveformProps {
  isRecording: boolean;
}

export default function Waveform({ isRecording }: WaveformProps) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRecording) {
      // Simple pulsing opacity animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      opacity.setValue(1);
    }
  }, [isRecording, opacity]);

  if (!isRecording) return null;

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.waveContainer, { opacity }]}>
        <View style={[styles.dot, { height: 5 }]} />
        <View style={[styles.dot, { height: 10 }]} />
        <View style={[styles.dot, { height: 14 }]} />
        <View style={[styles.dot, { height: 10 }]} />
        <View style={[styles.dot, { height: 5 }]} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
    height: 24,
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 24,
  },
  dot: {
    width: 4,
    borderRadius: 2,
    backgroundColor: '#3b82f6',
  },
});