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
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
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

type RouteParams = {
  CircleDetail: {
    circleId: string;
    circleName: string;
  };
};

export default function CircleDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'CircleDetail'>>();
  const { circleId, circleName } = route.params;
  const { auth, logout } = useAuth();
  const { user, token } = auth;
  const [circle, setCircle] = useState<Circle | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  useEffect(() => {
    fetchCircleDetails();
  }, [circleId, token]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCircleDetails();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Feather name="chevron-left" size={24} color="#545454" />
          </TouchableOpacity>
        </View>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#00934E" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={24} color="#545454" />
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
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00934E" />
        }
      >
        {circle?.members.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="users" size={48} color="#E7E0D3" />
            <Text style={styles.emptyStateText}>No members in this circle yet</Text>
          </View>
        ) : (
          <View style={styles.membersList}>
            {circle?.members.map((member) => (
              <TouchableOpacity
                key={member.userId}
                style={styles.memberCard}
                onPress={() => navigation.navigate('MemberProfile', { userId: member.userId })}
                activeOpacity={0.7}
              >
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberInitials}>
                    {member.firstName?.[0]?.toUpperCase() || ''}
                    {member.lastName?.[0]?.toUpperCase() || ''}
                  </Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>
                    {member.firstName} {member.lastName}
                  </Text>
                  {member.tagline ? (
                    <Text style={styles.memberTagline} numberOfLines={1}>{member.tagline}</Text>
                  ) : null}
                </View>
                <Feather name="chevron-right" size={20} color="#BE9B51" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF7E6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E7E0D3',
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: 'Futura',
    color: '#BE9B51',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Futura',
    color: '#00934E',
  },
  memberCountBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E7E0D3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberCountText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Futura',
    color: '#545454',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  membersList: {
    gap: 12,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 20,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  memberInitials: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'Futura',
    color: '#00934E',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Futura',
    color: '#545454',
    marginBottom: 3,
  },
  memberTagline: {
    fontSize: 13,
    fontFamily: 'Futura',
    color: '#BE9B51',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    gap: 16,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'Futura',
    color: '#BE9B51',
    textAlign: 'center',
  },
});
