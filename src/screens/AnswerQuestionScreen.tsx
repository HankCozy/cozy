import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Platform,
  TextInput,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  useAudioRecorder,
  useAudioPlayer,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import Waveform from '../components/Waveform';
import ProfileStrengthIndicator from '../components/ProfileStrengthIndicator';
import { transcribeAudio } from '../services/api';
import { SECTION_BOUNDARIES } from './SectionQuestionsScreen';

// Helper to determine which section a question belongs to
function getSectionIdForQuestionIndex(index: number): string {
  if (index <= SECTION_BOUNDARIES.intro_identity.end) return 'intro_identity';
  if (index <= SECTION_BOUNDARIES.interests.end) return 'interests';
  if (index <= SECTION_BOUNDARIES.relationships.end) return 'relationships';
  return 'community';
}

export default function AnswerQuestionScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { sectionId, questions, isFirstTimeOnboarding } = route.params;

  // Safety check
  if (!questions || questions.length === 0) {
    console.error('[AnswerScreen] No questions provided');
    navigation.goBack();
    return null;
  }

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // NEW STATE - Input mode and transcript
  const [inputMode, setInputMode] = useState<'idle' | 'recording' | 'typing'>('idle');
  const [transcript, setTranscript] = useState<string | null>(null);
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [editedTranscript, setEditedTranscript] = useState('');
  const [typedAnswer, setTypedAnswer] = useState('');
  const [totalAnswers, setTotalAnswers] = useState(0);

  // Use platform-specific recording presets
  // LOW_QUALITY may work better on Android emulator
  const recordingPreset = Platform.OS === 'android'
    ? RecordingPresets.LOW_QUALITY
    : RecordingPresets.HIGH_QUALITY;
  const recorder = useAudioRecorder(recordingPreset);
  const player = useAudioPlayer(recordingUri || '');

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  useEffect(() => {
    const setupAudio = async () => {
      try {
        // Configure audio mode for recording
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: true,
          shouldPlayInBackground: false,
          interruptionModeAndroid: 'duckOthers', // Android-specific audio handling
          interruptionMode: 'mixWithOthers', // iOS behavior
        });

        // Request permissions
        const { granted } = await requestRecordingPermissionsAsync();
        setPermissionGranted(granted);

        // Select microphone input on Android
        if (granted && Platform.OS === 'android') {
          try {
            const inputs = await recorder.getAvailableInputs();
            console.log('[AnswerScreen] Available audio inputs:', inputs);

            const micInput = inputs.find(input =>
              input.name.toLowerCase().includes('mic') ||
              input.name.toLowerCase().includes('phone')
            );

            if (micInput) {
              await recorder.setInput(micInput);
              console.log('[AnswerScreen] Selected microphone input:', micInput.name);
            } else {
              console.warn('[AnswerScreen] No microphone input found, using default');
            }
          } catch (err) {
            console.warn('[AnswerScreen] Could not set audio input:', err);
          }
        }
      } catch (err) {
        console.error('Failed to setup audio', err);
      }
    };

    setupAudio();
  }, []);

  useEffect(() => {
    const loadTotalAnswers = async () => {
      const keys = await AsyncStorage.getAllKeys();
      const answerKeys = keys.filter((key) => key.startsWith('answer_'));
      setTotalAnswers(answerKeys.length);
    };
    loadTotalAnswers();
  }, [currentQuestionIndex]);

  const startRecording = async () => {
    try {
      if (!permissionGranted) {
        Alert.alert('Permission Required', 'Please allow microphone access to record audio');
        return;
      }

      setRecordingUri(null);
      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
      // Reset to initial state on error
      setIsRecording(false);
      setRecordingUri(null);
      setTranscript(null);
      setInputMode('idle');
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    try {
      await recorder.stop();
      const uri = recorder.uri;
      setRecordingUri(uri || null);
      setIsRecording(false);

      // Immediately start transcribing after recording stops
      if (uri) {
        saveAnswer(uri);
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
      // Reset to initial state on error
      setIsRecording(false);
      setRecordingUri(null);
      setTranscript(null);
      setInputMode('idle');
      Alert.alert('Error', 'Failed to stop recording. Please try again.');
    }
  };

  const playRecording = () => {
    if (recordingUri) {
      player.play();
    }
  };

  const stopPlayback = () => {
    player.pause();
  };

  const handleTypeInstead = () => {
    setInputMode('typing');
    setRecordingUri(null);
    setTranscript(null);
  };

  const handleStartEditing = () => {
    if (!transcript) return;
    setIsEditingTranscript(true);
    setEditedTranscript(transcript);
  };

  const handleSaveEditedTranscript = () => {
    if (!editedTranscript.trim()) {
      Alert.alert('Empty Text', 'Please type something before saving');
      return;
    }
    setTranscript(editedTranscript.trim());
    setIsEditingTranscript(false);
    setEditedTranscript('');
  };

  const handleSaveTypedAnswer = async () => {
    if (!typedAnswer.trim()) {
      Alert.alert('Empty Answer', 'Please type an answer before continuing');
      return;
    }

    // Set transcript and proceed to Done flow
    setTranscript(typedAnswer.trim());
    setInputMode('idle');
  };

  const handleDone = async () => {
    if (!transcript) {
      Alert.alert('No Content', 'Please provide an answer before continuing');
      return;
    }

    try {
      // Determine which section this question belongs to
      const actualSectionId = sectionId === 'all'
        ? getSectionIdForQuestionIndex(currentQuestionIndex)
        : sectionId;

      const key = `answer_${actualSectionId}_${Date.now()}`;
      const answerData = {
        sectionId: actualSectionId,
        question: currentQuestion,
        ...(recordingUri && { audioUri: recordingUri }), // Only if recorded
        transcript: transcript.trim(),
        timestamp: new Date().toISOString(),
      };

      await AsyncStorage.setItem(key, JSON.stringify(answerData));

      // Immediately update total count
      const allKeys = await AsyncStorage.getAllKeys();
      const answerKeys = allKeys.filter((k) => k.startsWith('answer_'));
      setTotalAnswers(answerKeys.length);

      // Advance to next question or finish
      if (isLastQuestion) {
        // If first-time onboarding, mark as complete and navigate to profile
        if (isFirstTimeOnboarding) {
          await AsyncStorage.setItem('onboarding_completed', 'true');
          navigation.getParent()?.navigate('MainTabs', { screen: 'Profile' });
        } else {
          // Regular flow - mark section complete and go back
          await AsyncStorage.setItem(`section_${actualSectionId}_completed`, 'true');
          navigation.navigate('QuestionFlow');
        }
      } else {
        // Reset for next question
        setCurrentQuestionIndex((prev) => prev + 1);
        setRecordingUri(null);
        setTranscript(null);
        setInputMode('idle');
        setIsEditingTranscript(false);
        setEditedTranscript('');
        setTypedAnswer('');
      }
    } catch (err) {
      console.error('[AnswerScreen] Failed to save answer', err);
      Alert.alert('Error', 'Failed to save your answer');
    }
  };

  const saveAnswer = async (uri?: string) => {
    const audioUri = uri || recordingUri;

    if (!audioUri) {
      Alert.alert('No Recording', 'Please record your answer first');
      return;
    }

    try {
      console.log('[AnswerScreen] Starting save process...');

      // Validate file before transcription
      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      console.log('[AnswerScreen] File info:', fileInfo);

      if (!fileInfo.exists) {
        throw new Error('Recording file does not exist');
      }

      if (fileInfo.size === 0 || fileInfo.size < 1000) {
        throw new Error(`Recording file is invalid (size: ${fileInfo.size} bytes)`);
      }

      console.log('[AnswerScreen] File validation passed - size:', fileInfo.size, 'bytes');

      // Start transcription
      setIsTranscribing(true);
      console.log('[AnswerScreen] Calling transcribeAudio...');
      const transcriptText = await transcribeAudio(audioUri);
      console.log('[AnswerScreen] Transcript received:', transcriptText);

      // NEW: Show transcript instead of auto-advancing
      setTranscript(transcriptText);
      setIsTranscribing(false);
      // User will now see transcript with "edit" link and "Done" button
    } catch (err) {
      console.error('[AnswerScreen] Failed to transcribe', err);
      // Reset to initial state on error
      setIsTranscribing(false);
      setRecordingUri(null);
      setTranscript(null);
      setInputMode('idle');
      setIsRecording(false);
      Alert.alert('Error', 'Failed to transcribe your answer. Please try again.');
    }
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
        {!(isFirstTimeOnboarding && currentQuestionIndex === 0) && (
          <View style={styles.strengthIndicatorContainer}>
            <ProfileStrengthIndicator
              totalAnswers={totalAnswers}
              showLabel={false}
              compact={true}
            />
            <Text style={styles.questionCounter}>Profile Strength</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        {/* Question at top */}
        <Text style={styles.question}>{currentQuestion}</Text>

        {/* Center content area - scrollable */}
        <View style={styles.centerContent}>
          {/* Recording UI - button stays in same position, changes color only */}
          {(inputMode === 'idle' && !recordingUri && !transcript && !isTranscribing) && (
            <View style={styles.recordButtonContainer}>
              <TouchableOpacity
                style={[
                  styles.recordButton,
                  isRecording && styles.recordingButton
                ]}
                onPress={isRecording ? stopRecording : startRecording}
              >
                <Feather
                  name={isRecording ? "square" : "mic"}
                  size={32}
                  color="white"
                />
              </TouchableOpacity>
              {!isRecording && (
                <View style={styles.hintTextContainer}>
                  <Text style={styles.buttonHintText}>Tap to start recording or </Text>
                  <TouchableOpacity onPress={handleTypeInstead}>
                    <Text style={styles.typeLink}>type instead</Text>
                  </TouchableOpacity>
                </View>
              )}
              {isRecording && (
                <Text style={styles.centerHintText}>Recording</Text>
              )}
              <Waveform isRecording={isRecording} />
              {isFirstTimeOnboarding && currentQuestionIndex === 0 && !isRecording && (
                <View style={styles.privacyBox}>
                  <Text style={styles.privacyLabel}>Remember: your audio is not saved or shared</Text>
                </View>
              )}
            </View>
          )}

          {/* Transcribing - loader in center */}
          {isTranscribing && (
            <View style={styles.transcribingContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.centerHintText}>Transcribing your answer...</Text>
            </View>
          )}

          {/* Transcript display - scrollable text */}
          {transcript && !isEditingTranscript && inputMode === 'idle' && (
            <View style={styles.transcriptWrapper}>
              <Text style={styles.transcriptLabel}>Your response:</Text>
              <View style={styles.transcriptBox}>
                <Text style={styles.transcriptText}>{transcript}</Text>
              </View>
              <TouchableOpacity
                style={styles.editLinkButton}
                onPress={handleStartEditing}
              >
                <Text style={styles.editLinkText}>Edit</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Editing transcript - text input */}
          {isEditingTranscript && (
            <View style={styles.editWrapper}>
              <Text style={styles.transcriptLabel}>Your response:</Text>
              <TextInput
                style={styles.editTextInput}
                value={editedTranscript}
                onChangeText={setEditedTranscript}
                multiline
                autoFocus
                placeholder="Edit your answer..."
              />
            </View>
          )}

          {/* Typing mode - text input */}
          {inputMode === 'typing' && !transcript && (
            <TextInput
              style={styles.typeTextInput}
              value={typedAnswer}
              onChangeText={setTypedAnswer}
              multiline
              autoFocus
              placeholder="Type your answer here..."
            />
          )}
        </View>

        {/* Bottom area - status, links, buttons */}
        <View style={styles.bottomArea}>

          {/* Transcript shown - Next button */}
          {transcript && !isEditingTranscript && inputMode === 'idle' && (
            <TouchableOpacity style={styles.nextButton} onPress={handleDone}>
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          )}

          {/* Editing mode - Save/Cancel buttons */}
          {isEditingTranscript && (
            <View style={styles.editButtonRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setIsEditingTranscript(false);
                  setEditedTranscript('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveEditedTranscript}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Typing mode - Continue/Cancel buttons */}
          {inputMode === 'typing' && !transcript && (
            <View style={styles.editButtonRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setInputMode('idle');
                  setTypedAnswer('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.continueButton}
                onPress={handleSaveTypedAnswer}
              >
                <Text style={styles.continueButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* View Profile link - only show when transcript is visible */}
          {!isFirstTimeOnboarding && transcript && !isTranscribing && !isEditingTranscript && inputMode === 'idle' && (
            <TouchableOpacity
              style={styles.viewProfileLink}
              onPress={() => {
                navigation.getParent()?.navigate('MainTabs', { screen: 'Profile' });
              }}
            >
              <Text style={styles.viewProfileLinkText}>View Profile</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
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
  progress: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
    textAlign: 'center',
  },
  strengthIndicatorContainer: {
    alignItems: 'center',
    paddingHorizontal: 60,
    gap: 8,
  },
  questionCounter: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9ca3af',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  question: {
    fontSize: 36,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 60,
    paddingHorizontal: 20,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 40,
  },
  bottomArea: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 16,
    minHeight: 100,
  },
  // Containers
  recordButtonContainer: {
    alignItems: 'center',
    marginTop: 60,
    minHeight: 200,
  },
  playbackContainer: {
    alignItems: 'center',
  },
  transcribingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  transcriptWrapper: {
    width: '100%',
    paddingHorizontal: 20,
  },
  transcriptBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 20,
    marginTop: 8,
  },
  editWrapper: {
    width: '100%',
    paddingHorizontal: 20,
  },

  // Buttons
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  recordingButton: {
    backgroundColor: '#ef4444',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },

  // Text elements
  privacyBox: {
    backgroundColor: '#eff6ff',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 24,
  },
  privacyLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
    lineHeight: 22,
  },
  hintTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  buttonHintText: {
    fontSize: 14,
    color: '#6b7280',
  },
  typeLink: {
    fontSize: 14,
    color: '#3b82f6',
    textDecorationLine: 'underline',
  },
  centerHintText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 16,
    textAlign: 'center',
  },
  transcriptLabel: {
    fontSize: 16,
    fontWeight: '400',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  transcriptText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#111827',
    textAlign: 'left',
    marginBottom: 12,
  },
  editLinkCenter: {
    alignSelf: 'center',
    marginTop: 8,
    padding: 8,
  },
  editLinkButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    padding: 4,
  },
  editLinkText: {
    fontSize: 14,
    color: '#9ca3af',
    textDecorationLine: 'underline',
  },
  bottomLinkText: {
    fontSize: 14,
    color: '#9ca3af',
    textDecorationLine: 'underline',
  },
  fineTuneMessage: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    paddingHorizontal: 40,
  },

  // Text inputs
  editTextInput: {
    width: '100%',
    minHeight: 200,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 20,
    fontSize: 16,
    color: '#111827',
    textAlignVertical: 'top',
    marginTop: 8,
  },
  typeTextInput: {
    width: '100%',
    minHeight: 200,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    textAlignVertical: 'top',
  },

  // Bottom buttons
  finishButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 48,
    alignItems: 'center',
    minWidth: 200,
  },
  finishButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  editButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  editButtonText: {
    color: '#6b7280',
    fontWeight: '600',
    fontSize: 16,
  },
  doneButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  doneButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 48,
    alignItems: 'center',
    width: '100%',
  },
  nextButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  editButtonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontWeight: '600',
    fontSize: 16,
  },
  saveButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#10b981',
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  continueButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  continueButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  navControls: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 20,
    paddingBottom: 8,
  },
  navButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#d1d5db',
    backgroundColor: 'white',
    alignItems: 'center',
  },
  navButtonActive: {
    borderColor: '#84cc16',
    backgroundColor: '#f7fee7',
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  navButtonTextActive: {
    color: '#84cc16',
  },
  viewProfileLink: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  viewProfileLinkText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
    textDecorationLine: 'underline',
  },
});