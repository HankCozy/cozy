import React, { useRef, useState, useEffect } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth, User } from '../contexts/AuthContext';
import { ALL_QUESTIONS_ORDERED } from './SectionQuestionsScreen';
import Waveform from '../components/Waveform';

const { width } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  placeholderColor: string;
  placeholderType: 'single' | 'multiple' | 'waveform';
  showButton?: boolean;
  buttonText?: string;
}

const createSlides = (communityName: string): OnboardingSlide[] => [
  {
    id: '1',
    title: 'Welcome to Cozy Circle',
    description: 'An app that fosters\nreal world connection.',
    placeholderColor: '#93c5fd', // Light blue
    placeholderType: 'single',
  },
  {
    id: '3',
    title: 'Cozy Circle helps you find connection points.',
    description: '',
    placeholderColor: '#a78bfa', // Purple
    placeholderType: 'multiple',
  },
  {
    id: '5',
    title: 'And foster real, in-person engagement.',
    description: '',
    placeholderColor: '#fbbf24', // Yellow
    placeholderType: 'multiple',
  },
  {
    id: '5b',
    title: `Cozy Circle brings you closer to the people of ${communityName}`,
    description: `This is a private community. Only members of ${communityName} can access your Cozy Circle profile.`,
    placeholderColor: '#fbbf24', // Yellow
    placeholderType: 'multiple',
  },
  {
    id: '6',
    title: "You tell us about yourself and we'll turn your words into points of connection.",
    description: '',
    placeholderColor: '#a78bfa', // Purple
    placeholderType: 'waveform',
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
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim2 = useRef(new Animated.Value(0)).current;
  const fadeAnim3 = useRef(new Animated.Value(0)).current;
  const descAnim = useRef(new Animated.Value(0)).current;

  // Fade animation for slide 2 (index 1): frame1 → frame2
  useEffect(() => {
    if (currentIndex === 1) {
      fadeAnim.setValue(0);
      const timeout = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, fadeAnim]);

  // Fade animation for slide 3 (index 2): frame2 → frame3
  useEffect(() => {
    if (currentIndex === 2) {
      fadeAnim2.setValue(0);
      const timeout = setTimeout(() => {
        Animated.timing(fadeAnim2, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }, 800);
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, fadeAnim2]);

  // Pan/zoom animation for slide 4 (index 3): frame3 → frame4
  useEffect(() => {
    if (currentIndex === 3) {
      fadeAnim3.setValue(0);
      descAnim.setValue(0);
      const timeout = setTimeout(() => {
        Animated.timing(fadeAnim3, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }).start();
      }, 800);
      // Description pulse in after 1.5s
      const descTimeout = setTimeout(() => {
        Animated.spring(descAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
      }, 1500);
      return () => {
        clearTimeout(timeout);
        clearTimeout(descTimeout);
      };
    }
  }, [currentIndex, fadeAnim3, descAnim]);

  // Get community name from route params
  const communityName = route.params?.user?.community?.organization || 'Your Community';
  const slides = createSlides(communityName);

  const handleGetStarted = async () => {
    if (route.params?.user && route.params?.token) {
      // Coming from registration — set a flag BEFORE switching auth state.
      // When completeOnboarding fires, the navigation tree swaps from
      // AuthNavigator → AppNavigator and this screen unmounts. The flag is
      // picked up by ProfileScreen's useFocusEffect on the new tree.
      await AsyncStorage.setItem('pending_question_flow', 'true');
      await completeOnboarding(route.params.user, route.params.token);
      // Do NOT navigate here — the navigation tree has already switched.
    } else {
      // Already authenticated (returning user). Navigate directly.
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

  const renderPlaceholder = (item: OnboardingSlide) => {
    // Slide 3 (id '3') - fade animation: frame1 → frame2
    if (item.id === '3') {
      return (
        <View style={styles.placeholderContainer}>
          <View style={styles.fadeImageContainer}>
            <Animated.Image
              source={require('../../assets/frame1.png')}
              style={[
                styles.fadeImage,
                { opacity: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) },
              ]}
              resizeMode="contain"
            />
            <Animated.Image
              source={require('../../assets/frame2.png')}
              style={[
                styles.fadeImage,
                styles.fadeImageAbsolute,
                { opacity: fadeAnim },
              ]}
              resizeMode="contain"
            />
          </View>
        </View>
      );
    }

    // Slide 3 (id '5') - fade animation: frame2 → frame3
    if (item.id === '5') {
      return (
        <View style={styles.placeholderContainer}>
          <View style={styles.fadeImageContainer}>
            <Animated.Image
              source={require('../../assets/frame2.png')}
              style={[
                styles.fadeImage,
                { opacity: fadeAnim2.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) },
              ]}
              resizeMode="contain"
            />
            <Animated.Image
              source={require('../../assets/frame3.png')}
              style={[
                styles.fadeImage,
                styles.fadeImageAbsolute,
                { opacity: fadeAnim2 },
              ]}
              resizeMode="contain"
            />
          </View>
        </View>
      );
    }

    // Slide 4 (id '5b') - pan/zoom animation: frame3 → frame4
    if (item.id === '5b') {
      return (
        <View style={styles.placeholderContainer}>
          <View style={styles.fadeImageContainer}>
            <Animated.Image
              source={require('../../assets/frame3.png')}
              style={[
                styles.fadeImage,
                {
                  opacity: fadeAnim3.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                  transform: [
                    { translateY: fadeAnim3.interpolate({ inputRange: [0, 1], outputRange: [66, 126] }) },
                    { translateX: fadeAnim3.interpolate({ inputRange: [0, 1], outputRange: [0, -100] }) },
                    { scale: fadeAnim3.interpolate({ inputRange: [0, 1], outputRange: [1, 0.5] }) },
                  ],
                },
              ]}
              resizeMode="contain"
            />
            <Animated.Image
              source={require('../../assets/frame4.png')}
              style={[
                styles.fadeImage,
                styles.fadeImageAbsolute,
                {
                  opacity: fadeAnim3,
                  transform: [
                    { scale: 1.7 },
                    { translateY: 56 },
                  ],
                },
              ]}
              resizeMode="contain"
            />
          </View>
        </View>
      );
    }

    if (item.placeholderType === 'single') {
      return (
        <View style={styles.placeholderContainer}>
          <View style={[styles.singleCircle, { backgroundColor: item.placeholderColor }]} />
        </View>
      );
    } else if (item.placeholderType === 'multiple') {
      const secondColor = item.id === '5' ? '#fbbf24' : item.placeholderColor;
      return (
        <View style={styles.placeholderContainer}>
          <View style={styles.multipleCirclesRow}>
            <View style={[styles.smallCircle, { backgroundColor: item.placeholderColor }]} />
            <View style={[styles.smallCircle, { backgroundColor: secondColor }]} />
            <View style={[styles.smallCircle, { backgroundColor: item.placeholderColor }]} />
          </View>
        </View>
      );
    } else {
      // Waveform placeholder - uses shared Waveform component
      return (
        <View style={styles.placeholderContainer}>
          <View style={{ marginTop: 320 }}>
            <Waveform isRecording alwaysShow scale={1.25} />
          </View>
        </View>
      );
    }
  };

  const renderSlide = ({ item }: { item: OnboardingSlide }) => (
    <View style={styles.slide}>
      <View style={styles.content}>
        {renderPlaceholder(item)}
        {item.id === '5b' ? (
          <Text style={[styles.title, { marginTop: 80 }]}>
            Cozy Circle brings you closer to the people of{' '}
            <Text style={styles.underline}>{communityName}</Text>
          </Text>
        ) : (
          <Text style={[styles.title, item.id === '6' && { marginTop: 80 }]}>{item.title}</Text>
        )}
        {item.id === '5b' ? (
          <Animated.Text
            style={[
              styles.description,
              {
                opacity: descAnim,
                transform: [
                  { scale: descAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
                ],
              },
            ]}
          >
            This is a private community. Only members of{' '}
            <Animated.Text style={styles.underline}>{communityName}</Animated.Text>
            {' '}can access your Cozy Circle profile.
          </Animated.Text>
        ) : item.description !== '' ? (
          <Text style={styles.description}>{item.description}</Text>
        ) : null}
        {item.showButton && item.buttonText && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleGetStarted}
          >
            <Text style={styles.primaryButtonText}>{item.buttonText}</Text>
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
    <SafeAreaView style={styles.container}>
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
    </SafeAreaView>
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
  placeholderContainer: {
    height: 200,
    marginBottom: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fadeImageContainer: {
    width: 200,
    height: 200,
    position: 'relative',
  },
  fadeImage: {
    width: '100%',
    height: '100%',
  },
  fadeImageAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  singleCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  multipleCirclesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  smallCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
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
