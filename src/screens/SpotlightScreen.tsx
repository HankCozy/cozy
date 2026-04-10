import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import ProfileBadge from '../components/ProfileBadge';
import { getProfilePictureUrl } from '../services/api';
import { API_BASE_URL } from '../config/api';

const SEEN_KEY = 'intersections_seen_ids';
const MAX_SEEN = 8;
const SHORT_BIO_WORDS = 55;

const TAG_PALETTE = [
  { bg: '#00934E', text: 'white' },
  { bg: '#FFA0A6', text: 'white' },
  { bg: '#FAC63D', text: '#545454' },
  { bg: '#FE6627', text: 'white' },
  { bg: '#E7E0D3', text: '#545454' },
];

function stripIcebreakerQuestions(summary: string): string {
  const patterns = [
    /---\s*\*?\*?Icebreaker Questions/i,
    /\*\*Icebreaker Questions/i,
    /---/,
  ];
  for (const pattern of patterns) {
    const match = summary.match(pattern);
    if (match && match.index !== undefined) {
      return summary.substring(0, match.index).trim();
    }
  }
  return summary;
}

function parseIcebreakerQuestions(summary: string): string[] {
  const separators = [
    /---\s*\*?\*?Icebreaker Questions[:\s]*/i,
    /\*\*Icebreaker Questions\*\*[:\s]*/i,
    /---/,
  ];
  let section = '';
  for (const pattern of separators) {
    const match = summary.match(pattern);
    if (match && match.index !== undefined) {
      section = summary.substring(match.index + match[0].length);
      break;
    }
  }
  if (!section) return [];
  const lines = section.split('\n').map(l => l.trim()).filter(Boolean);
  const questions: string[] = [];
  for (const line of lines) {
    const cleaned = line.replace(/^\d+\.\s*/, '').replace(/^\*\*|\*\*$/g, '').trim();
    if (cleaned.length > 10) {
      questions.push(cleaned);
      if (questions.length >= 3) break;
    }
  }
  return questions;
}

interface IntersectionsMatch {
  userId: string;
  firstName: string;
  lastName: string;
  profileSummary: string | null;
  profilePictureUrl: string | null;
  profileInterests: string[];
  sharedTraits: string[];
  icebreakerQuestions: string[];
  quoteText: string | null;
  quoteQuestion: string | null;
}

