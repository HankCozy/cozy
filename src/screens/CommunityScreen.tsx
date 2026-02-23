import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import ProfileBadge from '../components/ProfileBadge';
import { getProfilePictureUrl } from '../services/api';
import { API_BASE_URL } from '../config/api';

interface CircleOverview {
  id: string;
  name: string;
  count: number;
}

interface IcebreakerMatch {
  userId: string;
  firstName: string;
  lastName: string;
  matchScore: number;
  sharedInterests: string[];
  icebreakerQuestions: string[];
}

export default function CommunityScreen() {
  const navigation = useNavigation<any>();
  const { auth, logout } = useAuth();
  const { user, token } = auth;
  const [circles, setCircles] = useState<CircleOverview[]>([]);
  const [icebreakerMatch, setIcebreakerMatch] = useState<IcebreakerMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingIcebreaker, setLoadingIcebreaker] = useState(false);
  const [profileStatus, setProfileStatus] = useState<'start' | 'draft' | 'sharing'>('start');
  const [answerCount, setAnswerCount] = useState(0);
  const [userProfilePictureUrl, setUserProfilePictureUrl] = useState<string | null>(null);
  const [showAllCircles, setShowAllCircles] = useState(false);
  const [smallCommunity, setSmallCommunity] = useState(false);

  const fetchCircles = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/communities/circles`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401 || response.status === 403) {
        // User's profile isn't published - this is expected
        if (response.status === 403) {
          setCircles([]);
          return;
        }
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please login again.',
          [{ text: 'OK', onPress: () => logout() }]
        );
        return;
      }

      const data = await response.json();

      if (data.success) {
        setCircles(data.circles);
        // Check if small community (only "All" circle returned)
        setSmallCommunity(data.circles.length === 1 && data.circles[0].id === 'all');
      }
    } catch (error) {
      console.error('Failed to fetch circles:', error);
    }
  };

  const fetchIcebreakerMatch = async () => {
    setLoadingIcebreaker(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/communities/icebreaker`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.match) {
          setIcebreakerMatch(data.match);
        }
      }
    } catch (error) {
      console.error('Failed to fetch icebreaker match:', error);
    } finally {
      setLoadingIcebreaker(false);
    }
  };

  const determineProfileStatus = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const answerKeys = keys.filter((key) => key.startsWith('answer_'));
      const totalAnswers = answerKeys.length;
      setAnswerCount(totalAnswers);

      if (totalAnswers === 0) {
        setProfileStatus('start');
        return;
      }

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
      fetchCircles();

      if (user?.id && token) {
        getProfilePictureUrl(user.id, token)
          .then(url => {
            setUserProfilePictureUrl(url);
          })
          .catch(error => {
            if (error.message === 'TOKEN_EXPIRED') {
              Alert.alert(
                'Session Expired',
                'Your session has expired. Please login again.',
                [{ text: 'OK', onPress: () => logout() }]
              );
            }
          });
      }

      setLoading(false);
    }, [token, user?.id])
  );

  // Fetch icebreaker when profile is sharing
  useFocusEffect(
    React.useCallback(() => {
      if (profileStatus === 'sharing') {
        fetchIcebreakerMatch();
      }
    }, [profileStatus, token])
  );

  const onRefresh = () => {
    setRefreshing(true);
    determineProfileStatus();
    fetchCircles();
    if (profileStatus === 'sharing') {
      fetchIcebreakerMatch();
    }
    setRefreshing(false);
  };

  const handleCirclePress = (circle: CircleOverview) => {
    navigation.navigate('CircleDetail', { circleId: circle.id, circleName: circle.name });
  };

  const handleIcebreakerPress = () => {
    if (icebreakerMatch) {
      navigation.navigate('MemberProfile', { userId: icebreakerMatch.userId });
    }
  };

  const handleRandomize = () => {
    fetchIcebreakerMatch();
  };

  const getStatusText = () => {
    if (profileStatus === 'sharing') return 'Sharing profile';
    if (answerCount === 0) return 'Start your profile';
    if (answerCount < 4) return 'Complete your profile';
    return 'Profile not shared';
  };

  // Determine which circles to show (first 4 or all)
  const visibleCircles = showAllCircles ? circles : circles.slice(0, 4);
  const hasMoreCircles = circles.length > 4;

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading circles...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
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
          <Text style={styles.headerTitle}>{user?.community?.organization}</Text>
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

        {/* Circles Section */}
        <View style={styles.circlesSection}>
          <Text style={styles.sectionTitle}>Your circles:</Text>

          {profileStatus !== 'sharing' ? (
            // Locked state - show dimmed circles with lock overlay
            <View style={styles.lockedContainer}>
              <View style={styles.circlesGridDimmed}>
                {[1, 2, 3, 4].map((i) => (
                  <View key={i} style={styles.circleButtonPlaceholder}>
                    <View style={styles.circleCountPlaceholder} />
                    <View style={styles.circleNamePlaceholder} />
                  </View>
                ))}
              </View>
              <View style={styles.lockOverlay}>
                <Feather name="lock" size={32} color="#6B7280" />
                <Text style={styles.lockText}>
                  Share your profile to unlock your circles
                </Text>
              </View>
            </View>
          ) : smallCommunity ? (
            // Small community state
            <View style={styles.smallCommunityContainer}>
              <View style={styles.circlesGrid}>
                <TouchableOpacity
                  style={styles.circleButton}
                  onPress={() => handleCirclePress(circles[0])}
                >
                  <View style={styles.circleCount}>
                    <Text style={styles.circleCountText}>{circles[0]?.count || 0}</Text>
                  </View>
                  <Text style={styles.circleName}>All</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.smallCommunityText}>
                More circles will appear as your community grows
              </Text>
            </View>
          ) : (
            // Normal circles grid
            <>
              <View style={styles.circlesGrid}>
                {visibleCircles.map((circle) => (
                  <TouchableOpacity
                    key={circle.id}
                    style={styles.circleButton}
                    onPress={() => handleCirclePress(circle)}
                  >
                    <View style={styles.circleCount}>
                      <Text style={styles.circleCountText}>{circle.count}</Text>
                    </View>
                    <Text style={styles.circleName} numberOfLines={2}>
                      {circle.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {hasMoreCircles && (
                <TouchableOpacity
                  style={styles.showMoreButton}
                  onPress={() => setShowAllCircles(!showAllCircles)}
                >
                  <Text style={styles.showMoreText}>
                    {showAllCircles ? 'Show less' : `Show ${circles.length - 4} more`}
                  </Text>
                  <Feather
                    name={showAllCircles ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color="#3b82f6"
                  />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Icebreakers Section */}
        {profileStatus === 'sharing' && (
          <View style={styles.icebreakersSection}>
            <Text style={styles.sectionTitle}>Icebreakers</Text>

            {loadingIcebreaker ? (
              <View style={styles.icebreakerLoading}>
                <ActivityIndicator size="small" color="#3b82f6" />
                <Text style={styles.icebreakerLoadingText}>Finding your match...</Text>
              </View>
            ) : icebreakerMatch ? (
              <View style={styles.icebreakerCard}>
                <TouchableOpacity
                  style={styles.icebreakerHeader}
                  onPress={handleIcebreakerPress}
                >
                  <View style={styles.icebreakerAvatar}>
                    <Text style={styles.icebreakerInitials}>
                      {icebreakerMatch.firstName?.[0]?.toUpperCase() || '?'}
                      {icebreakerMatch.lastName?.[0]?.toUpperCase() || ''}
                    </Text>
                  </View>
                  <View style={styles.icebreakerInfo}>
                    <Text style={styles.icebreakerName}>
                      {icebreakerMatch.firstName} {icebreakerMatch.lastName}
                    </Text>
                    {icebreakerMatch.sharedInterests.length > 0 && (
                      <Text style={styles.icebreakerInterests}>
                        Shared: {icebreakerMatch.sharedInterests.slice(0, 2).join(', ')}
                      </Text>
                    )}
                  </View>
                  <Feather name="chevron-right" size={20} color="#9CA3AF" />
                </TouchableOpacity>

                <View style={styles.icebreakerQuestions}>
                  <Text style={styles.icebreakerQuestionsTitle}>Questions to ask:</Text>
                  {icebreakerMatch.icebreakerQuestions.map((question, index) => (
                    <Text key={index} style={styles.icebreakerQuestion}>
                      {index + 1}. {question}
                    </Text>
                  ))}
                </View>

                <View style={styles.icebreakerActions}>
                  <TouchableOpacity
                    style={styles.icebreakerButton}
                    onPress={handleRandomize}
                  >
                    <Feather name="refresh-cw" size={16} color="#3b82f6" />
                    <Text style={styles.icebreakerButtonText}>Randomize</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.icebreakerButton}
                    onPress={handleIcebreakerPress}
                  >
                    <Feather name="user" size={16} color="#3b82f6" />
                    <Text style={styles.icebreakerButtonText}>View Profile</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.noMatchContainer}>
                <Feather name="users" size={32} color="#D1D5DB" />
                <Text style={styles.noMatchText}>
                  No matches yet. Complete more of your profile to find connections!
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  contentContainer: {
    paddingBottom: 120,
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
    paddingTop: 20,
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
  circlesSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  circlesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  circleButton: {
    width: '47%',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  circleCount: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  circleCountText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#92400E',
  },
  circleName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  showMoreText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  lockedContainer: {
    position: 'relative',
  },
  circlesGridDimmed: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    opacity: 0.3,
  },
  circleButtonPlaceholder: {
    width: '47%',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    padding: 16,
    borderRadius: 12,
  },
  circleCountPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#D1D5DB',
    marginBottom: 8,
  },
  circleNamePlaceholder: {
    width: 60,
    height: 14,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 250, 251, 0.8)',
  },
  lockText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
  },
  smallCommunityContainer: {
    alignItems: 'center',
  },
  smallCommunityText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  icebreakersSection: {
    marginTop: 32,
    paddingHorizontal: 20,
  },
  icebreakerLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  icebreakerLoadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  icebreakerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  icebreakerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  icebreakerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icebreakerInitials: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#92400E',
  },
  icebreakerInfo: {
    flex: 1,
  },
  icebreakerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  icebreakerInterests: {
    fontSize: 14,
    color: '#6B7280',
  },
  icebreakerQuestions: {
    padding: 16,
    backgroundColor: '#F9FAFB',
  },
  icebreakerQuestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  icebreakerQuestion: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 4,
    lineHeight: 20,
  },
  icebreakerActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  icebreakerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 6,
  },
  icebreakerButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6',
  },
  noMatchContainer: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  noMatchText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
