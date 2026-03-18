import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface ProfileNudgeProps {
  headline: string;
  message: string;
  onAction?: () => void;
  onDismiss: () => void;
}

export default function ProfileNudge({ headline, message, onAction, onDismiss }: ProfileNudgeProps) {
  const Wrapper = onAction ? TouchableOpacity : View;
  const wrapperProps = onAction ? { activeOpacity: 0.88, onPress: onAction } : {};

  return (
    <Wrapper style={styles.card} {...wrapperProps}>
      <TouchableOpacity
        style={styles.dismissButton}
        onPress={(e) => { e.stopPropagation(); onDismiss(); }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Feather name="x" size={16} color="#9ca3af" />
      </TouchableOpacity>
      <Text style={styles.headline}>{headline}</Text>
      <Text style={styles.message}>{message}</Text>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FECACA',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 22,
    marginBottom: 12,
  },
  dismissButton: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  headline: {
    fontSize: 15,
    fontWeight: '700',
    color: '#7F1D1D',
    paddingRight: 28,
  },
  message: {
    fontSize: 14,
    color: '#7F1D1D',
    lineHeight: 20,
    marginTop: 4,
    opacity: 0.8,
  },
});
