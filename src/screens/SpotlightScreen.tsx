import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import ResponseCard from '../components/ResponseCard';
import { API_BASE_URL } from '../config/api';

const SPOTLIGHT_SEEN_KEY = 'spotlight_seen_ids';
const MAX_SEEN = 8;

interface SpotlightMatch {
  userId: string;
  firstName: string;
  lastName: string;
  profileSummary: string | null;
  profilePictureUrl: string | null;
  matchScore: number;
  sharedInterests: string[];
  icebreakerQuestions: string[];
}

function extractHeadline(summary: string | null): string {
  if (!summary) return '';
  const sentences = summary.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 10);
  return sentences[0]?.trim() || '';
}

export default function SpotlightScreen() {
  const navigation = useNavigation<any>();
  const { auth } = useAuth();
  const { token } = auth;
  const [spotlightMatch, setSpotlightMatch] = useState<SpotlightMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [profilePublished, setProfilePublished] = useState(false);
  const fetchedRef = useRef(false);

  const fetchSpotlight = async () => {
    setLoading(true);
    try {
      const seenJson = await AsyncStorage.getItem(SPOTLIGHT_SEEN_KEY);
      const seenIds: string[] = seenJson ? JSON.parse(seenJson) : [];
      const excludeParam = seenIds.length > 0 ? `?exclude=${seenIds.join(',')}` : '';

      const response = await fetch(`${API_BASE_URL}/api/communities/icebreaker${excludeParam}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.match) {
          setSpotlightMatch(data.match);

          const newSeen = seenIds.filter((id) => id !== data.match.userId);
          newSeen.push(data.match.userId);
          if (newSeen.length > MAX_SEEN) newSeen.splice(0, newSeen.length - MAX_SEEN);
          await AsyncStorage.setItem(SPOTLIGHT_SEEN_KEY, JSON.stringify(newSeen));
        } else {
          setSpotlightMatch(null);
        }
      }
    } catch (error) {
      console.error('Failed to fetch spotlight:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      const init = async () => {
        const publishedStr = await AsyncStorage.getItem('profile_published');
        const published = publishedStr === 'true';
        setProfilePublished(published);

        if (published && !fetchedRef.current) {
          fetchedRef.current = true;
          fetchSpotlight();
        } else if (!published) {
          setLoading(false);
        }
      };
      init();
    }, [token])
  );

  const handleMeetSomeoneNew = () => {
    setSpotlightMatch(null);
    fetchSpotlight();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Member spotlight</Text>
        </View>

        {!profilePublished ? (
          <View style={styles.lockedContainer}>
            <Feather name="lock" size={32} color="#6B7280" />
            <Text style={styles.lockText}>Share your profile to unlock member spotlight</Text>
          </View>
        ) : loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#3b82f6" />
            <Text style={styles.loadingText}>Finding someone to meet...</Text>
          </View>
        ) : spotlightMatch ? (
          <>
            <ResponseCard
              firstName={spotlightMatch.firstName}
              lastName={spotlightMatch.lastName}
              profilePictureUrl={spotlightMatch.profilePictureUrl}
              headline={extractHeadline(spotlightMatch.profileSummary)}
              tags={spotlightMatch.sharedInterests}
              icebreakerQuestions={spotlightMatch.icebreakerQuestions}
              onViewProfile={() =>
                navigation.navigate('MemberProfile', { userId: spotlightMatch.userId })
              }
            />
            <TouchableOpacity style={styles.meetNewButton} onPress={handleMeetSomeoneNew} activeOpacity={0.7}>
              <Feather name="refresh-cw" size={14} color="#3b82f6" />
              <Text style={styles.meetNewText}>Meet someone new</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.noMatchContainer}>
            <Feather name="users" size={32} color="#D1D5DB" />
            <Text style={styles.noMatchText}>
              No matches yet. Complete more of your profile to find connections!
            </Text>
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
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  lockedContainer: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 16,
  },
  lockText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  meetNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
  },
  meetNewText: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '500',
  },
  noMatchContainer: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 8,
  },
  noMatchText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
