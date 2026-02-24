import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface ResponseCardData {
  headline: string;
  tags: string[];
  funFact: string;
}

interface ResponseCardProps extends ResponseCardData {
  firstName?: string;
  lastName?: string;
}

const TAG_PALETTE = [
  { bg: '#dbeafe', text: '#1d4ed8' },
  { bg: '#dcfce7', text: '#15803d' },
  { bg: '#fef3c7', text: '#92400e' },
  { bg: '#fce7f3', text: '#9d174d' },
  { bg: '#ede9fe', text: '#6d28d9' },
  { bg: '#ffedd5', text: '#9a3412' },
];

export default function ResponseCard({
  firstName,
  lastName,
  headline,
  tags,
  funFact,
}: ResponseCardProps) {
  const name = [firstName, lastName].filter(Boolean).join(' ');

  return (
    <View style={styles.card}>
      <View style={styles.accent} />
      <View style={styles.body}>
        {name ? <Text style={styles.name}>{name}</Text> : null}
        {headline ? <Text style={styles.headline}>{headline}</Text> : null}

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

        {funFact ? (
          <View style={styles.funFactBox}>
            <Text style={styles.funFactText}>"{funFact}"</Text>
          </View>
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
    padding: 12,
  },
  funFactText: {
    fontSize: 13,
    color: '#374151',
    fontStyle: 'italic',
    lineHeight: 18,
  },
});
