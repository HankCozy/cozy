import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface WaveformProps {
  isRecording: boolean;
}

export default function Waveform({ isRecording }: WaveformProps) {
  const wave1 = useRef(new Animated.Value(0)).current;
  const wave2 = useRef(new Animated.Value(0)).current;
  const wave3 = useRef(new Animated.Value(0)).current;
  const wave4 = useRef(new Animated.Value(0)).current;
  const wave5 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isRecording) {
      const animations = [
        { value: wave1, duration: 800 },
        { value: wave2, duration: 1000 },
        { value: wave3, duration: 700 },
        { value: wave4, duration: 900 },
        { value: wave5, duration: 1100 },
      ];

      animations.forEach(({ value, duration }) => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(value, {
              toValue: 1,
              duration: duration,
              useNativeDriver: false,
            }),
            Animated.timing(value, {
              toValue: 0,
              duration: duration,
              useNativeDriver: false,
            }),
          ])
        ).start();
      });
    } else {
      wave1.setValue(0);
      wave2.setValue(0);
      wave3.setValue(0);
      wave4.setValue(0);
      wave5.setValue(0);
    }
  }, [isRecording, wave1, wave2, wave3, wave4, wave5]);

  if (!isRecording) return null;

  const getBarHeight = (animValue: Animated.Value) =>
    animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [10, 50],
    });

  return (
    <View style={styles.container}>
      <View style={styles.waveContainer}>
        <Animated.View
          style={[
            styles.bar,
            { height: getBarHeight(wave1), backgroundColor: '#60a5fa' },
          ]}
        />
        <Animated.View
          style={[
            styles.bar,
            { height: getBarHeight(wave2), backgroundColor: '#a78bfa' },
          ]}
        />
        <Animated.View
          style={[
            styles.bar,
            { height: getBarHeight(wave3), backgroundColor: '#f472b6' },
          ]}
        />
        <Animated.View
          style={[
            styles.bar,
            { height: getBarHeight(wave4), backgroundColor: '#818cf8' },
          ]}
        />
        <Animated.View
          style={[
            styles.bar,
            { height: getBarHeight(wave5), backgroundColor: '#22d3ee' },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 60,
  },
  bar: {
    width: 6,
    borderRadius: 3,
  },
});