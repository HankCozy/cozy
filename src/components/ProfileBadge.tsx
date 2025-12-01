import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface ProfileBadgeProps {
  firstName?: string;
  lastName?: string;
  totalAnswers: number;
  profilePictureUrl?: string | null;
}

const getBadgeColor = (totalAnswers: number): string => {
  if (totalAnswers === 0) return '#DC2626'; // Red
  if (totalAnswers < 4) return '#F59E0B'; // Amber
  return '#10B981'; // Green
};

export default function ProfileBadge({
  totalAnswers,
  profilePictureUrl
}: ProfileBadgeProps) {
  const badgeColor = getBadgeColor(totalAnswers);

  return (
    <View style={[styles.badge, { backgroundColor: badgeColor }]}>
      {profilePictureUrl ? (
        <Image
          source={{ uri: profilePictureUrl }}
          style={styles.profileImage}
        />
      ) : (
        <Feather name="user" size={28} color="white" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 60,
    height: 60,
    borderRadius: 30,
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
    width: 60,
    height: 60,
    borderRadius: 30,
  },
});
