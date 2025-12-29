import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config/api';
import { useNavigation } from '@react-navigation/native';

interface Community {
  id: string;
  organization: string;
  division?: string;
  accountOwner?: string;
  managerEmail?: string;
  createdAt: string;
  manager?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  _count: {
    users: number;
    publishedProfiles: number;
  };
}

export default function AdminDashboardScreen() {
  const { auth } = useAuth();
  const { token } = auth;
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCommunities();
  }, []);

  const fetchCommunities = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/communities`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setCommunities(data.communities);
      } else {
        setError(data.error || 'Failed to load communities');
      }
    } catch (err) {
      console.error('Failed to fetch communities:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    fetchCommunities(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading communities...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Feather name="alert-circle" size={48} color="#ef4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchCommunities()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Admin Panel</Text>
        <Text style={styles.headerSubtitle}>{communities.length} {communities.length === 1 ? 'community' : 'communities'}</Text>
      </View>

      {/* Communities List */}
      <View style={styles.communitiesSection}>
        {communities.length > 0 ? (
          <View style={styles.communitiesList}>
            {communities.map((community) => (
              <TouchableOpacity
                key={community.id}
                style={styles.communityCard}
                onPress={() => navigation.navigate('EditCommunity' as never, { communityId: community.id } as never)}
                activeOpacity={0.7}
              >
                <View style={styles.communityHeader}>
                  <View style={styles.communityIconContainer}>
                    <Feather name="radio" size={24} color="#3b82f6" />
                  </View>
                  <View style={styles.communityInfo}>
                    <Text style={styles.communityName}>{community.organization}</Text>
                    {community.division && (
                      <Text style={styles.communityDivision}>{community.division}</Text>
                    )}
                  </View>
                </View>

                <View style={styles.communityDetails}>
                  {/* Registered Members Count */}
                  <View style={styles.detailRow}>
                    <Feather name="users" size={14} color="#6b7280" />
                    <Text style={styles.detailText}>
                      {community._count.users} registered {community._count.users === 1 ? 'member' : 'members'}
                    </Text>
                  </View>

                  {/* Published Profiles Count */}
                  <View style={styles.detailRow}>
                    <Feather name="check-circle" size={14} color="#10b981" />
                    <Text style={styles.detailText}>
                      {community._count.publishedProfiles} published {community._count.publishedProfiles === 1 ? 'profile' : 'profiles'}
                    </Text>
                  </View>

                  {/* Manager */}
                  <View style={styles.detailRow}>
                    <Feather name="user-check" size={14} color="#6b7280" />
                    <Text style={styles.detailText}>
                      {community.manager
                        ? `${community.manager.firstName || ''} ${community.manager.lastName || ''}`.trim() || community.manager.email
                        : 'No manager assigned'}
                    </Text>
                  </View>

                  {/* Created Date */}
                  <View style={styles.detailRow}>
                    <Feather name="calendar" size={14} color="#6b7280" />
                    <Text style={styles.detailText}>
                      Created {formatDate(community.createdAt)}
                    </Text>
                  </View>

                  {/* Account Owner */}
                  {community.accountOwner && (
                    <View style={styles.detailRow}>
                      <Feather name="briefcase" size={14} color="#6b7280" />
                      <Text style={styles.detailText}>{community.accountOwner}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Feather name="radio" size={48} color="#d1d5db" />
            <Text style={styles.emptyStateText}>No communities yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Create your first community to get started
            </Text>
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
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
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
  communitiesSection: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  communitiesList: {
    gap: 12,
  },
  communityCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  communityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  communityIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  communityInfo: {
    flex: 1,
  },
  communityName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  communityDivision: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  communityDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
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
