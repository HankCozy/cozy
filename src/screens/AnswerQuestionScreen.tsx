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
        <Text style={styles.question}>{currentQuestion}</Text>

        <View style={styles.controlsContainer}>
          {/* State 1: Initial (idle, no recording, no transcript) */}
          {inputMode === 'idle' && !recordingUri && !transcript && !isTranscribing && (
            <View style={styles.initialControls}>
              <TouchableOpacity style={styles.recordButton} onPress={startRecording}>
                <Feather name="mic" size={32} color="white" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.typeLink} onPress={handleTypeInstead}>
                <Text style={styles.typeLinkText}>I'd rather type</Text>
              </TouchableOpacity>
              <Text style={styles.statusText}>Tap to start recording</Text>
            </View>
          )}

          {/* State 2: Recording */}
          {isRecording && (
            <View style={styles.recordingControls}>
              <Waveform isRecording={isRecording} />
              <TouchableOpacity
                style={[styles.recordButton, styles.recordingButton]}
                onPress={stopRecording}
              >
                <Feather name="square" size={32} color="white" />
              </TouchableOpacity>
              <Text style={styles.statusText}>Recording... Tap to stop</Text>
            </View>
          )}

          {/* State 3: Transcribing */}
          {isTranscribing && (
            <View style={styles.transcribingControls}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.statusText}>Transcribing your answer...</Text>
            </View>
          )}

          {/* State 4: Transcript Display (with edit and done) */}
          {transcript && !isTranscribing && !isEditingTranscript && inputMode === 'idle' && (
            <View style={styles.transcriptControls}>
              <View style={styles.transcriptBox}>
                <Text style={styles.transcriptText}>{transcript}</Text>
                <TouchableOpacity style={styles.editLink} onPress={handleStartEditing}>
                  <Text style={styles.editLinkText}>edit</Text>
                </TouchableOpacity>
              </View>

              {recordingUri && (
                <View style={styles.playbackControls}>
                  <TouchableOpacity
                    style={styles.playButton}
                    onPress={player.playing ? stopPlayback : playRecording}
                  >
                    <Feather name={player.playing ? 'pause' : 'play'} size={32} color="white" />
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* State 5: Editing Transcript */}
          {isEditingTranscript && (
            <View style={styles.editTranscriptControls}>
              <TextInput
                style={styles.textInput}
                value={editedTranscript}
                onChangeText={setEditedTranscript}
                multiline
                autoFocus
                placeholder="Edit your answer..."
              />
              <View style={styles.editButtonsRow}>
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
            </View>
          )}

          {/* State 6: Typing Mode */}
          {inputMode === 'typing' && !transcript && (
            <View style={styles.typingControls}>
              <TextInput
                style={styles.textInput}
                value={typedAnswer}
                onChangeText={setTypedAnswer}
                multiline
                autoFocus
                placeholder="Type your answer here..."
              />
              <View style={styles.editButtonsRow}>
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
                  style={styles.doneButton}
                  onPress={handleSaveTypedAnswer}
                >
                  <Text style={styles.doneButtonText}>Continue</Text>
                </TouchableOpacity>
              </View>
            </View>
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
    justifyContent: 'center',
  },
  question: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 60,
  },
  controlsContainer: {
    alignItems: 'center',
    marginBottom: 40,
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
  playbackControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
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
  rerecordButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 20,
    textAlign: 'center',
  },
  nextButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Type link
  typeLink: {
    marginTop: 20,
    padding: 8,
  },
  typeLinkText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  // Text input (typing and editing)
  textInput: {
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#f0f9ff',
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  // Transcript display
  transcriptControls: {
    width: '100%',
    alignItems: 'center',
  },
  transcriptBox: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    width: '100%',
  },
  transcriptText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#111827',
    marginBottom: 8,
  },
  editLink: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  editLinkText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },
  // Button rows
  editButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
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
  // Done button (replaces nextButton)
  doneButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    width: '100%',
    marginTop: 20,
  },
  doneButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Container styles
  initialControls: {
    alignItems: 'center',
  },
  recordingControls: {
    alignItems: 'center',
  },
  transcribingControls: {
    alignItems: 'center',
  },
  typingControls: {
    width: '100%',
  },
  editTranscriptControls: {
    width: '100%',
  },
});