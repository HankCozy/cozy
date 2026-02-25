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
    backgroundColor: '#fffbeb',
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
    color: '#1e3a5f',
    paddingRight: 28,
  },
  message: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginTop: 4,
  },
});
