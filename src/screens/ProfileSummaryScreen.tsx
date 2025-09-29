import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import { useAudioPlayer } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AnswerData {
  sectionId: string;
  question: string;
  audioUri: string;
  timestamp: string;
}

const SECTION_NAMES: Record<string, string> = {
  identity: 'Identity',
  relationships: 'Relationships',
  lifestyle: 'Lifestyle',
  community: 'Community',
};

export default function ProfileSummaryScreen() {
  const navigation = useNavigation<any>();
  const [answers, setAnswers] = useState<AnswerData[]>([]);
  const [playingUri, setPlayingUri] = useState<string | null>(null);
  const player = useAudioPlayer(playingUri || '');

  useEffect(() => {
    loadAnswers();
  }, []);

  useEffect(() => {
    if (player.playing) {
      // Monitor when playback finishes
      const interval = setInterval(() => {
        if (!player.playing) {
          setPlayingUri(null);
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, [player.playing]);

  const loadAnswers = async () => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const answerKeys = allKeys.filter(key => key.startsWith('answer_'));
      const answerData = await AsyncStorage.multiGet(answerKeys);

      const parsedAnswers: AnswerData[] = answerData
        .map(([, value]) => JSON.parse(value || '{}'))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setAnswers(parsedAnswers);
    } catch (err) {
      console.error('Failed to load answers', err);
    }
  };

  const togglePlay = (uri: string) => {
    if (playingUri === uri && player.playing) {
      player.pause();
      setPlayingUri(null);
    } else {
      setPlayingUri(uri);
      player.play();
    }
  };

  const groupedAnswers = answers.reduce((acc, answer) => {
    if (!acc[answer.sectionId]) {
      acc[answer.sectionId] = [];
    }
    acc[answer.sectionId].push(answer);
    return acc;
  }, {} as Record<string, AnswerData[]>);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.title}>Profile Summary</Text>
        <Text style={styles.subtitle}>
          Review your recorded answers
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {Object.keys(groupedAnswers).length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="mic-off" size={48} color="#9ca3af" />
            <Text style={styles.emptyText}>No answers recorded yet</Text>
          </View>
        ) : (
          Object.entries(groupedAnswers).map(([sectionId, sectionAnswers]) => (
            <View key={sectionId} style={styles.sectionGroup}>
              <Text style={styles.sectionTitle}>
                {SECTION_NAMES[sectionId] || sectionId}
              </Text>
              {sectionAnswers.map((answer, index) => (
                <View key={index} style={styles.answerCard}>
                  <Text style={styles.question}>{answer.question}</Text>
                  <View style={styles.audioControl}>
                    <TouchableOpacity
                      style={styles.playButton}
                      onPress={() => togglePlay(answer.audioUri)}
                    >
                      <Icon
                        name={playingUri === answer.audioUri && player.playing ? 'pause' : 'play'}
                        size={20}
                        color="white"
                      />
                    </TouchableOpacity>
                    <Text style={styles.audioLabel}>
                      {playingUri === answer.audioUri && player.playing ? 'Playing...' : 'Tap to play'}
                    </Text>
                  </View>
                  <Text style={styles.timestamp}>
                    {new Date(answer.timestamp).toLocaleDateString()} at{' '}
                    {new Date(answer.timestamp).toLocaleTimeString()}
                  </Text>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
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
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 16,
  },
  sectionGroup: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  answerCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  question: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  audioControl: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  audioLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  timestamp: {
    fontSize: 12,
    color: '#9ca3af',
  },
});