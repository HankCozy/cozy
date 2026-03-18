import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  ViewToken,
  SafeAreaView,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { useAuth, User } from '../contexts/AuthContext';
import { ALL_QUESTIONS_ORDERED } from './SectionQuestionsScreen';

const { width, height } = Dimensions.get('window');

// Add new scenes here as Jitter files arrive
const SCENES: Record<number, any> = {
  0: require('../../assets/scene-1.json'),
  // 1: require('../../assets/scene-2.json'),
  // 2: require('../../assets/scene-3.json'),
  // 3: require('../../assets/scene-4.json'),
  // 4: require('../../assets/scene-5.json'),
};

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
  const lottieRef = useRef<LottieView>(null);
  const dragStartX = useRef(0);
  const hasPlayedThisDrag = useRef(false);
  const prevIndex = useRef(0);

  // Reset to frame 0 on mount
  useEffect(() => {
    const t = setTimeout(() => lottieRef.current?.reset(), 100);
    return () => clearTimeout(t);
  }, []);

  // When swiping backward, reset animation to frame 0
  useEffect(() => {
    if (currentIndex < prevIndex.current) {
      lottieRef.current?.reset();
    }
    prevIndex.current = currentIndex;
  }, [currentIndex]);

  const communityName = route.params?.user?.community?.organization || 'Your Community';
  const slides = createSlides(communityName);

  const handleGetStarted = async () => {
    if (route.params?.user && route.params?.token) {
      await completeOnboarding(route.params.user, route.params.token);
      // AppNavigator reads auth.pendingOnboarding on mount and routes directly
      // to QuestionFlowStack — no navigation call needed here.
    } else {
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

  const renderDots = () => (
    <View style={styles.dotsContainer} pointerEvents="none">
      {slides.map((_, index) => (
        <View
          key={index}
          style={[styles.dot, currentIndex === index && styles.activeDot]}
        />
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Full-screen swipeable FlatList — text content has paddingTop to clear animation zone */}
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
        onScrollBeginDrag={(e) => {
          dragStartX.current = e.nativeEvent.contentOffset.x;
          hasPlayedThisDrag.current = false;
        }}
        onScroll={(e) => {
          const x = e.nativeEvent.contentOffset.x;
          if (!hasPlayedThisDrag.current && x > dragStartX.current) {
            hasPlayedThisDrag.current = true;
            lottieRef.current?.play();
          }
        }}
        scrollEventThrottle={16}
        style={StyleSheet.absoluteFill}
      />

      {/* Fixed animation zone — floats above FlatList, pointer events none so swipes pass through */}
      <View style={styles.animationZone} pointerEvents="none">
        <LottieView
          ref={lottieRef}
          source={SCENES[currentIndex] ?? SCENES[0]}
          autoPlay={false}
          loop={false}
          style={{ width: width * 0.85, height: width * 0.85 }}
        />
      </View>

      {renderDots()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  animationZone: {
    position: 'absolute',
    top: height * 0.18,
    left: 0,
    right: 0,
    height: width * 0.85,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slide: {
    width,
    paddingHorizontal: 40,
    paddingTop: height * 0.63,
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
    borderRadius: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
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
