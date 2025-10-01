import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Answer {
  sectionId: string;
  question: string;
  audioUri: string;
  transcript?: string;
  timestamp: string;
}

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAnswers = async () => {
    try {
      setLoading(true);
      const keys = await AsyncStorage.getAllKeys();
      const answerKeys = keys.filter((key) => key.startsWith('answer_'));
      const answerData = await AsyncStorage.multiGet(answerKeys);

      const parsedAnswers = answerData
        .map(([_, value]) => (value ? JSON.parse(value) : null))
        .filter((answer) => answer !== null)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setAnswers(parsedAnswers);
    } catch (error) {
      console.error('Failed to load answers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Reload answers when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadAnswers();
    }, [])
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Profile</Text>
        <TouchableOpacity onPress={() => navigation.navigate('QuestionFlowStack')}>
          <Text style={styles.link}>Add more answers</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : answers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No answers yet</Text>
          <Text style={styles.emptySubtext}>
            Start building your profile by answering questions
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {answers.map((answer, index) => (
            <View key={index} style={styles.answerCard}>
              <Text style={styles.question}>{answer.question}</Text>
              {answer.transcript ? (
                <Text style={styles.transcript}>{answer.transcript}</Text>
              ) : (
                <Text style={styles.noTranscript}>Transcription not available</Text>
              )}
              <Text style={styles.timestamp}>
                {new Date(answer.timestamp).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  link: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  answerCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  question: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  transcript: {
    fontSize: 15,
    lineHeight: 22,
    color: '#374151',
    marginBottom: 12,
  },
  noTranscript: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#9ca3af',
    marginBottom: 12,
  },
  timestamp: {
    fontSize: 12,
    color: '#9ca3af',
  },
});