import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Sample questions for each section
const QUESTIONS_BY_SECTION: Record<string, string[]> = {
  intro_identity: [
    "Can you tell me your name—and is there a good story behind it?",
    "You've heard the expression that age is just a number. How old are you in your head? What makes you say that?",
    "Where were you born and raised? Where else have you lived along the way?",
    "Do you have a current co-pilot on life's journey, and who makes up your close family?",
  ],
  interests: [
    "When you're not busy, how do you enjoy spending your free time? Got any hobbies or passions?",
    "What are you watching, reading, or listening to these days?",
    "What's a favorite place you've traveled—or a dream destination you'd love to visit—and why?",
    "Are you part of any groups, clubs, or organizations that you're passionate about?",
    "Tell me about something that brings you joy:",
  ],
  relationships: [
    "Who is your best friend, and what three words would they use to describe you?",
    "Would you call yourself more of a homebody or a social butterfly—and why?",
    "Who was one of the greatest influences on your life, and how did they shape you?",
    "Tell me something about you that most people don't know – a hidden skill, an interesting life experience, an accomplishment.",
  ],
  community: [
    "What's one thing you want your community members to know about you?",
    "Finally, what does being a part of this community mean to you?",
  ],
};

// Export all 15 questions in section order for onboarding
export const ALL_QUESTIONS_ORDERED = [
  ...QUESTIONS_BY_SECTION.intro_identity,
  ...QUESTIONS_BY_SECTION.interests,
  ...QUESTIONS_BY_SECTION.relationships,
  ...QUESTIONS_BY_SECTION.community,
];

// Also export section boundaries for tracking
export const SECTION_BOUNDARIES = {
  intro_identity: { start: 0, end: 3 },
  interests: { start: 4, end: 8 },
  relationships: { start: 9, end: 12 },
  community: { start: 13, end: 14 },
};

export default function SectionQuestionsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { sectionId, sectionName } = route.params;

  const questions = QUESTIONS_BY_SECTION[sectionId] || [];
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>([]);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());

  // Load answered questions from AsyncStorage
  const loadAnsweredQuestions = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const answerKeys = keys.filter((key) => key.startsWith(`answer_${sectionId}_`));
      const answerData = await AsyncStorage.multiGet(answerKeys);

      const answeredSet = new Set<string>();
      answerData.forEach(([_, value]) => {
        if (value) {
          const answer = JSON.parse(value);
          answeredSet.add(answer.question);
        }
      });

      setAnsweredQuestions(answeredSet);
    } catch (error) {
      console.error('Failed to load answered questions:', error);
    }
  };

  // Load answered questions when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadAnsweredQuestions();
    }, [sectionId])
  );

  const toggleQuestion = (index: number) => {
    setSelectedQuestions((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index]
    );
  };

  const handleStartAnswering = () => {
    const questionsToAnswer = selectedQuestions.map((index) => questions[index]);
    navigation.navigate('AnswerQuestion', {
      sectionId,
      questions: questionsToAnswer,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.title}>{sectionName}</Text>
        <Text style={styles.subtitle}>
          Select the questions you'd like to answer
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {questions.map((question, index) => {
          const isSelected = selectedQuestions.includes(index);
          const isAnswered = answeredQuestions.has(question);
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.questionCard,
                isSelected && styles.questionCardSelected,
              ]}
              onPress={() => toggleQuestion(index)}
            >
              <View style={styles.questionContent}>
                <View style={styles.questionTextContainer}>
                  <Text style={styles.questionText}>{question}</Text>
                  {isAnswered && (
                    <View style={styles.answeredBadge}>
                      <Feather name="check-circle" size={14} color="#10b981" />
                      <Text style={styles.answeredText}>Answered</Text>
                    </View>
                  )}
                </View>
                <View
                  style={[
                    styles.checkbox,
                    isSelected && styles.checkboxSelected,
                  ]}
                >
                  {isSelected && <Feather name="check" size={16} color="white" />}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {selectedQuestions.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.button}
            onPress={handleStartAnswering}
          >
            <Text style={styles.buttonText}>
              Start Answering ({selectedQuestions.length})
            </Text>
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
    fontSize: 22,
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
  questionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  questionCardSelected: {
    borderColor: '#3b82f6',
  },
  questionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  questionTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  questionText: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 8,
  },
  answeredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  answeredText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
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
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});