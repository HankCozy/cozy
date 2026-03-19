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
  { id: 'intro_identity', name: 'Intro & Identity', icon: 'user', color: '#00934E', textColor: '#007F45', total: 4 },
  { id: 'interests', name: 'Free Time & Interests', icon: 'compass', color: '#0277BB', textColor: '#0277BB', total: 5 },
  { id: 'relationships', name: 'Relationships & Reflections', icon: 'heart', color: '#FFA0A6', textColor: '#C0394B', total: 4 },
  { id: 'community', name: 'You & Your Community', icon: 'users', color: '#FE6627', textColor: '#B54000', total: 2 },
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
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
                  sectionColor: section.color,
                  sectionTextColor: section.textColor,
                })
              }
            >
              <View style={[styles.iconContainer, { backgroundColor: section.color }]}>
                <Feather name={section.icon} size={26} color="white" />
              </View>
              <View style={styles.sectionContent}>
                <View>
                  <Text style={styles.sectionName}>{section.name}</Text>
                  <Text style={styles.answerCount}>
                    {answerCount} of {section.total} answered
                  </Text>
                </View>
                <View style={styles.rightSection}>
                  <Feather name="chevron-right" size={24} color="#BE9B51" />
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
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
  scrollContent: {
    padding: 20,
    gap: 16,
    paddingBottom: 20,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 40,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    fontSize: 19,
    fontWeight: '600',
    fontFamily: 'Futura',
    color: '#545454',
  },
  answerCount: {
    fontSize: 14,
    fontFamily: 'Futura',
    color: '#BE9B51',
    marginTop: 10,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});