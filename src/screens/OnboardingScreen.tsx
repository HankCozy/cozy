import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
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
import { Colors, Fonts } from '../theme';
import AnimatedWaveform from '../components/AnimatedWaveform';

const { width } = Dimensions.get('window');
const CX = width / 2;

const GRAPHIC_HEIGHT = 460;
const GCY = GRAPHIC_HEIGHT / 2; // 230

// ---------------------------------------------------------------------------
// Slide 2 — people circles, calibrated to reference proportions.
// Centers expressed as dx/dy from (CX, GCY). No circles touch.
// hasSmiley mirrors the reference (orange/pink/green get the ☺ face).
// ---------------------------------------------------------------------------
type PeopleCircle = { color: string; r: number; dx: number; dy: number; hasSmiley: boolean };

const PEOPLE_CIRCLES: PeopleCircle[] = [
  { color: Colors.orange, r: 50, dx:   9, dy:  -14, hasSmiley: true  }, // center
  { color: Colors.pink,   r: 58, dx:  77, dy: -129, hasSmiley: true  }, // upper-right (large)
  { color: Colors.yellow, r: 40, dx: -116, dy:  -92, hasSmiley: false }, // upper-left
  { color: Colors.blue,   r: 66, dx: -120, dy:   87, hasSmiley: false }, // lower-left (large)
  { color: Colors.green,  r: 52, dx:  73, dy:  110, hasSmiley: true  }, // lower-right
];

// ---------------------------------------------------------------------------
// Slide 4 — single large PICKLEBALL circle
// ---------------------------------------------------------------------------
const PB_R  = 92;
const PB_CX = CX;
const PB_CY = GCY - 15; // same center as slide-3 orange end position

const DOT_COLORS = [
  Colors.orange,
  Colors.yellow,
  Colors.blue,
  Colors.green,
  Colors.pink,
  Colors.orange, // 6th wraps back to orange
];

interface OnboardingSlide { id: string }

const SLIDES: OnboardingSlide[] = [
  { id: 'welcome' },
  { id: 'people' },
  { id: 'connect' },
  { id: 'pickleball' },
  { id: 'activities' },
  { id: 'cta' },
];

interface OnboardingScreenProps {
  navigation: any;
  route: { params?: { user: User; token: string } };
}

