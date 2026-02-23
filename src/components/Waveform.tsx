import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface WaveformProps {
  isRecording?: boolean;
  alwaysShow?: boolean;
  scale?: number;
}

export default function Waveform({ isRecording = false, alwaysShow = false, scale = 1 }: WaveformProps) {
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

  if (!isRecording && !alwaysShow) return null;

  const heights = [5, 10, 14, 10, 5].map(h => h * scale);

  return (
    <View style={[styles.container, { height: 24 * scale }]}>
      <Animated.View style={[styles.waveContainer, { opacity, gap: 5 * scale, height: 24 * scale }]}>
        {heights.map((h, index) => (
          <View
            key={index}
            style={[styles.dot, { height: h, width: 4 * scale, borderRadius: 2 * scale }]}
          />
        ))}
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