import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  ViewToken,
  SafeAreaView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { useAuth, User } from '../contexts/AuthContext';
import { navigationRef } from '../services/navigationService';
import { ONBOARDING_QUESTIONS } from './SectionQuestionsScreen';

const { width, height } = Dimensions.get('window');

// startOffset: 1 = frozen at last frame ("resolved")
const SLIDE_ANIMATIONS = [
  { source: require('../../assets/animations/ob_frame1.json'),            startOffset: 0, durationMs: 1430, loop: false, scale: 1   },
  { source: require('../../assets/animations/ob_frame2.json'),            startOffset: 0, durationMs: 2100, loop: false, scale: 1   },
  { source: require('../../assets/animations/ob_frame4.json'),            startOffset: 0, durationMs: 3440, loop: false, scale: 1   },
  { source: require('../../assets/animations/ob_frame4.json'),            startOffset: 1, durationMs: 3440, loop: false, scale: 1   },
  { source: require('../../assets/animations/recording_wave.json'),       startOffset: 0, durationMs: 1820, loop: true,  scale: 0.5 },
];

interface OnboardingSlide {
  id: string;
  heading?: string;       // large green title — screen 1 only
  subheading?: string;    // smaller green below heading — screen 1 only
  body?: string;          // body text — screens 2–5
  boldCommunityName?: boolean;
  showButton?: boolean;
  buttonText?: string;
}

const createSlides = (communityName: string): OnboardingSlide[] => [
  {
    id: '1',
    heading: 'Welcome to Cozy Circle',
    subheading: 'An app that fosters\nreal world connection.',
  },
  {
    id: '2',
    body: `There's a lot of great people to get to know at ${communityName}.`,
    boldCommunityName: true,
  },
  {
    id: '3',
    body: 'Cozy Circle finds overlaps and connection points...',
  },
  {
    id: '4',
    body: '...to help you get closer to your community.',
  },
  {
    id: '5',
    body: "To get started, let's chat through a few friendly questions.\n\nNothing serious, nothing boring.",
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
  const [committedSlide, setCommittedSlide] = useState(0);
  const [lottieProgress, setLottieProgress] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const rafRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const pendingSlideRef = useRef<number | null>(null);
  const prevCommittedSlideRef = useRef(0);
  const { completeOnboarding } = useAuth();

  const communityName = route.params?.user?.community?.organization || 'Your Community';
  const slides = createSlides(communityName);
  const currentSlide = slides[currentIndex];
  const { source: lottieSource, loop: lottieLoop, scale: lottieScale } = SLIDE_ANIMATIONS[committedSlide];

  const cancelPlayback = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const startPlayback = useCallback((slideIndex: number, fromProgress: number) => {
    const { durationMs: dur, loop } = SLIDE_ANIMATIONS[slideIndex];
    if (loop) return;
    const remaining = 1 - fromProgress;
    if (remaining <= 0) return;
    const playDuration = remaining * dur;
    const startTime = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / playDuration);
      setLottieProgress(fromProgress + t * remaining);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
        if (pendingSlideRef.current !== null) {
          const next = pendingSlideRef.current;
          pendingSlideRef.current = null;
          setCommittedSlide(next);
          setLottieProgress(SLIDE_ANIMATIONS[next].startOffset);
        }
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    prevCommittedSlideRef.current = committedSlide;
  }, [committedSlide]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!isDraggingRef.current) return;
    const x = e.nativeEvent.contentOffset.x;
    const slide = Math.min(Math.floor(x / width), slides.length - 1);
    if (slide !== committedSlide) return;
    const raw = Math.max(0, Math.min(1, x / width - slide));
    const { startOffset: so } = SLIDE_ANIMATIONS[slide];
    setLottieProgress(so + raw * (1 - so));
  };

  const handleScrollBeginDrag = () => {
    cancelPlayback();
    isDraggingRef.current = true;
  };

  const handleScrollEndDrag = () => {
    isDraggingRef.current = false;
    startPlayback(committedSlide, lottieProgress);
  };

  const handleMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const newSlide = Math.min(Math.round(x / width), slides.length - 1);
    if (newSlide === committedSlide) return;
    const goingBack = newSlide < committedSlide;
    if (goingBack || rafRef.current === null) {
      // Going back or no animation running — switch immediately
      cancelPlayback();
      setCommittedSlide(newSlide);
      setLottieProgress(SLIDE_ANIMATIONS[newSlide].startOffset);
    } else {
      // Going forward, animation still playing — wait for it to finish
      pendingSlideRef.current = newSlide;
    }
  };

  const handleGetStarted = async () => {
    if (route.params?.user && route.params?.token) {
      await completeOnboarding(route.params.user, route.params.token);
      setTimeout(() => {
        navigationRef.navigate('QuestionFlowStack', {
          screen: 'AnswerQuestion',
          params: {
            sectionId: 'all',
            questions: ONBOARDING_QUESTIONS,
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

  return (
    <SafeAreaView style={styles.container}>
      <LottieView
        key={committedSlide}
        source={lottieSource}
        progress={lottieLoop ? undefined : (lottieProgress as any)}
        loop={lottieLoop}
        autoPlay={lottieLoop}
        resizeMode="contain"
        style={[styles.lottie, { transform: [{ scale: lottieScale }] }]}
      />

      <View style={styles.textArea}>
        {currentSlide.heading && (
          <Text style={styles.title}>{currentSlide.heading}</Text>
        )}
        {currentSlide.subheading && (
          <Text style={styles.subtitle}>{currentSlide.subheading}</Text>
        )}

        {currentSlide.boldCommunityName ? (
          <Text style={styles.body}>
            There's a lot of great people to get to know at{' '}
            <Text style={styles.bold}>{communityName}</Text>.
          </Text>
        ) : currentSlide.body ? (
          <Text style={styles.body}>{currentSlide.body}</Text>
        ) : null}

      </View>

      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={() => <View style={styles.ghostSlide} />}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        style={StyleSheet.absoluteFill}
      />

      {/* Rendered after FlatList so it sits above it in the touch stack */}
      {currentSlide.showButton && currentSlide.buttonText && (
        <TouchableOpacity style={styles.primaryButton} onPress={handleGetStarted}>
          <Text style={styles.primaryButtonText}>{currentSlide.buttonText}</Text>
        </TouchableOpacity>
      )}

      <View style={styles.dotsContainer} pointerEvents="none">
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
    backgroundColor: '#FFF7E6',
  },
  lottie: {
    width,
    height: height * 0.56,
  },
  textArea: {
    flex: 1,
    paddingHorizontal: 40,
    paddingTop: 20,
    alignItems: 'center',
  },
  ghostSlide: {
    width,
    height: '100%',
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'Futura',
    color: '#00934E',
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Futura',
    color: '#545454',
    textAlign: 'center',
    lineHeight: 24,
  },
  body: {
    fontSize: 16,
    fontFamily: 'Futura',
    color: '#545454',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 288,
  },
  bold: {
    fontWeight: '700',
    fontFamily: 'Futura',
  },
  primaryButton: {
    position: 'absolute',
    bottom: 110,
    alignSelf: 'center',
    paddingVertical: 16,
    paddingHorizontal: 48,
    backgroundColor: '#0277BB',
    borderRadius: 20,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'Futura',
    color: '#ffffff',
    textAlign: 'center',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 40,
    height: 3,
    backgroundColor: '#E7E0D3',
    marginHorizontal: 3,
  },
  activeDot: {
    backgroundColor: '#545454',
  },
});
