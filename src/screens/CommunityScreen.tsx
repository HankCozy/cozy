import React, { useState, useRef } from 'react';
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
import CircleBubbleChart, { CIRCLE_COLORS } from '../components/CircleBubbleChart';
import { API_BASE_URL } from '../config/api';

interface CircleOverview {
  id: string;
  name: string;
  shortName?: string;
  memberIds?: string[];
  count: number;
}

export default function CommunityScreen() {
  const navigation = useNavigation<any>();
  const { auth, logout } = useAuth();
  const { user, token } = auth;
  const [circles, setCircles] = useState<CircleOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profileStatus, setProfileStatus] = useState<'start' | 'draft' | 'sharing'>('start');
  const [smallCommunity, setSmallCommunity] = useState(false);
  const [showOverlap, setShowOverlap] = useState(false);

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
        const realCount = data.circles.filter((c: CircleOverview) => c.id !== 'all').length;
        setSmallCommunity(realCount === 0);
      }
    } catch (error) {
      console.error('Failed to fetch circles:', error);
    }
  };

  const determineProfileStatus = async () => {
    try {
      const profilePublishedStr = await AsyncStorage.getItem('profile_published');
      const isPublished = profilePublishedStr === 'true';
      setProfileStatus(isPublished ? 'sharing' : 'draft');
    } catch (error) {
      console.error('Error determining profile status:', error);
      setProfileStatus('start');
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      setLoading(true);
      determineProfileStatus();
      fetchCircles();

      setLoading(false);
    }, [token, user?.id])
  );

  const onRefresh = () => {
    setRefreshing(true);
    determineProfileStatus();
    fetchCircles();
    setRefreshing(false);
  };

  const handleCirclePress = (circle: CircleOverview) => {
    navigation.navigate('CircleDetail', { circleId: circle.id, circleName: circle.name });
  };

  const realCircles = circles.filter((c) => c.id !== 'all');
  const sortedRealCircles = [...realCircles].sort((a, b) => b.count - a.count);

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

        {/* Circles Section */}
        <View style={styles.circlesSection}>
          <Text style={styles.sectionTitle}>Your circles:</Text>

          {profileStatus !== 'sharing' ? (
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
            <View style={styles.smallCommunityContainer}>
              <Text style={styles.smallCommunityText}>
                More circles will appear as your community grows
              </Text>
            </View>
          ) : (
            <>
              <CircleBubbleChart
                key={realCircles.length}
                circles={realCircles}
                onPress={handleCirclePress}
                showOverlap={showOverlap}
              />
              <TouchableOpacity
                style={styles.overlapToggle}
                onPress={() => setShowOverlap((v) => !v)}
                activeOpacity={0.7}
              >
                <Text style={styles.overlapToggleText}>
                  {showOverlap ? 'Hide overlap' : 'Show overlap'}
                </Text>
              </TouchableOpacity>
              <View style={styles.circlesList}>
                {sortedRealCircles.map((circle, index) => {
                  const color = CIRCLE_COLORS[index % CIRCLE_COLORS.length];
                  return (
                    <TouchableOpacity
                      key={circle.id}
                      style={[
                        styles.circleListItem,
                        index < sortedRealCircles.length - 1 && styles.circleListItemBorder,
                      ]}
                      onPress={() => handleCirclePress(circle)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.circleListDot, { backgroundColor: color }]} />
                      <View style={styles.circleListInfo}>
                        <Text style={styles.circleListName}>{circle.name}</Text>
                        <Text style={styles.circleListCount}>
                          {circle.count} {circle.count === 1 ? 'member' : 'members'}
                        </Text>
                      </View>
                      <Feather name="chevron-right" size={16} color="#D1D5DB" />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}
        </View>

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
  overlapToggle: {
    alignSelf: 'center',
    marginBottom: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  overlapToggleText: {
    fontSize: 13,
    color: '#9ca3af',
  },
  circlesList: {
    marginTop: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  circleListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  circleListItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  circleListDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  circleListInfo: {
    flex: 1,
  },
  circleListName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  circleListCount: {
    fontSize: 13,
    color: '#6B7280',
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
});
