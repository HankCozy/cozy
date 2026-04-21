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
  const [totalAnswers, setTotalAnswers] = useState(0);
  const [smallCommunity, setSmallCommunity] = useState(false);
  const [eligibleCount, setEligibleCount] = useState(0);
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
        if (data.insufficientMembers) {
          setSmallCommunity(true);
          setEligibleCount(data.eligibleCount ?? 0);
        } else {
          setCircles(data.circles);
          setSmallCommunity(false);
          setEligibleCount(data.eligibleCount ?? data.circles.reduce((sum: number, c: CircleOverview) => sum + c.count, 0));
        }
      }
    } catch (error) {
      console.error('Failed to fetch circles:', error);
    }
  };

  const loadAnswerCount = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const count = keys.filter((k) => k.startsWith('answer_')).length;
      setTotalAnswers(count);
    } catch (error) {
      console.error('Error loading answer count:', error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      const init = async () => {
        setLoading(true);
        await loadAnswerCount();
        await fetchCircles();
        setLoading(false);
      };
      init();
    }, [token, user?.id])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnswerCount();
    await fetchCircles();
    setRefreshing(false);
  };

  const handleCirclePress = (circle: CircleOverview) => {
    navigation.navigate('CircleDetail', { circleId: circle.id, circleName: circle.name });
  };

  const realCircles = circles.filter((c) => c.id !== 'all');
  const sortedRealCircles = [...realCircles].sort((a, b) => b.count - a.count);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerSubtitle}>You belong to:</Text>
          <Text style={styles.headerTitle}>{user?.community?.organization}</Text>
        </View>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#0277BB" />
        </View>
      </SafeAreaView>
    );
  }

  if (totalAnswers < 6 && !user?.profilePublished) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerSubtitle}>You belong to:</Text>
          <Text style={styles.headerTitle}>{user?.community?.organization}</Text>
        </View>
        <View style={styles.centerState}>
          <View style={styles.lockContent}>
            <Feather name="lock" size={32} color="#BE9B51" />
            <Text style={styles.lockText}>
              Answer {6 - totalAnswers} more questions to unlock your circles
            </Text>
          </View>
        </View>
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
          <Text style={styles.headerSubtitle}>You belong to:</Text>
          <Text style={styles.headerTitle}>{user?.community?.organization}</Text>
        </View>

        {/* Circles Section */}
        <View style={styles.circlesSection}>
            <Text style={styles.sectionTitle}>Your circles:</Text>

            {smallCommunity ? (
              <View style={styles.smallCommunityContainer}>
                <Text style={styles.smallCommunityText}>
                  Circles unlock when 5 members complete their profiles.
                </Text>
                <Text style={styles.smallCommunitySubtext}>
                  {eligibleCount} of 5 members ready.
                </Text>
              </View>
            ) : sortedRealCircles.length === 0 ? (
              <View style={styles.smallCommunityContainer}>
                <Text style={styles.smallCommunityText}>
                  Your circles are being set up.
                </Text>
                <Text style={styles.smallCommunitySubtext}>
                  Pull down to refresh.
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
    backgroundColor: '#FFF7E6',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFF7E6',
  },
  contentContainer: {
    paddingBottom: 120,
  },
  header: {
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 16,
    alignItems: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    fontFamily: 'Futura',
    fontWeight: '400',
    color: '#545454',
    marginBottom: 4,
    textAlign: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Futura',
    color: '#0277BB',
    textAlign: 'center',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  lockContent: {
    alignItems: 'center',
    gap: 16,
    marginTop: 120,
  },
  circlesSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Futura',
    color: '#545454',
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
    fontFamily: 'Futura',
    color: '#BE9B51',
  },
  circlesList: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E7E0D3',
    overflow: 'hidden',
  },
  circleListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  circleListItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#E7E0D3',
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
    fontFamily: 'Futura',
    color: '#545454',
    marginBottom: 2,
  },
  circleListCount: {
    fontSize: 13,
    fontFamily: 'Futura',
    color: '#BE9B51',
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
    backgroundColor: '#E7E0D3',
    padding: 16,
    borderRadius: 20,
  },
  circleCountPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#BE9B51',
    marginBottom: 8,
  },
  circleNamePlaceholder: {
    width: 60,
    height: 14,
    borderRadius: 4,
    backgroundColor: '#BE9B51',
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 247, 230, 0.85)',
  },
  lockText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#545454',
    textAlign: 'center',
  },
  smallCommunityContainer: {
    alignItems: 'center',
  },
  smallCommunityText: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Futura',
    color: '#545454',
    textAlign: 'center',
  },
  smallCommunitySubtext: {
    marginTop: 6,
    fontSize: 13,
    fontFamily: 'Futura',
    color: '#BE9B51',
    textAlign: 'center',
  },
});
