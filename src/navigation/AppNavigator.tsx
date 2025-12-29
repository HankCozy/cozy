import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

// Import screens
import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CommunityScreen from '../screens/CommunityScreen';
import QuestionFlowScreen from '../screens/QuestionFlowScreen';
import SectionQuestionsScreen from '../screens/SectionQuestionsScreen';
import AnswerQuestionScreen from '../screens/AnswerQuestionScreen';
import MemberProfileScreen from '../screens/MemberProfileScreen';
import ManagerDashboardScreen from '../screens/ManagerDashboardScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import AdminCreateCommunityScreen from '../screens/AdminCreateCommunityScreen';
import AccountScreen from '../screens/AccountScreen';

// Define navigation types
export type AuthStackParamList = {
  Splash: undefined;
  Onboarding: {
    user: {
      id: string;
      email: string;
      firstName?: string;
      lastName?: string;
      role: 'MEMBER' | 'MANAGER' | 'ADMIN';
    };
    token: string;
  };
  Login: undefined;
  Register: undefined;
};

export type AppTabsParamList = {
  Profile: undefined;
  Community: undefined;
  Dashboard?: undefined;
  AdminDashboard?: undefined;
  CreateCommunity?: undefined;
  Account?: undefined;
};

export type QuestionFlowParamList = {
  QuestionFlow: undefined;
  SectionQuestions: { sectionId: string; sectionName: string };
  AnswerQuestion: {
    sectionId: string;
    questions: string[];
    isFirstTimeOnboarding?: boolean;
  };
};

export type RootStackParamList = {
  MainTabs: undefined;
  QuestionFlowStack: undefined;
  MemberProfile: { userId: string };
  Onboarding: {
    user?: {
      id: string;
      email: string;
      firstName?: string;
      lastName?: string;
      role: 'MEMBER' | 'MANAGER' | 'ADMIN';
    };
    token?: string;
  };
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
      initialRouteName="Splash"
    >
      <AuthStack.Screen name="Splash" component={SplashScreen} />
      <AuthStack.Screen name="Onboarding" component={OnboardingScreen} />
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
  const { auth } = useAuth();

  // ADMIN: Show admin dashboard and community creation tabs
  if (auth.user?.role === 'ADMIN') {
    return (
      <AppTabs.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#3b82f6',
          tabBarInactiveTintColor: '#9ca3af',
        }}
      >
        <AppTabs.Screen
          name="AdminDashboard"
          component={AdminDashboardScreen}
          options={{
            tabBarLabel: 'Communities',
            tabBarIcon: ({ color, size }) => (
              <Feather name="grid" size={size} color={color} />
            ),
          }}
        />
        <AppTabs.Screen
          name="CreateCommunity"
          component={AdminCreateCommunityScreen}
          options={{
            tabBarLabel: 'Create',
            tabBarIcon: ({ color, size }) => (
              <Feather name="plus-circle" size={size} color={color} />
            ),
          }}
        />
        <AppTabs.Screen
          name="Account"
          component={AccountScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Feather name="settings" size={size} color={color} />
            ),
          }}
        />
      </AppTabs.Navigator>
    );
  }

  // MANAGER: Show dashboard and account tabs
  if (auth.user?.role === 'MANAGER') {
    return (
      <AppTabs.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#3b82f6',
          tabBarInactiveTintColor: '#9ca3af',
        }}
      >
        <AppTabs.Screen
          name="Dashboard"
          component={ManagerDashboardScreen}
          options={{
            tabBarLabel: 'Your Community',
            tabBarIcon: ({ color, size }) => (
              <Feather name="radio" size={size} color={color} />
            ),
          }}
        />
        <AppTabs.Screen
          name="Account"
          component={AccountScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Feather name="settings" size={size} color={color} />
            ),
          }}
        />
      </AppTabs.Navigator>
    );
  }

  // MEMBER: Regular experience (Profile + Your Circle)
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
          tabBarLabel: 'Your Circle',
          tabBarIcon: ({ color, size }) => (
            <Feather name="circle" size={size} color={color} />
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
      <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
    </RootStack.Navigator>
  );
}

export default function RootNavigator() {
  const { auth } = useAuth();

  if (auth.isLoading) {
    // You can add a loading screen component here
    return null;
  }

  return (
    <NavigationContainer>
      {auth.isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}