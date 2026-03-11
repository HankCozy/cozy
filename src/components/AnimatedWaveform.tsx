import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, ViewStyle } from 'react-native';
import { Colors } from '../theme';

export interface WaveformBarConfig {
  color: string;
  maxH: number;
  minH: number;
}

export const DEFAULT_WAVEFORM_BARS: WaveformBarConfig[] = [
  { color: Colors.blue,   maxH: 80,  minH: 28 },
  { color: Colors.orange, maxH: 120, minH: 42 },
  { color: Colors.pink,   maxH: 55,  minH: 18 },
  { color: Colors.green,  maxH: 100, minH: 35 },
  { color: Colors.yellow, maxH: 70,  minH: 24 },
];

// Each bar starts at a different offset into the sine cycle so the waveform
// looks alive from the very first frame — no delay, no stuck visuals.
const PHASE_MS   = [0, 220, 440, 110, 330];
const HALF_CYCLE = 650; // ms per half-cycle (up or down stroke)
const FULL_CYCLE = HALF_CYCLE * 2;

function phaseStartValue(delayMs: number): number {
  // Triangle-wave position at `delayMs` into the cycle (0 = bottom, 1 = top)
  const pos = (delayMs % FULL_CYCLE) / FULL_CYCLE;
  return pos < 0.5 ? pos * 2 : 2 - pos * 2;
}

interface Props {
  containerStyle?: ViewStyle;
  barWidth?: number;
  barGap?: number;
  bars?: WaveformBarConfig[];
}

export default function AnimatedWaveform({
  containerStyle,
  barWidth = 26,
  barGap   = 10,
  bars     = DEFAULT_WAVEFORM_BARS,
}: Props) {
  // Initialise each bar at its correct phase so nothing looks stuck on mount
  const anims = useRef(
    bars.map((_, i) =>
      new Animated.Value(phaseStartValue(PHASE_MS[i % PHASE_MS.length]))
    )
  ).current;

  useEffect(() => {
    bars.forEach((_, i) => {
      const phaseMs   = PHASE_MS[i % PHASE_MS.length];
      const initValue = phaseStartValue(phaseMs);
      anims[i].setValue(initValue);

      // Time remaining until this bar reaches its peak (all phases are in the
      // first half of the cycle, so they're all currently going UP)
      const timeToTop = HALF_CYCLE - phaseMs;

      // Ease in/out gives the natural sine-wave feel and removes any visual
      // "sticking" at the top/bottom extremes
      const eased = (toValue: number, duration: number) =>
        Animated.timing(anims[i], {
          toValue,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        });

      // Complete the current up-stroke, then loop indefinitely
      Animated.sequence([
        eased(1, timeToTop),
        Animated.loop(
          Animated.sequence([
            eased(0, HALF_CYCLE),
            eased(1, HALF_CYCLE),
          ])
        ),
      ]).start();
    });

    return () => {
      anims.forEach(a => a.stopAnimation());
    };
  }, []);

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center' }, containerStyle]}>
      {bars.map((bar, i) => (
        <Animated.View
          key={i}
          style={{
            width: barWidth,
            marginHorizontal: barGap / 2,
            borderRadius: barWidth / 2,
            backgroundColor: bar.color,
            height: anims[i].interpolate({
              inputRange:  [0, 1],
              outputRange: [bar.minH, bar.maxH],
            }),
          }}
        />
      ))}
    </View>
  );
}