export default function SpotlightScreen() {
  const { auth } = useAuth();
  const orgName = auth.user?.community?.organization || 'your community';
  const { token } = auth;

  const [match, setMatch] = useState<IntersectionsMatch | null>(null);
  const [signedPictureUrl, setSignedPictureUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalAnswers, setTotalAnswers] = useState(0);
  const [insufficientMembers, setInsufficientMembers] = useState(false);
  const [eligibleCount, setEligibleCount] = useState(0);
  const [bioExpanded, setBioExpanded] = useState(false);

  const fetchMatch = useCallback(async () => {
    try {
      const seenJson = await AsyncStorage.getItem(SEEN_KEY);
      const seenIds: string[] = seenJson ? JSON.parse(seenJson) : [];
      const excludeParam = seenIds.length > 0 ? `?exclude=${seenIds.join(',')}` : '';

      const response = await fetch(`${API_BASE_URL}/api/communities/icebreaker${excludeParam}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });

      if (!response.ok) return;

      const data = await response.json();

      if (data.insufficientMembers) {
        setInsufficientMembers(true);
        setEligibleCount(data.eligibleCount ?? 0);
        return;
      }

      if (data.success && data.match) {
        setMatch({
            ...data.match,
            sharedTraits: data.match.sharedTraits ?? data.match.sharedInterests ?? [],
            profileInterests: data.match.profileInterests ?? [],
            quoteText: data.match.quoteText ?? null,
            quoteQuestion: data.match.quoteQuestion ?? null,
          });
        setBioExpanded(false);

        // Update seen list
        const newSeen = seenIds.filter((id: string) => id !== data.match.userId);
        newSeen.push(data.match.userId);
        if (newSeen.length > MAX_SEEN) newSeen.splice(0, newSeen.length - MAX_SEEN);
        await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(newSeen));

        // Fetch signed profile picture URL
        if (token) {
          getProfilePictureUrl(data.match.userId, token)
            .then(url => setSignedPictureUrl(url))
            .catch(() => setSignedPictureUrl(null));
        }
      } else {
        setMatch(null);
      }
    } catch (error) {
      console.error('Failed to fetch intersection match:', error);
    }
  }, [token]);

  // Reload every time the tab is focused
  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        setLoading(true);
        setMatch(null);
        setSignedPictureUrl(null);
        setInsufficientMembers(false);

        const keys = await AsyncStorage.getAllKeys();
        const count = keys.filter((k) => k.startsWith('answer_')).length;
        setTotalAnswers(count);

        if (count >= 4 || auth.user?.profilePublished) {
          await fetchMatch();
        }
        setLoading(false);
      };
      init();
    }, [fetchMatch])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    setMatch(null);
    setSignedPictureUrl(null);
    await fetchMatch();
    setRefreshing(false);
  };

  // Derived display values
  const bioText = match?.profileSummary ? stripIcebreakerQuestions(match.profileSummary) : null;
  const icebreakerQuestions = match?.profileSummary
    ? parseIcebreakerQuestions(match.profileSummary)
    : match?.icebreakerQuestions ?? [];
  const displayIcebreakers = icebreakerQuestions.length > 0
    ? icebreakerQuestions
    : match?.icebreakerQuestions ?? [];

  // Quote from API (real answer) or fallback to first bio sentence
  const quoteText = match?.quoteText
    ?? bioText?.split(/(?<=[.!?])\s+/).find(s => s.trim().length > 30)
    ?? null;
  const quoteQuestion = match?.quoteQuestion ?? null;

  // Merge sharedTraits + profileInterests for the tag row (deduplicated)
  const allTags = [...new Set([...(match?.sharedTraits ?? []), ...(match?.profileInterests ?? [])])].slice(0, 6);

  const firstName = match?.firstName || '';
  const fullName = [match?.firstName, match?.lastName].filter(Boolean).join(' ');

  const Header = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Intersections</Text>
      <Text style={styles.subtitle}>
        Points of collision and connection across {orgName}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#00934E" />
        </View>
      </SafeAreaView>
    );
  }

  if (totalAnswers < 4 && !auth.user?.profilePublished) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <View style={styles.centerState}>
          <Feather name="lock" size={32} color="#BE9B51" />
          <Text style={styles.stateText}>
            Answer {4 - totalAnswers} more question{4 - totalAnswers === 1 ? '' : 's'} to unlock Intersections
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (insufficientMembers) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <View style={styles.centerState}>
          <Feather name="users" size={32} color="#BE9B51" />
          <Text style={styles.stateText}>Intersections unlocks when 5 members complete their profiles.</Text>
          <Text style={styles.stateSubtext}>{eligibleCount} of 5 members ready.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#00934E"
          />
        }
      >
        {!match ? (
          <View style={styles.centerState}>
            <Feather name="users" size={32} color="#BE9B51" />
            <Text style={styles.stateText}>No matches found. Pull down to try again.</Text>
          </View>
        ) : (
          <>
            {/* Floating avatar */}
            <View style={styles.profileBadgeFloat}>
              <ProfileBadge
                firstName={match.firstName}
                lastName={match.lastName}
                totalAnswers={4}
                profilePictureUrl={signedPictureUrl}
                size={80}
              />
            </View>

            {/* Profile card */}
            <View style={styles.profileCard}>
              <Text style={styles.profileName}>{fullName}</Text>

              {/* Interest + trait tags */}
              {allTags.length > 0 && (
                <View style={styles.tagsRow}>
                  {allTags.map((tag, i) => {
                    const palette = TAG_PALETTE[i % TAG_PALETTE.length];
                    return (
                      <View key={i} style={[styles.tag, { backgroundColor: palette.bg }]}>
                        <Text style={[styles.tagText, { color: palette.text }]}>
                          {tag.charAt(0).toUpperCase() + tag.slice(1)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Bio */}
              {bioText ? (() => {
                const words = bioText.split(/\s+/);
                const isTruncated = words.length > SHORT_BIO_WORDS;
                const displayText = (!bioExpanded && isTruncated)
                  ? words.slice(0, SHORT_BIO_WORDS).join(' ') + '...'
                  : bioText;
                return (
                  <>
                    <Text style={styles.bioText}>{displayText}</Text>
                    {isTruncated && (
                      <TouchableOpacity style={styles.expandLink} onPress={() => setBioExpanded(!bioExpanded)}>
                        <Text style={styles.expandLinkText}>
                          {bioExpanded ? 'Show less' : 'Show full bio ✦'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </>
                );
              })() : null}
            </View>

            {/* Quote card */}
            {quoteText && (
              <View style={styles.quoteCard}>
                {quoteQuestion && <Text style={styles.quoteQuestion}>{quoteQuestion}</Text>}
                <Text style={styles.quoteText}>"{quoteText}"</Text>
              </View>
            )}

            {/* Icebreaker card */}
            {displayIcebreakers.length > 0 && (
              <View style={styles.icebreakerCard}>
                <Text style={styles.icebreakerLabel}>
                  Ask {firstName || 'them'}:
                </Text>
                {displayIcebreakers.map((q, i) => (
                  <Text key={i} style={styles.icebreakerQuestion}>{q}</Text>
                ))}
              </View>
            )}

            {/* Next match */}
            <TouchableOpacity style={styles.nextLink} onPress={handleRefresh} activeOpacity={0.7}>
              <Text style={styles.nextLinkText}>Show me someone new</Text>
            </TouchableOpacity>

            <View style={styles.bottomSpacer} />
          </>
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
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: 'Futura',
    color: '#00934E',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Futura',
    color: '#545454',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 32,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 16,
    paddingHorizontal: 32,
  },
  stateText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#545454',
    textAlign: 'center',
  },
  stateSubtext: {
    fontSize: 13,
    color: '#BE9B51',
    textAlign: 'center',
  },
  // Avatar float
  profileBadgeFloat: {
    alignSelf: 'flex-start',
    marginLeft: 20,
    marginBottom: -56,
    zIndex: 10,
  },
  // Profile card
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    paddingTop: 68,
    paddingHorizontal: 20,
    paddingBottom: 20,
    marginBottom: 16,
  },
  profileName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#545454',
    marginBottom: 10,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 6,
    rowGap: 8,
    marginBottom: 14,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
  },
  bioText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#545454',
    marginBottom: 8,
  },
  expandLink: {
    marginTop: 2,
  },
  expandLinkText: {
    fontSize: 14,
    color: '#545454',
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  // Quote card
  quoteCard: {
    backgroundColor: '#E8F5EE',
    borderRadius: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#00934E',
    padding: 24,
    marginBottom: 16,
  },
  quoteQuestion: {
    fontSize: 14,
    color: '#545454',
    fontStyle: 'italic',
    fontFamily: 'Futura',
    marginBottom: 12,
    lineHeight: 20,
  },
  quoteText: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'Futura',
    color: '#00934E',
    lineHeight: 30,
  },
  // Icebreaker card
  icebreakerCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#0277BB',
    padding: 22,
    marginBottom: 24,
  },
  icebreakerLabel: {
    fontSize: 14,
    color: '#545454',
    fontStyle: 'italic',
    fontFamily: 'Futura',
    marginBottom: 14,
    fontWeight: '500',
  },
  icebreakerQuestion: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Futura',
    color: '#0277BB',
    lineHeight: 24,
    marginBottom: 12,
  },
  // Next match
  nextLink: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  nextLinkText: {
    fontSize: 14,
    color: '#545454',
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  bottomSpacer: {
    height: 32,
  },
});
