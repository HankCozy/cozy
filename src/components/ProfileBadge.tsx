import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

const DEFAULT_PROFILE = require('../../assets/default_profile.png');

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

  const imageSource = profilePictureUrl ? { uri: profilePictureUrl } : DEFAULT_PROFILE;

  return (
    <View style={[styles.badge, { backgroundColor: badgeColor, width: size, height: size, borderRadius: radius }]}>
      <Image
        source={imageSource}
        style={[styles.profileImage, { width: size, height: size, borderRadius: radius }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    // Size set dynamically via inline styles
  },
});
