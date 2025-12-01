import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import ProfileBadge from '../components/ProfileBadge';
import { getProfilePictureUrl } from '../services/api';

interface CommunityMember {
  id: string;
  firstName: string | null;
  lastName: string | null;
  role: 'MEMBER' | 'MANAGER';
  profileSummary: string | null;
  profileAnswers: any;
  profilePictureUrl: string | null;
  createdAt: string;
}

export default function CommunityScreen() {
  const navigation = useNavigation<any>();
  const { auth } = useAuth();
  const { user, token } = auth;
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profileStatus, setProfileStatus] = useState<'start' | 'draft' | 'sharing'>('start');
  const [answerCount, setAnswerCount] = useState(0);
  const [userProfilePictureUrl, setUserProfilePictureUrl] = useState<string | null>(null);

  const fetchCommunityMembers = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/communities/members', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setMembers(data.members);
      }
    } catch (error) {
      console.error('Failed to fetch community members:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const determineProfileStatus = async () => {
    try {
      // Check if user has any answers recorded
      const keys = await AsyncStorage.getAllKeys();
      const answerKeys = keys.filter((key) => key.startsWith('answer_'));
      const totalAnswers = answerKeys.length;
      setAnswerCount(totalAnswers);

      if (totalAnswers === 0) {
        setProfileStatus('start');
        return;
      }

      // Check if profile is published
      const profilePublishedStr = await AsyncStorage.getItem('profile_published');
      const isPublished = profilePublishedStr === 'true';

      if (isPublished) {
        setProfileStatus('sharing');
      } else {
        setProfileStatus('draft');
      }
    } catch (error) {
      console.error('Error determining profile status:', error);
      setProfileStatus('start');
      setAnswerCount(0);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      setLoading(true);
      determineProfileStatus();
      fetchCommunityMembers();

      // Fetch user's profile picture
      if (user?.id && token) {
        getProfilePictureUrl(user.id, token).then(url => {
          setUserProfilePictureUrl(url);
        });
      }
    }, [token, user?.id])
  );

  const onRefresh = () => {
    setRefreshing(true);
    determineProfileStatus();
    fetchCommunityMembers();
  };

  const handleMemberPress = (member: CommunityMember) => {
    navigation.navigate('MemberProfile', { userId: member.id });
  };

  const getBadgeColor = () => {
    if (answerCount === 0) return '#DC2626'; // Red
    if (answerCount < 4) return '#F59E0B'; // Amber
    return '#10B981'; // Green
  };

  const getStatusText = () => {
    if (profileStatus === 'sharing') return 'Sharing profile';
    if (answerCount === 0) return 'Start your profile';
    if (answerCount < 4) return 'Complete your profile';
    return 'Profile not shared';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading community...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerSubtitle}>Your circle:</Text>
        <Text style={styles.headerTitle}>{user?.community.organization}</Text>
      </View>

      {/* Profile Status Card */}
      <TouchableOpacity
        style={styles.profileStatusCard}
        onPress={() => navigation.navigate('MainTabs', { screen: 'Profile' })}
        activeOpacity={0.7}
      >
        <ProfileBadge
          firstName={user?.firstName}
          lastName={user?.lastName}
          totalAnswers={answerCount}
          profilePictureUrl={userProfilePictureUrl}
        />
        <View style={styles.profileStatusInfo}>
          <Text style={styles.profileName}>
            {user?.firstName && user?.lastName
              ? `${user.firstName} ${user.lastName}`
              : 'Your Profile'}
          </Text>
          <Text style={styles.profileStatusText}>{getStatusText()}</Text>
          {profileStatus !== 'sharing' && (
            <Text style={styles.profileQuestionCount}>
              {answerCount}/4 questions answered
            </Text>
          )}
        </View>
        <Feather
          name={profileStatus === 'sharing' ? 'chevron-right' : 'chevron-left'}
          size={20}
          color="#9CA3AF"
        />
      </TouchableOpacity>

      {/* Community Members */}
      <View style={styles.membersSection}>
        <Text style={styles.sectionTitle}>
          Your {user?.community.organization} circle ({members.length})
        </Text>
        {members.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="users" size={48} color="#d1d5db" />
            <Text style={styles.emptyStateText}>No published profiles yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Be the first to share your profile with the community!
            </Text>
          </View>
        ) : (
          <View style={[styles.membersList, profileStatus !== 'sharing' && styles.membersListDimmed]}>
            {members.map((member) => (
              <TouchableOpacity
                key={member.id}
                style={styles.memberCard}
                onPress={() => handleMemberPress(member)}
                disabled={profileStatus !== 'sharing'}
              >
                <View style={[
                  styles.memberAvatar,
                  profileStatus !== 'sharing' && styles.memberAvatarDimmed
                ]}>
                  <Text style={styles.memberInitials}>
                    {member.firstName?.[0]?.toUpperCase() || '?'}
                    {member.lastName?.[0]?.toUpperCase() || ''}
                  </Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={[
                    styles.memberName,
                    profileStatus !== 'sharing' && styles.memberTextDimmed
                  ]}>
                    {member.firstName} {member.lastName}
                  </Text>
                  <Text style={[
                    styles.memberRole,
                    profileStatus !== 'sharing' && styles.memberTextDimmed
                  ]}>
                    {member.role === 'MANAGER' ? 'Manager' : 'Member'}
                  </Text>
                </View>
                <Feather
                  name="chevron-right"
                  size={20}
                  color={profileStatus !== 'sharing' ? '#D1D5DB' : '#9ca3af'}
                />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Overlay Share Prompt */}
        {profileStatus !== 'sharing' && members.length > 0 && (
          <View style={styles.sharePromptOverlay}>
            <View style={styles.sharePromptContent}>
              <Feather name="lock" size={32} color="#6B7280" />
              <Text style={styles.sharePromptOverlayText}>
                Share your profile to unlock your circle
              </Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  contentContainer: {
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  profileStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
  },
  profileStatusInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  profileStatusText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  profileQuestionCount: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  membersSection: {
    marginTop: 24,
    paddingHorizontal: 20,
    position: 'relative',
  },
  sharePromptOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  sharePromptContent: {
    alignItems: 'center',
    backgroundColor: 'rgba(249, 250, 251, 0.95)',
    paddingVertical: 32,
    paddingHorizontal: 40,
    borderRadius: 16,
  },
  sharePromptOverlayText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  membersList: {
    gap: 12,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberInitials: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 14,
    color: '#6b7280',
  },
  membersListDimmed: {
    opacity: 0.4,
  },
  memberAvatarDimmed: {
    opacity: 0.5,
  },
  memberTextDimmed: {
    color: '#D1D5DB',
  },
});
