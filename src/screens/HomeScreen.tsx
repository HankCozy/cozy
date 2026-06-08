import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import ScreenContainer from '../components/ScreenContainer';
import { fetchProfileFromServer } from '../services/api';
import { API_BASE_URL } from '../config/api';
import { typography } from '../constants/typography';

interface FeedMember {
  id: string;
  firstName: string | null;
  lastName: string | null;
  profileSummary: string | null;
  profileInterests: string[];
  profileAnswers?: Array<{ sectionId: string; question: string; transcript: string }>;
}

type FeedCard =
  | { type: 'answer'; member: FeedMember; question: string; answer: string }
  | { type: 'summary'; member: FeedMember }
  | { type: 'insight'; text: string; interestLabel: string; count: number };

const TAG_COLORS = [
  { bg: '#00934E', text: 'white' },
  { bg: '#FFA0A6', text: 'white' },
  { bg: '#FAC63D', text: '#545454' },
  { bg: '#FE6627', text: 'white' },
  { bg: '#E7E0D3', text: '#545454' },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function stripIcebreakerSection(summary: string): string {
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

function buildFeed(members: FeedMember[], communityName: string): FeedCard[] {
  const peopleCards: FeedCard[] = [];

  for (const member of members) {
    peopleCards.push({ type: 'summary', member });

    const answers = member.profileAnswers ?? [];
    const best = answers
      .filter((a) => a.transcript && a.transcript.length >= 30)
      .sort((a, b) => b.transcript.length - a.transcript.length)[0];
    if (best) {
      const answerText =
        best.transcript.length > 220
          ? best.transcript.slice(0, 220) + '…'
          : best.transcript;
      peopleCards.push({
        type: 'answer',
        member,
        question: best.question,
        answer: answerText,
      });
    }
  }

  const interestCounts: Record<string, number> = {};
  for (const member of members) {
    for (const interest of member.profileInterests ?? []) {
      interestCounts[interest] = (interestCounts[interest] ?? 0) + 1;
    }
  }

  const insights: FeedCard[] = Object.entries(interestCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([interest, count]) => ({
      type: 'insight' as const,
      text: `${count} ${count === 1 ? 'person' : 'people'} in ${communityName} ${count === 1 ? 'is' : 'are'} into ${interest}`,
      interestLabel: interest,
      count,
    }));

  if (members.length > 0) {
    insights.push({
      type: 'insight',
      text: `${members.length} ${members.length === 1 ? 'person has' : 'people have'} completed their profile in ${communityName}`,
      interestLabel: 'profiles',
      count: members.length,
    });
  }

  const result: FeedCard[] = [];
  let insightIdx = 0;
  for (let i = 0; i < peopleCards.length; i++) {
    result.push(peopleCards[i]);
    if ((i + 1) % 4 === 0 && insightIdx < insights.length) {
      result.push(insights[insightIdx++]);
    }
  }
  while (insightIdx < insights.length) {
    result.push(insights[insightIdx++]);
  }

  return result;
}

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { auth } = useAuth();
  const { user, token } = auth;

  const [totalAnswers, setTotalAnswers] = useState(0);
  const [feedCards, setFeedCards] = useState<FeedCard[]>([]);
  const [profileSummary, setProfileSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [bannerVisible, setBannerVisible] = useState(true);

  const isEligible = totalAnswers >= 6 || !!user?.profilePublished;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const keys = await AsyncStorage.getAllKeys();
      const count = keys.filter((k) => k.startsWith('answer_')).length;
      setTotalAnswers(count);
      const eligible = count >= 6 || !!user?.profilePublished;

      const fetches: Promise<void>[] = [];

      if (user?.profilePublished && token) {
        fetches.push(
          fetchProfileFromServer(token)
            .then((profile) => {
              if (profile?.profileSummary) setProfileSummary(profile.profileSummary);
            })
            .catch(() => {})
        );
      }

      if (eligible && token) {
        fetches.push(
          fetch(`${API_BASE_URL}/api/communities/members`, {
            headers: { 'Authorization': `Bearer ${token}` },
          })
            .then((r) => r.json())
            .then((data) => {
              if (data.success) {
                const others = (data.members as FeedMember[]).filter(
                  (m) => m.id !== user?.id
                );
                const communityName =
                  user?.community?.organization ?? 'your community';
                setFeedCards(buildFeed(others, communityName));
              }
            })
            .catch(() => {})
        );
      }

      await Promise.all(fetches);
    } finally {
      setLoading(false);
    }
  }, [token, user?.id, user?.profilePublished]);

  useFocusEffect(loadData);

  // Banner config based on user state
  let bannerHeadline = '';
  let bannerSub = '';
  let bannerCta = '';
  let bannerAction = () => {};

  if (!isEligible) {
    const remaining = 6 - totalAnswers;
    bannerHeadline = `Answer ${remaining} more ${remaining === 1 ? 'question' : 'questions'} to unlock your profile`;
    bannerSub = "Share a bit about yourself and we'll create your community profile.";
    bannerCta = 'Answer a question';
    bannerAction = () => navigation.navigate('Questions');
  } else if (!user?.profilePublished) {
    bannerHeadline = 'Your profile is ready to generate';
    bannerSub = "You've answered enough questions. Let AI craft your community profile.";
    bannerCta = 'Create my profile';
    bannerAction = () => navigation.navigate('Profile');
  } else {
    bannerHeadline = 'See who you share interests with';
    bannerSub = `Explore your circles in ${user?.community?.organization ?? 'your community'}.`;
    bannerCta = 'Explore Circles';
    bannerAction = () => navigation.navigate('Community');
  }

  const bioSnippet = profileSummary
    ? (() => {
        const stripped = stripIcebreakerSection(profileSummary);
        return stripped.length > 130 ? stripped.slice(0, 130) + '…' : stripped;
      })()
    : null;

  function renderFeedCard(card: FeedCard, index: number) {
    if (card.type === 'insight') {
      return (
        <TouchableOpacity
          key={`insight-${index}`}
          style={styles.insightCard}
          onPress={() => navigation.navigate('Community')}
          activeOpacity={0.8}
        >
          <Text
            style={styles.insightCount}
            maxFontSizeMultiplier={typography.maxMultiplier}
          >
            {card.count}
          </Text>
          <Text
            style={styles.insightText}
            maxFontSizeMultiplier={typography.maxMultiplier}
          >
            {card.text}
          </Text>
          <View style={styles.cardCta}>
            <Text
              style={styles.insightCtaText}
              maxFontSizeMultiplier={typography.maxMultiplier}
            >
              Explore community
            </Text>
            <Feather name="chevron-right" size={14} color="#545454" />
          </View>
        </TouchableOpacity>
      );
    }

    if (card.type === 'summary') {
      const bioText = card.member.profileSummary
        ? (() => {
            const stripped = stripIcebreakerSection(card.member.profileSummary);
            return stripped.length > 150 ? stripped.slice(0, 150) + '…' : stripped;
          })()
        : null;
      return (
        <TouchableOpacity
          key={`summary-${card.member.id}-${index}`}
          style={styles.feedCard}
          onPress={() =>
            navigation.navigate('MemberProfile', { userId: card.member.id })
          }
          activeOpacity={0.8}
        >
          <Text
            style={styles.feedCardName}
            maxFontSizeMultiplier={typography.maxMultiplier}
            numberOfLines={1}
          >
            {card.member.firstName} {card.member.lastName}
          </Text>
          {(card.member.profileInterests?.length ?? 0) > 0 && (
            <View style={styles.feedTags}>
              {card.member.profileInterests.slice(0, 4).map((tag, ti) => {
                const c = TAG_COLORS[ti % TAG_COLORS.length];
                return (
                  <View
                    key={ti}
                    style={[styles.feedTag, { backgroundColor: c.bg }]}
                  >
                    <Text
                      style={[styles.feedTagText, { color: c.text }]}
                      maxFontSizeMultiplier={typography.maxMultiplier}
                      numberOfLines={1}
                    >
                      {tag}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
          {bioText ? (
            <Text
              style={styles.feedBioSnippet}
              maxFontSizeMultiplier={typography.maxMultiplier}
              numberOfLines={2}
            >
              {bioText}
            </Text>
          ) : null}
          <View style={styles.cardCta}>
            <Text
              style={styles.cardCtaText}
              maxFontSizeMultiplier={typography.maxMultiplier}
            >
              View profile
            </Text>
            <Feather name="chevron-right" size={14} color="#00934E" />
          </View>
        </TouchableOpacity>
      );
    }

    // answer card
    return (
      <TouchableOpacity
        key={`answer-${card.member.id}-${index}`}
        style={styles.feedCard}
        onPress={() =>
          navigation.navigate('MemberProfile', { userId: card.member.id })
        }
        activeOpacity={0.8}
      >
        <Text
          style={styles.feedAnswerName}
          maxFontSizeMultiplier={typography.maxMultiplier}
          numberOfLines={1}
        >
          {card.member.firstName} {card.member.lastName}
        </Text>
        <Text
          style={styles.feedQuestion}
          maxFontSizeMultiplier={typography.maxMultiplier}
        >
          {card.question}
        </Text>
        <Text
          style={styles.feedAnswerText}
          maxFontSizeMultiplier={typography.maxMultiplier}
          numberOfLines={4}
        >
          {card.answer}
        </Text>
        <View style={styles.cardCta}>
          <Text
            style={styles.cardCtaText}
            maxFontSizeMultiplier={typography.maxMultiplier}
          >
            View profile
          </Text>
          <Feather name="chevron-right" size={14} color="#00934E" />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Header */}
        <View style={styles.header}>
          <Text
            style={styles.greeting}
            maxFontSizeMultiplier={typography.maxMultiplier}
          >
            {getGreeting()}, {user?.firstName ?? 'there'}
          </Text>
          {user?.community?.organization ? (
            <Text
              style={styles.communityName}
              maxFontSizeMultiplier={typography.maxMultiplier}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {user.community.organization}
            </Text>
          ) : null}
        </View>

        {/* Next Step Banner */}
        {bannerVisible && (
          <View style={styles.banner}>
            <TouchableOpacity
              style={styles.bannerDismiss}
              onPress={() => setBannerVisible(false)}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <Feather name="x" size={16} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
            <Text
              style={styles.bannerHeadline}
              maxFontSizeMultiplier={typography.maxMultiplier}
            >
              {bannerHeadline}
            </Text>
            <Text
              style={styles.bannerSub}
              maxFontSizeMultiplier={typography.maxMultiplier}
            >
              {bannerSub}
            </Text>
            <TouchableOpacity
              style={styles.bannerButton}
              onPress={bannerAction}
              activeOpacity={0.85}
            >
              <Text
                style={[styles.bannerButtonText, { color: '#0277BB' }]}
                maxFontSizeMultiplier={typography.maxMultiplier}
              >
                {bannerCta}
              </Text>
              <Feather name="chevron-right" size={15} color="#0277BB" />
            </TouchableOpacity>
          </View>
        )}

        {/* Profile Progress Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text
              style={styles.cardTitle}
              maxFontSizeMultiplier={typography.maxMultiplier}
            >
              Your Profile
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
              <Text
                style={styles.cardLink}
                maxFontSizeMultiplier={typography.maxMultiplier}
              >
                View
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min((totalAnswers / 15) * 100, 100)}%` },
              ]}
            />
          </View>
          <Text
            style={styles.progressLabel}
            maxFontSizeMultiplier={typography.maxMultiplier}
          >
            {totalAnswers} of 15 questions answered
            {totalAnswers < 6 ? `  ·  ${6 - totalAnswers} more to unlock` : ''}
          </Text>
          {bioSnippet ? (
            <Text
              style={styles.bioSnippet}
              maxFontSizeMultiplier={typography.maxMultiplier}
              numberOfLines={3}
            >
              {bioSnippet}
            </Text>
          ) : null}
          <TouchableOpacity
            style={styles.cardCta}
            onPress={() => navigation.navigate('Questions')}
            activeOpacity={0.7}
          >
            <Text
              style={styles.cardCtaText}
              maxFontSizeMultiplier={typography.maxMultiplier}
            >
              {totalAnswers < 15 ? 'Keep answering' : 'Review answers'}
            </Text>
            <Feather name="chevron-right" size={14} color="#00934E" />
          </TouchableOpacity>
        </View>

        {/* Community Feed */}
        {isEligible && (
          <>
            <Text
              style={styles.feedHeading}
              maxFontSizeMultiplier={typography.maxMultiplier}
            >
              From your community
            </Text>
            {loading ? (
              <ActivityIndicator
                size="small"
                color="#0277BB"
                style={styles.loader}
              />
            ) : feedCards.length === 0 ? (
              <View style={styles.card}>
                <Text
                  style={styles.emptyText}
                  maxFontSizeMultiplier={typography.maxMultiplier}
                >
                  No community activity yet — check back soon.
                </Text>
              </View>
            ) : (
              feedCards.map((card, i) => renderFeedCard(card, i))
            )}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 110,
  },

  // Welcome Header
  header: { marginBottom: 20 },
  greeting: {
    fontFamily: 'Futura',
    fontSize: typography.screenTitle,
    fontWeight: '700',
    color: '#00934E',
  },
  communityName: {
    fontFamily: 'Futura',
    fontSize: typography.label,
    fontWeight: '500',
    color: '#BE9B51',
    marginTop: 2,
  },

  // Banner
  banner: {
    backgroundColor: '#0277BB',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
  },
  bannerDismiss: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 6,
  },
  bannerHeadline: {
    fontFamily: 'Futura',
    fontSize: typography.sectionHeader,
    fontWeight: '700',
    color: 'white',
    marginBottom: 6,
    paddingRight: 28,
  },
  bannerSub: {
    fontFamily: 'Futura',
    fontSize: typography.body,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 16,
    lineHeight: 22,
  },
  bannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'white',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 18,
    gap: 4,
  },
  bannerButtonText: {
    fontFamily: 'Futura',
    fontSize: typography.label,
    fontWeight: '700',
  },

  // Shared card shell
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontFamily: 'Futura',
    fontSize: typography.sectionHeader,
    fontWeight: '600',
    color: '#545454',
  },
  cardLink: {
    fontFamily: 'Futura',
    fontSize: typography.label,
    fontWeight: '600',
    color: '#00934E',
  },
  cardCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 16,
  },
  cardCtaText: {
    fontFamily: 'Futura',
    fontSize: typography.label,
    fontWeight: '600',
    color: '#00934E',
  },

  // Profile progress
  progressTrack: {
    height: 6,
    backgroundColor: '#E7E0D3',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00934E',
    borderRadius: 3,
  },
  progressLabel: {
    fontFamily: 'Futura',
    fontSize: typography.small,
    color: '#BE9B51',
  },
  bioSnippet: {
    fontFamily: 'Futura',
    fontSize: typography.body,
    color: '#545454',
    lineHeight: 22,
    marginTop: 12,
  },

  // Feed section
  feedHeading: {
    fontFamily: 'Futura',
    fontSize: typography.sectionHeader,
    fontWeight: '600',
    color: '#545454',
    marginBottom: 12,
    marginTop: 8,
  },
  feedCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
  },
  feedCardName: {
    fontFamily: 'Futura',
    fontSize: typography.sectionHeader,
    fontWeight: '700',
    color: '#00934E',
    marginBottom: 8,
  },
  feedAnswerName: {
    fontFamily: 'Futura',
    fontSize: typography.label,
    fontWeight: '700',
    color: '#00934E',
    marginBottom: 4,
  },
  feedQuestion: {
    fontFamily: 'Futura',
    fontSize: typography.small,
    color: '#BE9B51',
    marginBottom: 6,
  },
  feedAnswerText: {
    fontFamily: 'Futura',
    fontSize: typography.body,
    color: '#545454',
    lineHeight: 22,
  },
  feedTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  feedTag: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  feedTagText: {
    fontFamily: 'Futura',
    fontSize: typography.small,
    fontWeight: '600',
  },
  feedBioSnippet: {
    fontFamily: 'Futura',
    fontSize: typography.body,
    color: '#545454',
    lineHeight: 22,
  },

  // Insight card
  insightCard: {
    backgroundColor: '#FAC63D',
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
  },
  insightCount: {
    fontFamily: 'Futura',
    fontSize: typography.screenTitle,
    fontWeight: '700',
    color: '#545454',
    marginBottom: 4,
  },
  insightText: {
    fontFamily: 'Futura',
    fontSize: typography.body,
    color: '#545454',
    lineHeight: 22,
  },
  insightCtaText: {
    fontFamily: 'Futura',
    fontSize: typography.label,
    fontWeight: '600',
    color: '#545454',
  },

  // Misc
  emptyText: {
    fontFamily: 'Futura',
    fontSize: typography.body,
    color: '#BE9B51',
  },
  loader: { marginVertical: 12 },
});
