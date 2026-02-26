import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getStrengthLevel, getStrengthColor, getStrengthLabel } from '../utils/profileStrength';

const MAX_QUESTIONS = 15;

interface ProfileStrengthIndicatorProps {
  totalAnswers: number;
  showLabel?: boolean;
  compact?: boolean;
}

export default function ProfileStrengthIndicator({
  totalAnswers,
  showLabel = true,
  compact = false,
}: ProfileStrengthIndicatorProps) {
  const level = getStrengthLevel(totalAnswers);
  const color = getStrengthColor(level);
  const label = getStrengthLabel(level);
  const progress = Math.min(totalAnswers / MAX_QUESTIONS, 1);

  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={styles.barContainer}>
        <View style={styles.barBackground}>
          <View
            style={[
              styles.barFill,
              { width: `${progress * 100}%`, backgroundColor: color },
            ]}
          />
        </View>
      </View>

      {/* Label and count */}
      {showLabel && (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.count}>
            {totalAnswers}/{MAX_QUESTIONS}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 8,
  },
  barContainer: {
    position: 'relative',
    height: 8,
  },
  barBackground: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  barFill: {
    height: 8,
    borderRadius: 4,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  count: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
});
