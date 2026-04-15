import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Linking,
  SafeAreaView,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import ProfileBadge from '../components/ProfileBadge';
import { getProfilePictureUrl } from '../services/api';
import { API_BASE_URL } from '../config/api';

const TAG_PALETTE = [
  { bg: '#00934E', text: 'white' },
  { bg: '#FFA0A6', text: 'white' },
  { bg: '#FAC63D', text: '#545454' },
  { bg: '#FE6627', text: 'white' },
  { bg: '#E7E0D3', text: '#545454' },
];

const SHORT_BIO_WORDS = 55;

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

interface MemberProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  role: 'MEMBER' | 'MANAGER';
  profileSummary: string | null;
  profileInterests: string[];
  contactPublished: boolean;
  profilePictureUrl: string | null;
}

export default function MemberProfileScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { auth, logout } = useAuth();
  const token = auth.token;
  const { userId } = route.params;

  const [member, setMember] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signedPictureUrl, setSignedPictureUrl] = useState<string | null>(null);
  const [bioExpanded, setBioExpanded] = useState(false);

  useEffect(() => {
    fetchMemberProfile();
  }, [userId]);

  const fetchMemberProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/communities/members/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401 || response.status === 403) {
        Alert.alert('Session Expired', 'Your session has expired. Please login again.', [
          { text: 'OK', onPress: () => logout() },
        ]);
        return;
      }

      const data = await response.json();
      if (data.success) {
        setMember(data.user);
        if (data.user.profilePictureUrl && token) {
          const url = await getProfilePictureUrl(userId, token);
          setSignedPictureUrl(url);
        }
      } else {
        setError(data.error || 'Failed to load profile');
      }
    } catch (err) {
      console.error('Failed to fetch member profile:', err);
      setError('Failed to load profile. Please try again.');
    } finally {
      setLoading(false);
    }
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

  if (error || !member) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Feather name="chevron-left" size={24} color="#545454" />
          </TouchableOpacity>
        </View>
        <View style={styles.centerState}>
          <Feather name="alert-circle" size={48} color="#BE9B51" />
          <Text style={styles.stateText}>{error || 'Profile not found'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const firstName = member.firstName || '';
  const fullName = [member.firstName, member.lastName].filter(Boolean).join(' ');
  const bioText = member.profileSummary ? stripIcebreakerQuestions(member.profileSummary) : null;
  const icebreakers = member.profileSummary ? parseIcebreakerQuestions(member.profileSummary) : [];
  const quoteText = bioText?.split(/(?<=[.!?])\s+/).find(s => s.trim().length > 30) ?? null;
  const tags = (member.profileInterests ?? []).slice(0, 6);

  const words = bioText?.split(/\s+/) ?? [];
  const isTruncated = words.length > SHORT_BIO_WORDS;
  const displayBio = (!bioExpanded && isTruncated)
    ? words.slice(0, SHORT_BIO_WORDS).join(' ') + '...'
    : bioText;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={24} color="#545454" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile card with straddling avatar */}
        <View style={styles.profileCardWrapper}>
          <View style={styles.profileCard}>
            {/* Spacer for avatar overlap */}
            <View style={styles.avatarSpacer} />
          <Text style={styles.profileName}>{fullName}</Text>

          {tags.length > 0 && (
            <View style={styles.tagsRow}>
              {tags.map((tag, i) => {
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
          {displayBio ? (
            <>
              <Text style={styles.bioText}>{displayBio}</Text>
              {isTruncated && (
                <TouchableOpacity style={styles.expandLink} onPress={() => setBioExpanded(!bioExpanded)}>
                  <Text style={styles.expandLinkText}>
                    {bioExpanded ? 'Show less' : 'Show full bio ✦'}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          ) : null}
          </View>

          {/* Avatar straddling top-left of card */}
          <View style={styles.avatarAbsolute}>
            <ProfileBadge
              firstName={firstName}
              lastName={member.lastName || ''}
              totalAnswers={4}
              profilePictureUrl={signedPictureUrl}
              size={80}
            />
          </View>
        </View>

        {/* Quote card */}
        {quoteText && (
          <View style={styles.quoteCard}>
            <Text style={styles.quoteText}>"{quoteText}"</Text>
          </View>
        )}

        {/* Icebreaker card */}
        {icebreakers.length > 0 && (
          <View style={styles.icebreakerCard}>
            <Text style={styles.icebreakerLabel}>
              Ask {firstName || 'them'}:
            </Text>
            {icebreakers.map((q, i) => (
              <Text key={i} style={styles.icebreakerQuestion}>{q}</Text>
            ))}
          </View>
        )}

        {/* MESSAGING_DISABLED: Email button — hidden until messaging is ready to ship
        {member.contactPublished && member.email && (
          <TouchableOpacity
            style={styles.emailButton}
            onPress={() => Linking.openURL(`mailto:${member.email}`)}
          >
            <Feather name="mail" size={18} color="#0277BB" />
            <Text style={styles.emailButtonText}>Email {firstName || 'them'}</Text>
          </TouchableOpacity>
        )}
        */}

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
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
    width: 36,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  stateText: {
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
    paddingBottom: 40,
  },
  profileCardWrapper: {
    position: 'relative',
    marginTop: 40,
    marginBottom: 16,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    paddingTop: 16,
    gap: 16,
  },
  avatarSpacer: {
    height: 44,
  },
  avatarAbsolute: {
    position: 'absolute',
    top: -40,
    left: 20,
  },
  profileName: {
    fontSize: 26,
    fontWeight: '700',
    fontFamily: 'Futura',
    color: '#00934E',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Futura',
  },
  bioText: {
    fontSize: 15,
    fontFamily: 'Futura',
    color: '#545454',
    lineHeight: 22,
  },
  expandLink: {
    marginTop: 4,
  },
  expandLinkText: {
    fontSize: 14,
    fontFamily: 'Futura',
    color: '#BE9B51',
    textDecorationLine: 'underline',
  },
  quoteCard: {
    backgroundColor: '#E8F5EE',
    borderRadius: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#00934E',
    padding: 24,
    marginBottom: 16,
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
    marginBottom: 16,
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
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#0277BB',
    marginBottom: 16,
  },
  emailButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Futura',
    color: '#0277BB',
  },
  bottomSpacer: {
    height: 32,
  },
});
