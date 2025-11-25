import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import VennDiagramIcon from '../components/VennDiagramIcon';

// Import screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import NameScreen from '../screens/NameScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CommunityScreen from '../screens/CommunityScreen';
import QuestionFlowScreen from '../screens/QuestionFlowScreen';
import SectionQuestionsScreen from '../screens/SectionQuestionsScreen';
import AnswerQuestionScreen from '../screens/AnswerQuestionScreen';
import MemberProfileScreen from '../screens/MemberProfileScreen';

// Define navigation types
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type AppTabsParamList = {
  Profile: undefined;
  Community: undefined;
};

export type QuestionFlowParamList = {
  QuestionFlow: undefined;
  SectionQuestions: { sectionId: string; sectionName: string };
  AnswerQuestion: { sectionId: string; questions: any[] };
};

export type RootStackParamList = {
  MainTabs: undefined;
  QuestionFlowStack: undefined;
  MemberProfile: { userId: string };
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppTabs = createBottomTabNavigator<AppTabsParamList>();
const QuestionFlowStack = createNativeStackNavigator<QuestionFlowParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName="Login"
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function QuestionFlowNavigator() {
  return (
    <QuestionFlowStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <QuestionFlowStack.Screen name="QuestionFlow" component={QuestionFlowScreen} />
      <QuestionFlowStack.Screen name="SectionQuestions" component={SectionQuestionsScreen} />
      <QuestionFlowStack.Screen name="AnswerQuestion" component={AnswerQuestionScreen} />
    </QuestionFlowStack.Navigator>
  );
}

function TabsNavigator() {
  return (
    <AppTabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#9ca3af',
      }}
    >
      <AppTabs.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" size={size} color={color} />
          ),
        }}
      />
      <AppTabs.Screen
        name="Community"
        component={CommunityScreen}
        options={{
          tabBarLabel: 'Your Circles',
          tabBarIcon: ({ color, size }) => (
            <VennDiagramIcon size={size} color={color} />
          ),
        }}
      />
    </AppTabs.Navigator>
  );
}

function AppNavigator() {
  return (
    <RootStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <RootStack.Screen name="MainTabs" component={TabsNavigator} />
      <RootStack.Screen name="QuestionFlowStack" component={QuestionFlowNavigator} />
      <RootStack.Screen name="MemberProfile" component={MemberProfileScreen} />
    </RootStack.Navigator>
  );
}

export default function RootNavigator() {
  const { auth } = useAuth();

  if (auth.isLoading) {
    // You can add a loading screen component here
    return null;
  }

  // Determine which screen to show based on auth state
  const getAuthenticatedScreen = () => {
    if (!auth.hasSeenOnboarding) {
      return <OnboardingScreen />;
    }
    if (!auth.hasCompletedProfile) {
      return <NameScreen />;
    }
    return <AppNavigator />;
  };

  return (
    <NavigationContainer>
      {auth.isAuthenticated ? getAuthenticatedScreen() : <AuthNavigator />}
    </NavigationContainer>
  );
}