import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  ViewToken,
  Alert,
} from 'react-native';
import { Audio } from 'expo-audio';
import { useAuth, User } from '../contexts/AuthContext';
import OnboardingGraphic from '../components/OnboardingGraphic';
import { ALL_QUESTIONS_ORDERED } from './SectionQuestionsScreen';

const { width } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  subtitle?: string;
  icon: string;
  showButton?: boolean;
  buttonText?: string;
}

const slides: OnboardingSlide[] = [
  {
    id: '1',
    title: '',
    description: 'Cozy Circle turns your words into a magazine-style profile about you.',
    icon: '', // Using custom graphic instead
  },
  {
    id: '2',
    title: 'Your story stays inside your community.',
    description: 'Only your community members get to enjoy your profile. And you get to see theirs.',
    subtitle: "It's a simple way to discover your circle.",
    icon: '⭕',
  },
  {
    id: '3',
    title: 'No forms. No fuss. Just you, being you.',
    description: "We'll ask some questions and you simply respond like you're talking to a friend.",
    icon: '🎙️',
    showButton: true,
    buttonText: 'Enable microphone',
  },
  {
    id: '4',
    title: 'Kick back, relax and just be you.',
    description: 'Take your time. Speak naturally. This is your moment to shine a little. The more you share, the richer your profile.',
    icon: '🎙️',
    showButton: true,
    buttonText: "Let's get cozy",
  },
];

interface OnboardingScreenProps {
  navigation: any;
  route: {
    params?: {
      user: User;
      token: string;
    };
  };
}

export default function OnboardingScreen({ navigation, route }: OnboardingScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const { completeOnboarding } = useAuth();

  const handleButtonPress = async (slide: OnboardingSlide) => {
    if (slide.id === '3') {
      // Enable microphone button - request permissions
      try {
        const { status } = await Audio.requestPermissionsAsync();
        if (status === 'granted') {
          Alert.alert('Success', 'Microphone access granted!');
        } else {
          Alert.alert(
            'Permission Denied',
            "No worries! We'll ask again when you start recording."
          );
        }
      } catch (error) {
        console.error('Error requesting microphone permission:', error);
      }
      // Move to next slide regardless of permission result
      if (currentIndex < slides.length - 1) {
        flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      }
    } else if (slide.id === '4') {
      // Let's get cozy button - navigate to first question
      if (route.params?.user && route.params?.token) {
        // Coming from registration - complete onboarding and authenticate first
        await completeOnboarding(route.params.user, route.params.token);
      }

      // Navigate to all 16 questions for first-time onboarding
      navigation.navigate('QuestionFlowStack', {
        screen: 'AnswerQuestion',
        params: {
          sectionId: 'all',
          questions: ALL_QUESTIONS_ORDERED,
          isFirstTimeOnboarding: true,
        },
      });
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const renderSlide = ({ item }: { item: OnboardingSlide }) => (
    <View style={styles.slide}>
      <View style={styles.content}>
        {item.id === '1' ? (
          <OnboardingGraphic />
        ) : (
          <Text style={styles.icon}>{item.icon}</Text>
        )}
        {item.title !== '' && (
          <Text style={styles.title}>{item.title}</Text>
        )}
        <Text style={styles.description}>{item.description}</Text>
        {item.subtitle && (
          <Text style={styles.subtitle}>{item.subtitle}</Text>
        )}
        {item.showButton && item.buttonText && (
          <TouchableOpacity
            style={item.id === '4' ? styles.primaryButton : styles.secondaryButton}
            onPress={() => handleButtonPress(item)}
          >
            <Text style={item.id === '4' ? styles.primaryButtonText : styles.secondaryButtonText}>
              {item.buttonText}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderDots = () => (
    <View style={styles.dotsContainer}>
      {slides.map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            currentIndex === index && styles.activeDot,
          ]}
        />
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />

      {renderDots()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  slide: {
    width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  content: {
    alignItems: 'center',
    maxWidth: 360,
  },
  icon: {
    fontSize: 120,
    marginBottom: 48,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 30,
  },
  description: {
    fontSize: 17,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 17,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 26,
    marginTop: 8,
  },
  secondaryButton: {
    marginTop: 40,
    paddingVertical: 14,
    paddingHorizontal: 32,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: 40,
    paddingVertical: 16,
    paddingHorizontal: 32,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 60,
  },
  dot: {
    width: 60,
    height: 3,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#111827',
  },
});
