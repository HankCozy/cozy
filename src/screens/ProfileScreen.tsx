import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { generateProfile, QuestionAnswer } from '../services/api';
import { resetOnboardingFlags } from '../utils/resetOnboarding';

interface Answer {
  sectionId: string;
  question: string;
  audioUri: string;
  transcript?: string;
  timestamp: string;
}

const SECTIONS = [
  { id: 'identity', name: 'Identity', icon: 'user', color: '#3b82f6' },
  { id: 'relationships', name: 'Relationships', icon: 'heart', color: '#ec4899' },
  { id: 'lifestyle', name: 'Lifestyle', icon: 'coffee', color: '#10b981' },
  { id: 'community', name: 'Community', icon: 'users', color: '#f59e0b' },
];

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [completedSections, setCompletedSections] = useState<string[]>([]);
  const [answerCounts, setAnswerCounts] = useState<Record<string, number>>({});
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [profileSummary, setProfileSummary] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedSummary, setEditedSummary] = useState('');
  const textInputRef = useRef<TextInput>(null);

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

      // Load completion status and answer counts for each section
      const completed: string[] = [];
      const counts: Record<string, number> = {};
      for (const section of SECTIONS) {
        const isCompleted = await AsyncStorage.getItem(`section_${section.id}_completed`);
        if (isCompleted === 'true') {
          completed.push(section.id);
        }

        // Count answers for this section
        const sectionAnswers = answerKeys.filter(key => key.startsWith(`answer_${section.id}_`));
        counts[section.id] = sectionAnswers.length;
      }
      setCompletedSections(completed);
      setAnswerCounts(counts);
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
      loadProfileSummary();
    }, [])
  );

  const loadProfileSummary = async () => {
    try {
      const savedSummary = await AsyncStorage.getItem('profile_summary');
      if (savedSummary) {
        setProfileSummary(savedSummary);
      }
    } catch (error) {
      console.error('Failed to load profile summary:', error);
    }
  };

  const handleGenerateSummary = async () => {
    // Check if we have transcripts
    const answersWithTranscripts = answers.filter(
      (a) => a.transcript && a.transcript.trim().length > 0
    );

    if (answersWithTranscripts.length === 0) {
      Alert.alert(
        'No Transcripts Available',
        'Please record and transcribe some answers before generating a profile summary.'
      );
      return;
    }

    try {
      setGeneratingSummary(true);

      // Convert answers to QuestionAnswer format
      const questionAnswers: QuestionAnswer[] = answersWithTranscripts.map((a) => ({
        sectionId: a.sectionId,
        question: a.question,
        transcript: a.transcript!,
      }));

      // Generate summary using Claude
      const summary = await generateProfile(questionAnswers, {
        maxWords: 400,
        style: 'narrative',
      });

      // Save to AsyncStorage
      await AsyncStorage.setItem('profile_summary', summary);
      setProfileSummary(summary);

      Alert.alert('Success', 'Your profile summary has been generated!');
    } catch (error) {
      console.error('Failed to generate summary:', error);
      Alert.alert(
        'Generation Failed',
        'Unable to generate profile summary. Please check your connection and try again.'
      );
    } finally {
      setGeneratingSummary(false);
    }
  };

  const clearAllAnswers = async () => {
    Alert.alert(
      'Clear All Answers',
      'This will permanently delete all your answers, recordings, and profile summary. This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              // Get all keys from AsyncStorage
              const keys = await AsyncStorage.getAllKeys();

              // Filter keys to remove answers, section completion, and profile summary
              const keysToRemove = keys.filter(
                (key) =>
                  key.startsWith('answer_') ||
                  key.startsWith('section_') ||
                  key === 'profile_summary'
              );

              // Remove all filtered keys
              await AsyncStorage.multiRemove(keysToRemove);

              // Reset state
              setAnswers([]);
              setCompletedSections([]);
              setAnswerCounts({});
              setProfileSummary(null);

              Alert.alert('Success', 'All answers have been cleared');
            } catch (error) {
              console.error('Failed to clear answers:', error);
              Alert.alert('Error', 'Failed to clear answers');
            }
          },
        },
      ]
    );
  };

  const hasAnswers = answers.length > 0;
  const allSectionsComplete = completedSections.length === SECTIONS.length;

  const handleResetOnboarding = async () => {
    Alert.alert(
      'Reset Onboarding',
      'This will reset the onboarding and name screen flags. You will need to restart the app to see the onboarding flow.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetOnboardingFlags();
            Alert.alert('Success', 'Flags reset! Please restart the app to see the onboarding flow.');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Your Profile</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.debugButton}
              onPress={handleResetOnboarding}
            >
              <Feather name="refresh-cw" size={18} color="#3b82f6" />
            </TouchableOpacity>
            {hasAnswers && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={clearAllAnswers}
              >
                <Feather name="trash-2" size={20} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* CTA Area */}
          <TouchableOpacity
            style={styles.ctaCard}
            onPress={() => navigation.navigate('QuestionFlowStack')}
          >
            <View style={styles.ctaContent}>
              <Text style={styles.ctaTitle}>
                {hasAnswers ? 'Continue Building Your Profile' : 'Start Building Your Profile'}
              </Text>
              <Text style={styles.ctaSubtitle}>
                {hasAnswers
                  ? 'Add more answers to complete your profile'
                  : 'Answer questions to create your community profile'}
              </Text>
            </View>
            <Feather name="arrow-right" size={24} color="#3b82f6" />
          </TouchableOpacity>

          {/* Progress Tracker */}
          <View style={styles.progressCard}>
            <Text style={styles.progressTitle}>Profile Progress</Text>
            <View style={styles.sectionsContainer}>
              {SECTIONS.map((section) => {
                const answerCount = answerCounts[section.id] || 0;
                const hasAnswers = answerCount > 0;
                return (
                  <View key={section.id} style={styles.sectionIndicator}>
                    <View
                      style={[
                        styles.sectionFeatherContainer,
                        {
                          backgroundColor: hasAnswers ? section.color : '#e5e7eb',
                        },
                      ]}
                    >
                      <Text style={[
                        styles.sectionCount,
                        { color: hasAnswers ? 'white' : '#9ca3af' }
                      ]}>
                        {answerCount}
                      </Text>
                    </View>
                    <Text style={styles.sectionLabel}>{section.name}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* AI Profile Summary */}
          {profileSummary && (
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Feather name="user" size={20} color="#3b82f6" />
                <Text style={styles.summaryTitle}>AI Profile Summary</Text>
              </View>

              {isEditingProfile ? (
                <TextInput
                  ref={textInputRef}
                  style={styles.summaryTextInput}
                  value={editedSummary}
                  onChangeText={setEditedSummary}
                  multiline
                  numberOfLines={10}
                  textAlignVertical="top"
                  autoFocus
                />
              ) : (
                <Text style={styles.summaryText}>{profileSummary}</Text>
              )}

              <View style={styles.summaryActions}>
                {isEditingProfile ? (
                  <>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => {
                        setIsEditingProfile(false);
                        setEditedSummary('');
                      }}
                    >
                      <Feather name="x" size={16} color="#ef4444" />
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.saveButton}
                      onPress={async () => {
                        try {
                          await AsyncStorage.setItem('profile_summary', editedSummary);
                          setProfileSummary(editedSummary);
                          setIsEditingProfile(false);
                          Alert.alert('Success', 'Profile updated!');
                        } catch (error) {
                          Alert.alert('Error', 'Failed to save changes');
                        }
                      }}
                    >
                      <Feather name="check" size={16} color="#10b981" />
                      <Text style={styles.saveButtonText}>Save</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => {
                        setEditedSummary(profileSummary);
                        setIsEditingProfile(true);
                      }}
                    >
                      <Feather name="edit-2" size={16} color="#3b82f6" />
                      <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.regenerateButton}
                      onPress={handleGenerateSummary}
                      disabled={generatingSummary}
                    >
                      {generatingSummary ? (
                        <ActivityIndicator size="small" color="#3b82f6" />
                      ) : (
                        <>
                          <Feather name="refresh-cw" size={16} color="#3b82f6" />
                          <Text style={styles.regenerateButtonText}>Regenerate</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          )}

          {/* Generate Button (if no summary yet) */}
          {!profileSummary && hasAnswers && (
            <TouchableOpacity
              style={styles.generateButton}
              onPress={handleGenerateSummary}
              disabled={generatingSummary}
            >
              {generatingSummary ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Feather name="cpu" size={20} color="white" />
                  <Text style={styles.generateButtonText}>Generate AI Profile Summary</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Answers List */}
          {hasAnswers && (
            <>
              <Text style={styles.answersHeader}>Your Answers</Text>
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
            </>
          )}
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
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  debugButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
  },
  clearButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  ctaCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  ctaContent: {
    flex: 1,
    marginRight: 16,
  },
  ctaTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 6,
  },
  ctaSubtitle: {
    fontSize: 15,
    color: '#3b82f6',
    lineHeight: 20,
  },
  progressCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  sectionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionIndicator: {
    alignItems: 'center',
    flex: 1,
  },
  sectionFeatherContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionCount: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  sectionLabel: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#374151',
    marginBottom: 16,
  },
  summaryTextInput: {
    fontSize: 15,
    lineHeight: 24,
    color: '#374151',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f0f9ff',
    minHeight: 200,
  },
  summaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  regenerateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  regenerateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  generateButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#3b82f6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  answersHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
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