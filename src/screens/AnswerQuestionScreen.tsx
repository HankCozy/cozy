import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  useAudioRecorder,
  useAudioPlayer,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
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
        });

        // Request permissions
        const { granted } = await requestRecordingPermissionsAsync();
        setPermissionGranted(granted);
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

  const saveAnswer = async () => {
    if (!recordingUri) {
      Alert.alert('No Recording', 'Please record your answer first');
      return;
    }

    try {
      console.log('[AnswerScreen] Starting save process...');
      // Start transcription
      setIsTranscribing(true);
      console.log('[AnswerScreen] Calling transcribeAudio...');
      const transcript = await transcribeAudio(recordingUri);
      console.log('[AnswerScreen] Transcript received:', transcript);

      // Save to AsyncStorage with transcript
      const key = `answer_${sectionId}_${Date.now()}`;
      const answerData = {
        sectionId,
        question: currentQuestion,
        audioUri: recordingUri,
        transcript,
        timestamp: new Date().toISOString(),
      };
      console.log('[AnswerScreen] Saving to AsyncStorage:', key, answerData);
      await AsyncStorage.setItem(key, JSON.stringify(answerData));
      console.log('[AnswerScreen] Saved successfully');

      setIsTranscribing(false);

      // Move to next question or finish
      if (isLastQuestion) {
        // Mark section as completed
        await AsyncStorage.setItem(`section_${sectionId}_completed`, 'true');

        Alert.alert(
          'Complete!',
          'You have answered all questions in this section',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('QuestionFlow'),
            },
          ]
        );
      } else {
        setCurrentQuestionIndex((prev) => prev + 1);
        setRecordingUri(null);
      }
    } catch (err) {
      console.error('[AnswerScreen] Failed to save answer', err);
      setIsTranscribing(false);
      Alert.alert('Error', 'Failed to transcribe or save your answer');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.progress}>
          Question {currentQuestionIndex + 1} of {questions.length}
        </Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.question}>{currentQuestion}</Text>

        <View style={styles.controlsContainer}>
          {!isRecording && !recordingUri && !isTranscribing && (
            <TouchableOpacity
              style={styles.recordButton}
              onPress={startRecording}
            >
              <Icon name="mic" size={32} color="white" />
            </TouchableOpacity>
          )}

          {isRecording && (
            <>
              <Waveform isRecording={isRecording} />
              <TouchableOpacity
                style={[styles.recordButton, styles.recordingButton]}
                onPress={stopRecording}
              >
                <Icon name="square" size={32} color="white" />
              </TouchableOpacity>
            </>
          )}

          {recordingUri && !isTranscribing && (
            <View style={styles.playbackControls}>
              <TouchableOpacity
                style={styles.playButton}
                onPress={player.playing ? stopPlayback : playRecording}
              >
                <Icon
                  name={player.playing ? 'pause' : 'play'}
                  size={32}
                  color="white"
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rerecordButton}
                onPress={startRecording}
              >
                <Icon name="rotate-ccw" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
          )}

          {isTranscribing && (
            <ActivityIndicator size="large" color="#3b82f6" />
          )}

          <Text style={styles.statusText}>
            {isTranscribing
              ? 'Transcribing your answer...'
              : isRecording
              ? 'Recording... Tap to stop'
              : recordingUri
              ? 'Tap play to review'
              : 'Tap to start recording'}
          </Text>
        </View>

        {recordingUri && !isTranscribing && (
          <TouchableOpacity style={styles.nextButton} onPress={saveAnswer}>
            <Text style={styles.nextButtonText}>
              {isLastQuestion ? 'Finish' : 'Next Question'}
            </Text>
          </TouchableOpacity>
        )}
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
});