export default function OnboardingScreen({ navigation, route }: OnboardingScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [ctaPressed, setCtaPressed]     = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const { completeOnboarding } = useAuth();

  // Slide 2 — stagger scale-in
  const s2Scales = useRef(PEOPLE_CIRCLES.map(() => new Animated.Value(0))).current;

  // Slide 4 — pickleball scale + label fade-in
  const s4Scale   = useRef(new Animated.Value(0)).current;
  const s4LabelOp = useRef(new Animated.Value(0)).current;

  const communityName = route.params?.user?.community?.organization || 'Your Community';

  // ------------------------------------------------------------------
  // Slide animations
  // ------------------------------------------------------------------

  // Slide 2 — fast stagger spring-in
  useEffect(() => {
    if (currentIndex === 1) {
      s2Scales.forEach(a => a.setValue(0));
      Animated.stagger(
        40,
        s2Scales.map(a =>
          Animated.spring(a, { toValue: 1, tension: 200, friction: 9, useNativeDriver: true })
        )
      ).start();
    }
  }, [currentIndex]);

  useEffect(() => {
    if (currentIndex === 3) {
      s4Scale.setValue(0);
      s4LabelOp.setValue(0);
      const t = setTimeout(() => {
        Animated.sequence([
          Animated.spring(s4Scale, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true }),
          Animated.timing(s4LabelOp, { toValue: 1, duration: 240, useNativeDriver: true }),
        ]).start();
      }, 150);
      return () => clearTimeout(t);
    }
  }, [currentIndex]);

  // ------------------------------------------------------------------
  // Navigation
  // ------------------------------------------------------------------

  const handleGetStarted = async () => {
    if (ctaPressed) return;
    setCtaPressed(true);
    if (route.params?.user && route.params?.token) {
      await AsyncStorage.setItem('pending_question_flow', 'true');
      await completeOnboarding(route.params.user, route.params.token);
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

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  // ------------------------------------------------------------------
  // Graphic renderers
  // ------------------------------------------------------------------

  const renderWelcomeGraphic = () => (
    <View style={styles.graphicArea}>
      <Image
        source={require('../../assets/app_tile.png')}
        style={styles.appTile}
        resizeMode="contain"
      />
    </View>
  );

  const renderPeopleGraphic = () => (
    <View style={styles.graphicArea}>
      {PEOPLE_CIRCLES.map((c, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left:         CX + c.dx - c.r,
            top:          GCY + c.dy - c.r,
            width:        c.r * 2,
            height:       c.r * 2,
            borderRadius: c.r,
            backgroundColor: c.color,
            opacity: 0.85,
            justifyContent: 'center',
            alignItems:     'center',
            transform: [{ scale: s2Scales[i] }],
          }}
        >
          {c.hasSmiley && (
            <Image
              source={
                c.color === Colors.orange ? require('../../assets/eyeys_orange.png') :
                c.color === Colors.pink   ? require('../../assets/eyeys_pinnk.png') :
                require('../../assets/eyeys_green.png')
              }
              style={{ width: c.r * 0.32, height: c.r * 0.32 }}
              resizeMode="contain"
            />
          )}
        </Animated.View>
      ))}
    </View>
  );

  const renderConnectGraphic = () => (
    <View style={styles.graphicArea}>
      <Image
        source={require('../../assets/onboarding_connect.png')}
        style={{ width: '100%', height: GRAPHIC_HEIGHT }}
        resizeMode="contain"
      />
    </View>
  );

  const renderPickleballGraphic = () => (
    <View style={styles.graphicArea}>
      <Animated.View
        style={{
          position:     'absolute',
          left:         PB_CX - PB_R,
          top:          PB_CY - PB_R,
          width:        PB_R * 2,
          height:       PB_R * 2,
          borderRadius: PB_R,
          backgroundColor: Colors.orange,
          justifyContent: 'center',
          alignItems:     'center',
          transform: [{ scale: s4Scale }],
        }}
      >
        <Animated.Text
          style={{
            opacity:        s4LabelOp,
            color:          Colors.white,
            fontFamily:     Fonts.bold,
            fontSize:       16,
            fontWeight:     '700',
            textTransform:  'uppercase',
            letterSpacing:  1.8,
          }}
          allowFontScaling={false}
        >
          PICKLEBALL
        </Animated.Text>
      </Animated.View>
    </View>
  );

  const renderActivitiesGraphic = () => (
    <View style={styles.graphicArea}>
      <Image
        source={require('../../assets/onboarding_activities.png')}
        style={{ width: '100%', height: GRAPHIC_HEIGHT }}
        resizeMode="contain"
      />
    </View>
  );

  const renderCtaGraphic = () => (
    <View style={[styles.graphicArea, styles.graphicCenter]}>
      <AnimatedWaveform barWidth={28} barGap={12} />
    </View>
  );

  const renderGraphic = (id: string) => {
    switch (id) {
      case 'welcome':    return renderWelcomeGraphic();
      case 'people':     return renderPeopleGraphic();
      case 'connect':    return renderConnectGraphic();
      case 'pickleball': return renderPickleballGraphic();
      case 'activities': return renderActivitiesGraphic();
      case 'cta':        return renderCtaGraphic();
      default:           return null;
    }
  };

  // ------------------------------------------------------------------
  // Slide renderer
  // ------------------------------------------------------------------

  const renderSlide = ({ item }: { item: OnboardingSlide }) => (
    <View style={styles.slide}>
      {renderGraphic(item.id)}
      <View style={styles.textArea}>
        {item.id === 'welcome' && (
          <>
            <Text style={styles.titleLarge}>Welcome to Cozy Circle</Text>
            <Text style={styles.description}>A place for real world connections.</Text>
          </>
        )}
        {item.id === 'people' && (
          <Text style={styles.title}>
            {"There's a lot of great people at\n"}
            <Text style={styles.bold}>{communityName}.</Text>
          </Text>
        )}
        {item.id === 'connect' && (
          <Text style={styles.title}>
            Cozy Circle helps you find new ways to connect...
          </Text>
        )}
        {item.id === 'pickleball' && (
          <Text style={styles.title}>
            ...around real-world activities and shared interests.
          </Text>
        )}
        {item.id === 'activities' && (
          <Text style={styles.title}>
            Get closer to your community with Cozy Circle.
          </Text>
        )}
        {item.id === 'cta' && (
          <>
            <Text style={styles.title}>
              {"To get started, let's chat through\na few friendly questions."}
            </Text>
            <Text style={styles.description}>Nothing serious, nothing boring.</Text>
            <TouchableOpacity
              style={[styles.primaryButton, ctaPressed && styles.primaryButtonDisabled]}
              onPress={handleGetStarted}
              activeOpacity={0.8}
              disabled={ctaPressed}
            >
              <Text style={styles.primaryButtonText}>Get started</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

  // ------------------------------------------------------------------
  // Dot indicator
  // ------------------------------------------------------------------

  const renderDots = () => (
    <View style={styles.dotsContainer}>
      {SLIDES.map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            {
              backgroundColor: DOT_COLORS[index],
              opacity: currentIndex === index ? 1 : 0.35,
              width:   currentIndex === index ? 10 : 7,
              height:  currentIndex === index ? 10 : 7,
            },
          ]}
        />
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={item => item.id}
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
    backgroundColor: Colors.warmWhite,
  },
  slide: {
    width,
    flex: 1,
  },
  graphicArea: {
    height: GRAPHIC_HEIGHT,
    width:  '100%',
  },
  graphicCenter: {
    justifyContent: 'center',
    alignItems:     'center',
  },
  appTile: {
    width:      210,
    height:     210,
    alignSelf:  'center',
    marginTop:  114, // ~3/4 inch lower than original
    borderRadius: 46,
    overflow:   'hidden',
  },
  textArea: {
    flex: 1,
    paddingHorizontal: 40,
    paddingTop:        24,
    alignItems:        'center',
  },
  titleLarge: {
    fontSize:   24,
    fontFamily: Fonts.bold,
    color:      Colors.black,
    marginBottom: 12,
    textAlign:  'center',
    lineHeight: 32,
  },
  title: {
    fontSize:   19,
    fontFamily: Fonts.medium,
    color:      Colors.black,
    marginBottom: 12,
    textAlign:  'center',
    lineHeight: 27,
  },
  description: {
    fontSize:   15,
    fontFamily: Fonts.regular,
    color:      Colors.gray,
    textAlign:  'center',
    lineHeight: 23,
    marginBottom: 10,
  },
  bold: {
    fontFamily: Fonts.bold,
    color:      Colors.black,
  },
  primaryButton: {
    marginTop:       28,
    paddingVertical: 16,
    paddingHorizontal: 32,
    backgroundColor: Colors.blue,
    borderRadius:    10,
    width:           '100%',
    alignItems:      'center',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize:   16,
    fontFamily: Fonts.medium,
    color:      Colors.white,
    fontWeight: '600',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems:     'center',
    paddingBottom:  48,
    gap:            8,
  },
  dot: {
    borderRadius: 5,
  },
});
