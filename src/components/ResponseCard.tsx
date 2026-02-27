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
  onViewProfile,
}: ResponseCardProps) {
  const name = [firstName, lastName].filter(Boolean).join(' ');
  const initials = [firstName?.[0], lastName?.[0]].filter(Boolean).join('').toUpperCase();

  const displayHeadline = replaceFullNameWithFirst(
    stripLeadingName(headline, firstName, lastName),
    firstName,
    lastName
  );
  const displayFunFact = funFact
    ? replaceFullNameWithFirst(funFact, firstName, lastName)
    : null;

  return (
    <View style={styles.card}>
      {/* Header: avatar + name */}
      <View style={styles.header}>
        {profilePictureUrl ? (
          <Image source={{ uri: profilePictureUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
        )}
        <Text style={styles.name}>{name}</Text>
      </View>

      {/* Tags */}
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

      {/* Bio / headline */}
      {displayHeadline ? (
        <View style={styles.bioBox}>
          <Text style={styles.bioText}>{displayHeadline}</Text>
        </View>
      ) : null}

      {/* Community quote */}
      {displayFunFact ? (
        <View style={styles.quoteBox}>
          <Text style={styles.quoteLabel}>Community quote</Text>
          <Text style={styles.quoteText}>{displayFunFact}</Text>
        </View>
      ) : null}

      {onViewProfile ? (
        <TouchableOpacity onPress={onViewProfile} style={styles.viewProfileRow}>
          <Text style={styles.viewProfileLink}>
            Read {firstName ? `${firstName}'s` : 'their'} profile story →
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#6b7280',
    fontSize: 22,
    fontWeight: '700',
  },
  name: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    flexShrink: 1,
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
  },
  bioBox: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 16,
  },
  bioText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  quoteBox: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 16,
    gap: 10,
  },
  quoteLabel: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '500',
  },
  quoteText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 32,
  },
  viewProfileRow: {
    alignItems: 'flex-end',
  },
  viewProfileLink: {
    fontSize: 13,
    color: '#3b82f6',
  },
});
