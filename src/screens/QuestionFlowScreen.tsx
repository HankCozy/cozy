import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SECTIONS = [
  { id: 'identity', name: 'Identity', icon: 'user', color: '#3b82f6' },
  { id: 'relationships', name: 'Relationships', icon: 'heart', color: '#ec4899' },
  { id: 'lifestyle', name: 'Lifestyle', icon: 'coffee', color: '#10b981' },
  { id: 'community', name: 'Community', icon: 'users', color: '#f59e0b' },
];

export default function QuestionFlowScreen() {
  const navigation = useNavigation<any>();
  const [completedSections, setCompletedSections] = useState<string[]>([]);
  const [answerCounts, setAnswerCounts] = useState<Record<string, number>>({});

  useFocusEffect(
    React.useCallback(() => {
      loadCompletionStatus();
    }, [])
  );

  const loadCompletionStatus = async () => {
    try {
      const completed: string[] = [];
      const counts: Record<string, number> = {};

      // Check completion status for each section
      for (const section of SECTIONS) {
        const isCompleted = await AsyncStorage.getItem(`section_${section.id}_completed`);
        if (isCompleted === 'true') {
          completed.push(section.id);
        }

        // Count answers for this section
        const allKeys = await AsyncStorage.getAllKeys();
        const sectionAnswers = allKeys.filter(key => key.startsWith(`answer_${section.id}_`));
        counts[section.id] = sectionAnswers.length;
      }

      setCompletedSections(completed);
      setAnswerCounts(counts);
    } catch (err) {
      console.error('Failed to load completion status', err);
    }
  };

  const hasAnyAnswers = Object.values(answerCounts).some(count => count > 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.title}>Build Your Profile</Text>
        <Text style={styles.subtitle}>
          Choose a section to start answering questions
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {SECTIONS.map((section) => {
          const isCompleted = completedSections.includes(section.id);
          const answerCount = answerCounts[section.id] || 0;

          return (
            <TouchableOpacity
              key={section.id}
              style={styles.sectionCard}
              onPress={() =>
                navigation.navigate('SectionQuestions', {
                  sectionId: section.id,
                  sectionName: section.name,
                })
              }
            >
              <View style={[styles.iconContainer, { backgroundColor: section.color }]}>
                <Feather name={section.icon} size={32} color="white" />
              </View>
              <View style={styles.sectionContent}>
                <View>
                  <Text style={styles.sectionName}>{section.name}</Text>
                  {answerCount > 0 && (
                    <Text style={styles.answerCount}>
                      {answerCount} {answerCount === 1 ? 'answer' : 'answers'}
                    </Text>
                  )}
                </View>
                <View style={styles.rightSection}>
                  {isCompleted && (
                    <View style={styles.completedBadge}>
                      <Feather name="check" size={16} color="#10b981" />
                    </View>
                  )}
                  <Feather name="chevron-right" size={24} color="#9ca3af" />
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {hasAnyAnswers && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.returnButton}
            onPress={() => {
              // Navigate back to Profile tab in main tabs
              navigation.navigate('MainTabs', { screen: 'Profile' });
            }}
          >
            <Text style={styles.returnButtonText}>Return to Profile</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 20,
    padding: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  scrollContent: {
    padding: 20,
    gap: 16,
    paddingBottom: 100,
  },
  sectionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  sectionContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  answerCount: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  completedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  returnButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  returnButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});