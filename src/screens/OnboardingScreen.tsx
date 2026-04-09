import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  ViewToken,
  Animated,
  SafeAreaView,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { useAuth, User } from '../contexts/AuthContext';
import { navigationRef } from '../services/navigationService';
import { ALL_QUESTIONS_ORDERED } from './SectionQuestionsScreen';

const { width } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  showButton?: boolean;
  buttonText?: string;
}

const createSlides = (communityName: string): OnboardingSlide[] => [
  {
    id: '1',
    title: 'Welcome to Cozy Circle',
    description: 'An app that fosters\nreal world connection.',
  },
  {
    id: '3',
    title: 'Cozy Circle helps you find connection points.',
    description: '',
  },
  {
    id: '5',
    title: 'And foster real, in-person engagement.',
    description: '',
  },
  {
    id: '5b',
    title: `Cozy Circle brings you closer to the people of ${communityName}`,
    description: `This is a private community. Only members of ${communityName} can access your Cozy Circle profile.`,
  },
  {
    id: '6',
    title: "You tell us about yourself and we'll turn your words into points of connection.",
    description: '',
    showButton: true,
    buttonText: 'Get started',
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

  // Drives Lottie scrubbing — maps scroll offset to 0–1
  const scrollX = useRef(new Animated.Value(0)).current;

  const communityName = route.params?.user?.community?.organization || 'Your Community';
  const slides = createSlides(communityName);

  // progress 0→1 across all slides
  const lottieProgress = Animated.divide(scrollX, width * (slides.length - 1));

  const handleGetStarted = async () => {
    if (route.params?.user && route.params?.token) {
      await completeOnboarding(route.params.user, route.params.token);
      setTimeout(() => {
        navigationRef.navigate('QuestionFlowStack', {
          screen: 'AnswerQuestion',
          params: {
            sectionId: 'all',
            questions: ALL_QUESTIONS_ORDERED,
            isFirstTimeOnboarding: true,
          },
        });
      }, 0);
    } else {
      navigation.navigate('Questions');
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const renderSlide = ({ item }: { item: OnboardingSlide }) => (
    <View style={styles.slide}>
      {item.id === '5b' ? (
        <Text style={styles.title}>
          Cozy Circle brings you closer to the people of{' '}
          <Text style={styles.underline}>{communityName}</Text>
        </Text>
      ) : (
        <Text style={styles.title}>{item.title}</Text>
      )}
      {item.id === '5b' ? (
        <Text style={styles.description}>
          This is a private community. Only members of{' '}
          <Text style={styles.underline}>{communityName}</Text>
          {' '}can access your Cozy Circle profile.
        </Text>
      ) : item.description !== '' ? (
        <Text style={styles.description}>{item.description}</Text>
      ) : null}
      {item.showButton && item.buttonText && (
        <TouchableOpacity style={styles.primaryButton} onPress={handleGetStarted}>
          <Text style={styles.primaryButtonText}>{item.buttonText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Shared animation canvas — scrubs as user swipes */}
      <LottieView
        source={require('../../assets/animations/onboarding_animation.json')}
        progress={lottieProgress}
        style={styles.lottie}
        loop={false}
        autoPlay={false}
      />

      {/* Text content scrolls per-slide */}
      <Animated.FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      />

      {/* Pagination dots */}
      <View style={styles.dotsContainer}>
        {slides.map((_, index) => (
          <View
            key={index}
            style={[styles.dot, currentIndex === index && styles.activeDot]}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  lottie: {
    width,
    height: 300,
  },
  slide: {
    width,
    paddingHorizontal: 40,
    paddingTop: 24,
    alignItems: 'center',
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
    maxWidth: 288,
  },
  underline: {
    textDecorationLine: 'underline',
    textDecorationColor: '#6b7280',
  },
  primaryButton: {
    marginTop: 40,
    paddingVertical: 16,
    paddingHorizontal: 32,
    backgroundColor: '#3b82f6',
    borderRadius: 20,
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
    width: 40,
    height: 3,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 3,
  },
  activeDot: {
    backgroundColor: '#111827',
  },
});
