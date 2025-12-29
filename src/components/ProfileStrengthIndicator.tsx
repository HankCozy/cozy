import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getStrengthLevel, getStrengthColor, getStrengthLabel } from '../utils/profileStrength';

interface ProfileStrengthIndicatorProps {
  totalAnswers: number;
  maxAnswers?: number;
  showLabel?: boolean;
  compact?: boolean;
}

export default function ProfileStrengthIndicator({
  totalAnswers,
  maxAnswers = 16,
  showLabel = true,
  compact = false,
}: ProfileStrengthIndicatorProps) {
  const level = getStrengthLevel(totalAnswers);
  const color = getStrengthColor(level);
  const label = getStrengthLabel(level);
  const progress = Math.min(totalAnswers / maxAnswers, 1);

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
          {/* Milestone markers at 4, 8, 16 */}
          <View style={[styles.marker, { left: '25%' }]} />
          <View style={[styles.marker, { left: '50%' }]} />
        </View>

        {/* Star icon for complete */}
        {totalAnswers >= 16 && (
          <Feather name="star" size={16} color="#f59e0b" style={styles.star} />
        )}
      </View>

      {/* Label and count */}
      {showLabel && (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.count}>
            {totalAnswers}/{maxAnswers}
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
  marker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'white',
    opacity: 0.5,
  },
  star: {
    position: 'absolute',
    right: -20,
    top: -4,
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
