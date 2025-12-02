import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface ProfileBadgeProps {
  firstName?: string;
  lastName?: string;
  totalAnswers: number;
  profilePictureUrl?: string | null;
  size?: number; // Optional size, defaults to 60
}

const getBadgeColor = (totalAnswers: number): string => {
  if (totalAnswers === 0) return '#DC2626'; // Red
  if (totalAnswers < 4) return '#F59E0B'; // Amber
  return '#10B981'; // Green
};

export default function ProfileBadge({
  totalAnswers,
  profilePictureUrl,
  size = 60
}: ProfileBadgeProps) {
  const badgeColor = getBadgeColor(totalAnswers);
  const radius = size / 2;
  const iconSize = size * 0.47; // Scale icon proportionally

  return (
    <View style={[
      styles.badge,
      {
        backgroundColor: badgeColor,
        width: size,
        height: size,
        borderRadius: radius
      }
    ]}>
      {profilePictureUrl ? (
        <Image
          source={{ uri: profilePictureUrl }}
          style={[
            styles.profileImage,
            { width: size, height: size, borderRadius: radius }
          ]}
        />
      ) : (
        <Feather name="user" size={iconSize} color="white" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  profileImage: {
    // Size set dynamically via inline styles
  },
});
