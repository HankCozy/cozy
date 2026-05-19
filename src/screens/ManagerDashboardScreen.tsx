import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config/api';

const COMMUNITY_INFO_LIMIT = 500;

interface MemberStat {
  id: string;
  name: string;
  email: string;
  profilePublished: boolean;
  questionsAnswered: number;
  completionPercentage: number;
  joinedDate: string;
}

interface Stats {
  totalMembers: number;
  publishedProfiles: number;
  averageCompletion: number;
  members: MemberStat[];
  communityInfo: string | null;
}

export default function ManagerDashboardScreen() {
  const { auth } = useAuth();
  const { token, user } = auth;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [communityInfo, setCommunityInfo] = useState('');
  const [communityInfoOriginal, setCommunityInfoOriginal] = useState('');
  const [savingInfo, setSavingInfo] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/manager/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
        const info = data.stats.communityInfo ?? '';
        setCommunityInfo(info);
        setCommunityInfoOriginal(info);
      } else {
        setError(data.error || 'Failed to load stats');
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    fetchStats(true);
  };

  const saveCommunityInfo = async () => {
    setSavingInfo(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/manager/community-info`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ communityInfo: communityInfo.trim() }),
      });
      const data = await response.json();
      if (data.success) {
        const saved = data.communityInfo ?? '';
        setCommunityInfo(saved);
        setCommunityInfoOriginal(saved);
      } else {
        Alert.alert('Error', data.error || 'Failed to save. Please try again.');
      }
    } catch {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setSavingInfo(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Feather name="alert-circle" size={48} color="#ef4444" />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF7E6' }}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Manager Dashboard</Text>
        <Text style={styles.headerSubtitle}>{user?.community?.organization || 'Your Community'}</Text>
      </View>

      {/* Community Info */}
      <View style={styles.communityInfoSection}>
        <Text style={styles.sectionTitle}>Community Info</Text>
        <Text style={styles.communityInfoHint}>
          This message appears at the top of the People tab for all members.
        </Text>
        <TextInput
          style={styles.communityInfoInput}
          value={communityInfo}
          onChangeText={text => setCommunityInfo(text.slice(0, COMMUNITY_INFO_LIMIT))}
          placeholder="Share updates, announcements, or a welcome note with your community…"
          placeholderTextColor="#BE9B51"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
        <View style={styles.communityInfoFooter}>
          <Text style={styles.charCount}>{communityInfo.length} / {COMMUNITY_INFO_LIMIT}</Text>
          <TouchableOpacity
            style={[
              styles.saveButton,
              (communityInfo === communityInfoOriginal || savingInfo) && styles.saveButtonDisabled
            ]}
            onPress={saveCommunityInfo}
            disabled={communityInfo === communityInfoOriginal || savingInfo}
            activeOpacity={0.8}
          >
            {savingInfo
              ? <ActivityIndicator size="small" color="white" />
              : <Text style={styles.saveButtonText}>Save</Text>
            }
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary Cards */}
      <View style={styles.summarySection}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryIconContainer}>
            <Feather name="users" size={24} color="#3b82f6" />
          </View>
          <Text style={styles.summaryValue}>{stats?.totalMembers || 0}</Text>
          <Text style={styles.summaryLabel}>Total Members</Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryIconContainer}>
            <Feather name="check-circle" size={24} color="#10B981" />
          </View>
          <Text style={styles.summaryValue}>{stats?.publishedProfiles || 0}</Text>
          <Text style={styles.summaryLabel}>Published</Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryIconContainer}>
            <Feather name="pie-chart" size={24} color="#F59E0B" />
          </View>
          <Text style={styles.summaryValue}>
            {stats?.averageCompletion || 0}%
          </Text>
          <Text style={styles.summaryLabel}>Avg Progress</Text>
        </View>
      </View>

      {/* Member Progress List */}
      <View style={styles.membersSection}>
        <Text style={styles.sectionTitle}>Member Progress</Text>

        {stats?.members && stats.members.length > 0 ? (
          <View style={styles.membersList}>
            {stats.members.map((member) => (
              <View key={member.id} style={styles.memberCard}>
                <View style={styles.memberInfo}>
                  <View style={styles.memberHeader}>
                    <Text style={styles.memberName}>{member.name}</Text>
                    {member.profilePublished && (
                      <View style={styles.publishedBadge}>
                        <Feather name="check-circle" size={12} color="#10B981" />
                        <Text style={styles.publishedText}>Published</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.memberEmail}>{member.email}</Text>

                  <View style={styles.progressSection}>
                    <View style={styles.progressInfo}>
                      <Text style={styles.progressText}>
                        {member.questionsAnswered}/4 questions answered
                      </Text>
                      <Text style={styles.progressPercentage}>
                        {member.completionPercentage}%
                      </Text>
                    </View>
                    <View style={styles.progressBarBackground}>
                      <View
                        style={[
                          styles.progressBarFill,
                          { width: `${member.completionPercentage}%` }
                        ]}
                      />
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Feather name="users" size={48} color="#d1d5db" />
            <Text style={styles.emptyStateText}>No members yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Share the invitation code to get members started!
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
    </SafeAreaView>
    </KeyboardAvoidingView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 24,
    backgroundColor: '#ffffff',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 4,
  },
  summarySection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  summaryIconContainer: {
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  communityInfoSection: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  communityInfoHint: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 10,
  },
  communityInfoInput: {
    backgroundColor: '#FFF7E6',
    borderWidth: 1,
    borderColor: '#E7E0D3',
    borderRadius: 20,
    padding: 14,
    fontSize: 15,
    color: '#545454',
    minHeight: 100,
    fontFamily: 'Futura',
  },
  communityInfoFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  charCount: {
    fontSize: 12,
    color: '#BE9B51',
  },
  saveButton: {
    backgroundColor: '#00934E',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 24,
    minWidth: 80,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Futura',
  },
  membersSection: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  membersList: {
    gap: 12,
  },
  memberCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  memberInfo: {
    flex: 1,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  publishedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  publishedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  memberEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  progressSection: {
    marginTop: 8,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressText: {
    fontSize: 13,
    color: '#6b7280',
  },
  progressPercentage: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3b82f6',
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 3,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9ca3af',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
