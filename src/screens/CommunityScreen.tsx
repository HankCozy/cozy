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

interface CommunityMember {
  id: string;
  firstName: string | null;
  lastName: string | null;
  role: 'MEMBER' | 'MANAGER';
  profileSummary: string | null;
  profileAnswers: any;
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

      if (answerKeys.length === 0) {
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
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      setLoading(true);
      determineProfileStatus();
      fetchCommunityMembers();
    }, [token])
  );

  const onRefresh = () => {
    setRefreshing(true);
    determineProfileStatus();
    fetchCommunityMembers();
  };

  const handleMemberPress = (member: CommunityMember) => {
    navigation.navigate('MemberProfile', { userId: member.id });
  };

  const getStatusColor = () => {
    switch (profileStatus) {
      case 'sharing':
        return '#10b981';
      case 'draft':
        return '#f59e0b';
      case 'start':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const getStatusText = () => {
    switch (profileStatus) {
      case 'sharing':
        return 'Sharing';
      case 'draft':
        return 'Draft';
      case 'start':
        return 'Start now';
      default:
        return 'Start now';
    }
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
      {/* Organization Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Circle</Text>
        <Text style={styles.organizationName}>{user?.community.organization}</Text>
        {user?.community.division && (
          <Text style={styles.division}>{user.community.division}</Text>
        )}
      </View>

      {/* Profile Status */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Feather name="user" size={20} color={getStatusColor()} />
          <Text style={styles.statusLabel}>Your Profile Status</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor()}15` }]}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        </View>
        {profileStatus !== 'sharing' && (
          <TouchableOpacity
            style={styles.goToProfileButton}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Profile' })}
          >
            <Text style={styles.goToProfileText}>
              {profileStatus === 'start' ? 'Start your profile' : 'Publish your profile'}
            </Text>
            <Feather name="arrow-right" size={16} color="#3b82f6" />
          </TouchableOpacity>
        )}
      </View>

      {/* Community Members */}
      <View style={styles.membersSection}>
        <Text style={styles.sectionTitle}>
          Community Members ({members.length})
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
          <View style={styles.membersList}>
            {members.map((member) => (
              <TouchableOpacity
                key={member.id}
                style={styles.memberCard}
                onPress={() => handleMemberPress(member)}
              >
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberInitials}>
                    {member.firstName?.[0]?.toUpperCase() || '?'}
                    {member.lastName?.[0]?.toUpperCase() || ''}
                  </Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>
                    {member.firstName} {member.lastName}
                  </Text>
                  <Text style={styles.memberRole}>
                    {member.role === 'MANAGER' ? 'Manager' : 'Member'}
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color="#9ca3af" />
              </TouchableOpacity>
            ))}
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
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  organizationName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 4,
  },
  division: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  goToProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 8,
  },
  goToProfileText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    marginRight: 4,
  },
  membersSection: {
    marginTop: 24,
    paddingHorizontal: 20,
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
});
