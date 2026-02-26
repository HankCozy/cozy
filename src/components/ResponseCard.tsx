import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';

export interface ResponseCardData {
  headline: string;
  tags: string[];
  icebreakerQuestions?: string[];
}

interface ResponseCardProps extends ResponseCardData {
  firstName?: string;
  lastName?: string;
  profilePictureUrl?: string | null;
  funFact?: string;
  funFactQuestion?: string;
  onViewProfile?: () => void;
}

const TAG_PALETTE = [
  { bg: '#dbeafe', text: '#1d4ed8' },
  { bg: '#dcfce7', text: '#15803d' },
  { bg: '#fef3c7', text: '#92400e' },
  { bg: '#fce7f3', text: '#9d174d' },
  { bg: '#ede9fe', text: '#6d28d9' },
  { bg: '#ffedd5', text: '#9a3412' },
];

function stripLeadingName(text: string, firstName?: string, lastName?: string): string {
  if (!text) return text;
  const fullName = [firstName, lastName].filter(Boolean).join(' ');
  if (!fullName) return text;
  // Handle punctuation that commonly follows a name at the start (colon, comma, period)
  const regex = new RegExp(`^${fullName}[,:.]?\\s*`, 'i');
  return text.replace(regex, '').trimStart();
}

function replaceFullNameWithFirst(text: string, firstName?: string, lastName?: string): string {
  if (!text || !firstName || !lastName) return text;
  const regex = new RegExp(`${firstName}\\s+${lastName}`, 'gi');
  return text.replace(regex, firstName);
}

export default function ResponseCard({
  firstName,
  lastName,
  profilePictureUrl,
  headline,
  tags,
  funFact,
  funFactQuestion,
  icebreakerQuestions,
  onViewProfile,
}: ResponseCardProps) {
  const name = [firstName, lastName].filter(Boolean).join(' ');
  const initials = [firstName?.[0], lastName?.[0]].filter(Boolean).join('').toUpperCase();

  const displayHeadline = replaceFullNameWithFirst(
    stripLeadingName(headline, firstName, lastName),
    firstName,
    lastName
  );
  const displayFunFact = replaceFullNameWithFirst(funFact ?? '', firstName, lastName);

  return (
    <View style={styles.card}>
      <View style={styles.accent} />
      <View style={styles.body}>
        {/* Profile pic + name row */}
        {name ? (
          <View style={styles.nameRow}>
            {profilePictureUrl ? (
              <Image source={{ uri: profilePictureUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
            <Text style={styles.name}>{name}</Text>
          </View>
        ) : null}

        {displayHeadline ? <Text style={styles.headline}>{displayHeadline}</Text> : null}

        {tags.length > 0 && (
          <View style={styles.tagsRow}>
            {tags.map((tag, i) => {
              const palette = TAG_PALETTE[i % TAG_PALETTE.length];
              return (
                <View key={i} style={[styles.tag, { backgroundColor: palette.bg }]}>
                  <Text style={[styles.tagText, { color: palette.text }]}>{tag}</Text>
                </View>
              );
            })}
          </View>
        )}

        {displayFunFact ? (
          <View style={styles.funFactBox}>
            {funFactQuestion ? (
              <Text style={styles.funFactQuestion}>{funFactQuestion}</Text>
            ) : null}
            <Text style={styles.funFactText}>"{displayFunFact}"</Text>
          </View>
        ) : null}

        {icebreakerQuestions && icebreakerQuestions.length > 0 && (
          <View style={styles.icebreakerSection}>
            <Text style={styles.icebreakerLabel}>Questions to break the ice:</Text>
            {icebreakerQuestions.map((q, i) => (
              <Text key={i} style={styles.icebreakerQuestion}>• {q}</Text>
            ))}
          </View>
        )}

        {onViewProfile ? (
          <TouchableOpacity onPress={onViewProfile} style={styles.viewProfileRow}>
            <Text style={styles.viewProfileLink}>
              Read {firstName ? `${firstName}'s` : 'their'} profile story →
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  accent: {
    width: 5,
    backgroundColor: '#3b82f6',
  },
  body: {
    flex: 1,
    padding: 20,
    gap: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  headline: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginTop: -4,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  funFactBox: {
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    padding: 16,
    gap: 10,
  },
  funFactQuestion: {
    fontSize: 13,
    color: '#6b7280',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  funFactText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    fontStyle: 'italic',
    lineHeight: 30,
  },
  icebreakerSection: {
    gap: 6,
  },
  icebreakerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  icebreakerQuestion: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  viewProfileRow: {
    alignItems: 'flex-end',
    marginTop: -4,
  },
  viewProfileLink: {
    fontSize: 12,
    color: '#3b82f6',
  },
});
