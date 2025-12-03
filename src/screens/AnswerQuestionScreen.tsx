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
import { transcribeAudio } from '../services/api';

export default function AnswerQuestionScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { sectionId, questions } = route.params;

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
      Alert.alert('Error', 'Failed to start recording');
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    try {
      await recorder.stop();
      const uri = recorder.uri;
      setRecordingUri(uri || null);
      setIsRecording(false);
    } catch (err) {
      console.error('Failed to stop recording', err);
      Alert.alert('Error', 'Failed to stop recording');
      setIsRecording(false);
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
      const key = `answer_${sectionId}_${Date.now()}`;
      const answerData = {
        sectionId,
        question: currentQuestion,
        ...(recordingUri && { audioUri: recordingUri }), // Only if recorded
        transcript: transcript.trim(),
        timestamp: new Date().toISOString(),
      };

      await AsyncStorage.setItem(key, JSON.stringify(answerData));

      // Advance to next question or finish
      if (isLastQuestion) {
        await AsyncStorage.setItem(`section_${sectionId}_completed`, 'true');
        Alert.alert('Complete!', 'You have answered all questions in this section', [
          { text: 'OK', onPress: () => navigation.navigate('QuestionFlow') },
        ]);
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

  const saveAnswer = async () => {
    if (!recordingUri) {
      Alert.alert('No Recording', 'Please record your answer first');
      return;
    }

    try {
      console.log('[AnswerScreen] Starting save process...');

      // Validate file before transcription
      const fileInfo = await FileSystem.getInfoAsync(recordingUri);
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
      const transcriptText = await transcribeAudio(recordingUri);
      console.log('[AnswerScreen] Transcript received:', transcriptText);

      // NEW: Show transcript instead of auto-advancing
      setTranscript(transcriptText);
      setIsTranscribing(false);
      // User will now see transcript with "edit" link and "Done" button
    } catch (err) {
      console.error('[AnswerScreen] Failed to transcribe', err);
      setIsTranscribing(false);
      Alert.alert('Error', 'Failed to transcribe your answer');
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
        <Text style={styles.progress}>
          Question {currentQuestionIndex + 1} of {questions.length}
        </Text>
      </View>

      <View style={styles.content}>
        {/* Question at top */}
        <Text style={styles.question}>{currentQuestion}</Text>

        {/* Center area - Record/Stop button */}
        <View style={styles.centerButtonArea}>
          {/* Initial state - show record button */}
          {inputMode === 'idle' && !recordingUri && !transcript && !isTranscribing && !isRecording && (
            <TouchableOpacity style={styles.recordButton} onPress={startRecording}>
              <Feather name="mic" size={32} color="white" />
            </TouchableOpacity>
          )}

          {/* Recording state - show waveform + stop button */}
          {isRecording && (
            <>
              <Waveform isRecording={isRecording} />
              <TouchableOpacity
                style={[styles.recordButton, styles.recordingButton]}
                onPress={stopRecording}
              >
                <Feather name="square" size={32} color="white" />
              </TouchableOpacity>
            </>
          )}

          {/* After recording stopped - show play button */}
          {recordingUri && !isTranscribing && !transcript && (
            <TouchableOpacity
              style={styles.playButton}
              onPress={player.playing ? stopPlayback : playRecording}
            >
              <Feather
                name={player.playing ? 'pause' : 'play'}
                size={32}
                color="white"
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Text area - fixed height with scroll */}
        <View style={styles.textDisplayArea}>
          {/* Transcribing loader */}
          {isTranscribing && (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.loaderText}>Transcribing your answer...</Text>
            </View>
          )}

          {/* Transcript display */}
          {transcript && !isEditingTranscript && inputMode === 'idle' && (
            <ScrollView style={styles.scrollableTextBox}>
              <Text style={styles.transcriptText}>{transcript}</Text>
            </ScrollView>
          )}

          {/* Editing transcript */}
          {isEditingTranscript && (
            <TextInput
              style={styles.scrollableTextInput}
              value={editedTranscript}
              onChangeText={setEditedTranscript}
              multiline
              autoFocus
              placeholder="Edit your answer..."
            />
          )}

          {/* Typing mode */}
          {inputMode === 'typing' && !transcript && (
            <TextInput
              style={styles.scrollableTextInput}
              value={typedAnswer}
              onChangeText={setTypedAnswer}
              multiline
              autoFocus
              placeholder="Type your answer here..."
            />
          )}
        </View>

        {/* Bottom actions */}
        <View style={styles.bottomActions}>
          {/* Initial state - "I'd rather type" link */}
          {inputMode === 'idle' && !recordingUri && !transcript && !isTranscribing && !isRecording && (
            <TouchableOpacity style={styles.typeLink} onPress={handleTypeInstead}>
              <Text style={styles.typeLinkText}>I'd rather type</Text>
            </TouchableOpacity>
          )}

          {/* After recording stopped - re-record option */}
          {recordingUri && !isTranscribing && !transcript && (
            <TouchableOpacity style={styles.rerecordLink} onPress={startRecording}>
              <Feather name="rotate-ccw" size={18} color="#3b82f6" />
              <Text style={styles.rerecordLinkText}>Re-record</Text>
            </TouchableOpacity>
          )}

          {/* Transcript display - edit link and done button */}
          {transcript && !isEditingTranscript && inputMode === 'idle' && (
            <>
              <TouchableOpacity style={styles.editActionLink} onPress={handleStartEditing}>
                <Text style={styles.editActionLinkText}>edit transcript</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Editing mode - save/cancel buttons */}
          {isEditingTranscript && (
            <View style={styles.buttonRow}>
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

          {/* Typing mode - continue/cancel buttons */}
          {inputMode === 'typing' && !transcript && (
            <View style={styles.buttonRow}>
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

          {/* Recording state - Tap to stop message */}
          {isRecording && (
            <Text style={styles.recordingHint}>Tap to stop recording</Text>
          )}

          {/* After recording - Next Question button */}
          {recordingUri && !isTranscribing && !transcript && (
            <TouchableOpacity style={styles.nextButton} onPress={saveAnswer}>
              <Text style={styles.nextButtonText}>
                {isLastQuestion ? 'Finish' : 'Next Question'}
              </Text>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  question: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 32,
  },
  centerButtonArea: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    marginBottom: 24,
  },
  textDisplayArea: {
    flex: 1,
    marginBottom: 16,
  },
  bottomActions: {
    paddingBottom: 20,
    alignItems: 'center',
    gap: 12,
  },
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
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 8,
    padding: 24,
  },
  loaderText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 16,
    textAlign: 'center',
  },
  scrollableTextBox: {
    flex: 1,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 8,
    padding: 16,
  },
  scrollableTextInput: {
    flex: 1,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    textAlignVertical: 'top',
  },
  transcriptText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#111827',
  },
  typeLink: {
    padding: 12,
  },
  typeLinkText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  rerecordLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
  },
  rerecordLinkText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },
  editActionLink: {
    padding: 8,
  },
  editActionLinkText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  recordingHint: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    paddingHorizontal: 20,
  },
  nextButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 16,
    width: '100%',
    alignItems: 'center',
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  doneButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 16,
    width: '100%',
    alignItems: 'center',
  },
  doneButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  continueButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  continueButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6b7280',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#10b981',
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});