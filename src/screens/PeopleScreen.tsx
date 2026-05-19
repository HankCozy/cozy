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
const MAX_SEEN = 40;
const SHORT_BIO_WORDS = 55;
const NEW_MEMBER_DAYS = 30;

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

function extractHeadline(summary: string | null): string {
  if (!summary) return '';
  const stripped = stripIcebreakerQuestions(summary);
  const firstSentence = stripped.split(/(?<=[.!?])\s+/)[0] ?? stripped;
  return firstSentence.trim();
}

function isNewMember(createdAt: string): boolean {
  const joined = new Date(createdAt).getTime();
  const cutoff = Date.now() - NEW_MEMBER_DAYS * 24 * 60 * 60 * 1000;
  return joined > cutoff;
}

interface CommunityMember {
  id: string;
  firstName: string | null;
  lastName: string | null;
  profileSummary: string | null;
  profileInterests: string[];
  profilePictureUrl: string | null;
  createdAt: string;
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

export default function PeopleScreen({ navigation }: any) {
  const { auth } = useAuth();
  const { token, user } = auth;

  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [communityInfo, setCommunityInfo] = useState<string | null>(null);
  const [match, setMatch] = useState<IntersectionsMatch | null>(null);
  const [signedPictureUrl, setSignedPictureUrl] = useState<string | null>(null);
  const [membersLoading, setMembersLoading] = useState(true);
  const [matchLoading, setMatchLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalAnswers, setTotalAnswers] = useState(0);
  const [insufficientMembers, setInsufficientMembers] = useState(false);
  const [eligibleCount, setEligibleCount] = useState(0);
  const [bioExpanded, setBioExpanded] = useState(false);

  const isEligible = totalAnswers >= 6 || !!user?.profilePublished;

  const fetchMembers = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/communities/members`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setMembers(data.members ?? []);
        setCommunityInfo(data.communityInfo ?? null);
      }
    } catch (error) {
      console.error('Failed to fetch community members:', error);
    } finally {
      setMembersLoading(false);
    }
  }, [token]);

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

        const newSeen = seenIds.filter((id: string) => id !== data.match.userId);
        newSeen.push(data.match.userId);
        if (newSeen.length > MAX_SEEN) newSeen.splice(0, newSeen.length - MAX_SEEN);
        await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(newSeen));

        if (token) {
          getProfilePictureUrl(data.match.userId, token)
            .then(url => setSignedPictureUrl(url))
            .catch(() => setSignedPictureUrl(null));
        }
      } else {
        setMatch(null);
      }
    } catch (error) {
      console.error('Failed to fetch match:', error);
    } finally {
      setMatchLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        setMembersLoading(true);
        setMatchLoading(true);
        setMatch(null);
        setSignedPictureUrl(null);
        setInsufficientMembers(false);

        const keys = await AsyncStorage.getAllKeys();
        const count = keys.filter(k => k.startsWith('answer_')).length;
        setTotalAnswers(count);

        fetchMembers();
        if (count >= 6 || user?.profilePublished) {
          fetchMatch();
        } else {
          setMatchLoading(false);
        }
      };
      init();
    }, [fetchMembers, fetchMatch])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    setMatch(null);
    setSignedPictureUrl(null);
    await Promise.all([fetchMembers(), fetchMatch()]);
    setRefreshing(false);
  };

  const handleNewMatch = async () => {
    setMatch(null);
    setSignedPictureUrl(null);
    setMatchLoading(true);
    await fetchMatch();
  };

  // Match-derived display values
  const bioText = match?.profileSummary ? stripIcebreakerQuestions(match.profileSummary) : null;
  const icebreakerQuestions = match?.profileSummary
    ? parseIcebreakerQuestions(match.profileSummary)
    : match?.icebreakerQuestions ?? [];
  const displayIcebreakers = icebreakerQuestions.length > 0 ? icebreakerQuestions : match?.icebreakerQuestions ?? [];
  const quoteText = match?.quoteText ?? bioText?.split(/(?<=[.!?])\s+/).find(s => s.trim().length > 30) ?? null;
  const quoteQuestion = match?.quoteQuestion ?? null;
  const allTags = [...new Set([...(match?.sharedTraits ?? []), ...(match?.profileInterests ?? [])])].slice(0, 6);
  const matchFirstName = match?.firstName || '';
  const matchFullName = [match?.firstName, match?.lastName].filter(Boolean).join(' ');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#00934E" />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerSubtitle}>You belong to:</Text>
          <Text style={styles.headerTitle}>{user?.community?.organization}</Text>
        </View>

        {/* Community Info */}
        {communityInfo ? (
          <View style={styles.communityInfoCard}>
            <View style={styles.communityInfoHeader}>
              <Feather name="bell" size={16} color="#FFA0A6" />
              <Text style={styles.communityInfoLabel}>From your community</Text>
            </View>
            <Text style={styles.communityInfoText}>{communityInfo}</Text>
          </View>
        ) : null}

        {/* Gate: incomplete profile */}
        {!isEligible ? (
          <View style={styles.gateCard}>
            <Feather name="lock" size={28} color="#BE9B51" />
            <Text style={styles.gateText}>
              Answer {6 - totalAnswers} more question{6 - totalAnswers !== 1 ? 's' : ''} to unlock the directory and your match
            </Text>
          </View>
        ) : (
          <>
            {/* Members Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Members</Text>
              {!membersLoading && (
                <Text style={styles.sectionCount}>{members.length}</Text>
              )}
            </View>

            {membersLoading ? (
              <ActivityIndicator size="small" color="#00934E" style={styles.sectionLoader} />
            ) : members.length === 0 ? (
              <View style={styles.emptySection}>
                <Text style={styles.emptySectionText}>No published profiles yet.</Text>
              </View>
            ) : (
              <View style={styles.membersList}>
                {members.map((member, index) => {
                  const initials = [member.firstName?.[0], member.lastName?.[0]].filter(Boolean).join('').toUpperCase() || '?';
                  const fullName = [member.firstName, member.lastName].filter(Boolean).join(' ');
                  const headline = extractHeadline(member.profileSummary);
                  const newMember = isNewMember(member.createdAt);
                  const isLast = index === members.length - 1;
                  return (
                    <TouchableOpacity
                      key={member.id}
                      style={[styles.memberRow, isLast && styles.memberRowLast]}
                      onPress={() => navigation.navigate('MemberProfile', { userId: member.id })}
                      activeOpacity={0.7}
                    >
                      <View style={styles.memberAvatar}>
                        <Text style={styles.memberAvatarText}>{initials}</Text>
                      </View>
                      <View style={styles.memberInfo}>
                        <View style={styles.memberNameRow}>
                          <Text style={styles.memberName}>{fullName}</Text>
                          {newMember && (
                            <View style={styles.newBadge}>
                              <Text style={styles.newBadgeText}>New</Text>
                            </View>
                          )}
                        </View>
                        {headline ? (
                          <Text style={styles.memberHeadline} numberOfLines={1}>{headline}</Text>
                        ) : null}
                      </View>
                      <Feather name="chevron-right" size={16} color="#E7E0D3" />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Your Match Section */}
            <Text style={[styles.sectionLabel, styles.matchSectionLabel]}>Your Match</Text>

            {matchLoading ? (
              <ActivityIndicator size="small" color="#00934E" style={styles.sectionLoader} />
            ) : insufficientMembers ? (
              <View style={styles.emptySection}>
                <Feather name="users" size={24} color="#BE9B51" />
                <Text style={styles.emptySectionText}>Matches unlock when 5 members complete their profiles.</Text>
                <Text style={styles.emptySectionSubtext}>{eligibleCount} of 5 members ready.</Text>
              </View>
            ) : !match ? (
              <View style={styles.emptySection}>
                <Text style={styles.emptySectionText}>No matches found. Pull down to try again.</Text>
              </View>
            ) : (
              <>
                <View style={styles.profileBadgeFloat}>
                  <ProfileBadge
                    firstName={match.firstName}
                    lastName={match.lastName}
                    totalAnswers={4}
                    profilePictureUrl={signedPictureUrl}
                    size={80}
                  />
                </View>

                <View style={styles.profileCard}>
                  <Text style={styles.profileName}>{matchFullName}</Text>

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

                {quoteText && (
                  <View style={styles.quoteCard}>
                    {quoteQuestion && <Text style={styles.quoteQuestion}>{quoteQuestion}</Text>}
                    <Text style={styles.quoteText}>"{quoteText}"</Text>
                  </View>
                )}

                {displayIcebreakers.length > 0 && (
                  <View style={styles.icebreakerCard}>
                    <Text style={styles.icebreakerLabel}>Ask {matchFirstName || 'them'}:</Text>
                    {displayIcebreakers.map((q, i) => (
                      <Text key={i} style={styles.icebreakerQuestion}>{q}</Text>
                    ))}
                  </View>
                )}

                <TouchableOpacity style={styles.nextLink} onPress={handleNewMatch} activeOpacity={0.7}>
                  <Text style={styles.nextLinkText}>Show me someone new</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}

        {/* Your Circles */}
        <TouchableOpacity
          style={styles.circlesCard}
          onPress={() => navigation.navigate('Community')}
          activeOpacity={0.8}
        >
          <View style={styles.circlesCardRow}>
            <Feather name="radio" size={20} color="#0277BB" />
            <Text style={styles.circlesCardTitle}>Your Circles</Text>
            <Feather name="chevron-right" size={18} color="#0277BB" />
          </View>
          <Text style={styles.circlesCardSubtitle}>See your interest groups and who's in them</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF7E6',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  // Header
  header: {
    paddingHorizontal: 8,
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
  // Community Info card
  communityInfoCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  communityInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  communityInfoLabel: {
    fontSize: 13,
    color: '#BE9B51',
    fontFamily: 'Futura',
    fontWeight: '500',
  },
  communityInfoText: {
    fontSize: 16,
    color: '#545454',
    fontFamily: 'Futura',
    lineHeight: 24,
  },
  // Gate card
  gateCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  gateText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#545454',
    textAlign: 'center',
    fontFamily: 'Futura',
  },
  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#545454',
    fontFamily: 'Futura',
  },
  sectionCount: {
    fontSize: 13,
    color: '#BE9B51',
    fontFamily: 'Futura',
  },
  matchSectionLabel: {
    marginTop: 24,
    marginBottom: 10,
  },
  sectionLoader: {
    marginVertical: 20,
  },
  emptySection: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  emptySectionText: {
    fontSize: 14,
    color: '#545454',
    textAlign: 'center',
    fontFamily: 'Futura',
  },
  emptySectionSubtext: {
    fontSize: 13,
    color: '#BE9B51',
    textAlign: 'center',
    fontFamily: 'Futura',
  },
  // Members list
  membersList: {
    backgroundColor: 'white',
    borderRadius: 20,
    marginBottom: 8,
    overflow: 'hidden',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F0E8',
    gap: 12,
  },
  memberRowLast: {
    borderBottomWidth: 0,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F5EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00934E',
    fontFamily: 'Futura',
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#545454',
    fontFamily: 'Futura',
  },
  newBadge: {
    backgroundColor: '#FAC63D',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  newBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#545454',
    fontFamily: 'Futura',
  },
  memberHeadline: {
    fontSize: 13,
    color: '#BE9B51',
    fontFamily: 'Futura',
    marginTop: 2,
  },
  // Match card
  profileBadgeFloat: {
    alignSelf: 'flex-start',
    marginLeft: 20,
    marginBottom: -56,
    zIndex: 10,
  },
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
    fontFamily: 'Futura',
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
    fontFamily: 'Futura',
  },
  bioText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#545454',
    fontFamily: 'Futura',
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
    fontFamily: 'Futura',
  },
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
  nextLink: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  nextLinkText: {
    fontSize: 14,
    color: '#545454',
    textDecorationLine: 'underline',
    fontWeight: '500',
    fontFamily: 'Futura',
  },
  // Circles quick-link
  circlesCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
  },
  circlesCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  circlesCardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#0277BB',
    fontFamily: 'Futura',
  },
  circlesCardSubtitle: {
    fontSize: 13,
    color: '#BE9B51',
    fontFamily: 'Futura',
    marginTop: 6,
  },
  bottomSpacer: {
    height: 100,
  },
});
