import React, { useState, useEffect } from 'react';
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
  Modal,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import ResponseCard from '../components/ResponseCard';
import { API_BASE_URL } from '../config/api';

interface CircleMember {
  userId: string;
  firstName: string;
  lastName: string;
  tagline: string;
}

interface Circle {
  id: string;
  name: string;
  members: CircleMember[];
}

interface MemberDetail {
  profileSummary: string | null;
  profilePictureUrl: string | null;
}

type RouteParams = {
  CircleDetail: {
    circleId: string;
    circleName: string;
  };
};

function extractHeadline(summary: string | null, fallback: string): string {
  if (!summary) return fallback;
  const sentences = summary.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 10);
  return sentences[0]?.trim() || fallback;
}

export default function CircleDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'CircleDetail'>>();
  const { circleId, circleName } = route.params;
  const { auth, logout } = useAuth();
  const { user, token } = auth;
  const [circle, setCircle] = useState<Circle | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Member card modal state
  const [selectedMember, setSelectedMember] = useState<CircleMember | null>(null);
  const [memberDetail, setMemberDetail] = useState<MemberDetail | null>(null);
  const [loadingMemberCard, setLoadingMemberCard] = useState(false);

  const fetchCircleDetails = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/communities/circles/${circleId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401 || response.status === 403) {
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please login again.',
          [{ text: 'OK', onPress: () => logout() }]
        );
        return;
      }

      const data = await response.json();
      if (data.success) {
        setCircle(data.circle);
      }
    } catch (error) {
      console.error('Failed to fetch circle details:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchMemberDetail = async (userId: string) => {
    setLoadingMemberCard(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/communities/members/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setMemberDetail({
            profileSummary: data.user.profileSummary ?? null,
            profilePictureUrl: data.user.profilePictureUrl ?? null,
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch member detail:', error);
    } finally {
      setLoadingMemberCard(false);
    }
  };

  useEffect(() => {
    fetchCircleDetails();
  }, [circleId, token]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCircleDetails();
  };

  const handleMemberPress = (member: CircleMember) => {
    setSelectedMember(member);
    setMemberDetail(null);
    fetchMemberDetail(member.userId);
  };

  const handleCloseModal = () => {
    setSelectedMember(null);
    setMemberDetail(null);
  };

  const handleViewFullProfile = () => {
    if (!selectedMember) return;
    const userId = selectedMember.userId;
    handleCloseModal();
    navigation.navigate('MemberProfile', { userId });
  };

  const handleBack = () => {
    navigation.goBack();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading circle...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Feather name="chevron-left" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerSubtitle}>{user?.community?.organization}</Text>
          <Text style={styles.headerTitle}>{circleName}</Text>
        </View>
        <View style={styles.memberCountBadge}>
          <Text style={styles.memberCountText}>{circle?.members.length || 0}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Members List */}
        {circle?.members.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="users" size={48} color="#d1d5db" />
            <Text style={styles.emptyStateText}>No members in this circle</Text>
          </View>
        ) : (
          <View style={styles.membersList}>
            {circle?.members.map((member) => (
              <TouchableOpacity
                key={member.userId}
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
                  <Text style={styles.memberTagline}>{member.tagline}</Text>
                </View>
                <Feather name="chevron-right" size={20} color="#9ca3af" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Member Card Modal */}
      <Modal
        visible={selectedMember !== null}
        transparent
        animationType="slide"
        onRequestClose={handleCloseModal}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleCloseModal}
        >
          <TouchableOpacity
            style={styles.modalSheet}
            activeOpacity={1}
            onPress={() => {}}
          >
            {/* Drag handle */}
            <View style={styles.dragHandle} />

            {loadingMemberCard ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color="#3b82f6" />
              </View>
            ) : selectedMember ? (
              <ResponseCard
                firstName={selectedMember.firstName}
                lastName={selectedMember.lastName}
                profilePictureUrl={memberDetail?.profilePictureUrl ?? null}
                headline={extractHeadline(memberDetail?.profileSummary ?? null, selectedMember.tagline)}
                tags={[]}
                onViewProfile={handleViewFullProfile}
              />
            ) : null}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
    paddingBottom: 40,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  memberCountBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberCountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400E',
  },
  membersList: {
    paddingHorizontal: 20,
    paddingTop: 16,
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
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberInitials: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#92400E',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  memberTagline: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#f9fafb',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#d1d5db',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 4,
  },
  modalLoading: {
    paddingVertical: 40,
    alignItems: 'center',
  },
});
