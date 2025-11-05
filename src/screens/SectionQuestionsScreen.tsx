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
import { useNavigation, useRoute } from '@react-navigation/native';

// Sample questions for each section
const QUESTIONS_BY_SECTION: Record<string, string[]> = {
  identity: [
    'What are three words that best describe you?',
    'What is a passion or hobby that defines you?',
    'What is a value you refuse to compromise on?',
    'What is something you are working to improve about yourself?',
  ],
  relationships: [
    'What do you value most in friendships?',
    'How do you show care for the people you love?',
    'What is your approach to conflict resolution?',
    'What role does family play in your life?',
  ],
  lifestyle: [
    'What does a perfect weekend look like for you?',
    'What are your daily non-negotiables?',
    'How do you maintain work-life balance?',
    'What is a recent change you have made to improve your lifestyle?',
  ],
  community: [
    'What kind of community are you looking to be part of?',
    'How do you like to contribute to your community?',
    'What is important to you in a neighbor or community member?',
    'What community activities interest you most?',
  ],
};

export default function SectionQuestionsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { sectionId, sectionName } = route.params;

  const questions = QUESTIONS_BY_SECTION[sectionId] || [];
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>([]);

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
                <Text style={styles.questionText}>{question}</Text>
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
  questionText: {
    fontSize: 16,
    color: '#111827',
    flex: 1,
    marginRight: 12,
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