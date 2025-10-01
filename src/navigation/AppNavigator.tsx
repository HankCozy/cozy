import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../contexts/AuthContext';

// Import screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CommunityScreen from '../screens/CommunityScreen';
import QuestionFlowScreen from '../screens/QuestionFlowScreen';
import SectionQuestionsScreen from '../screens/SectionQuestionsScreen';
import AnswerQuestionScreen from '../screens/AnswerQuestionScreen';

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
      }}
    >
      <AppTabs.Screen name="Profile" component={ProfileScreen} />
      <AppTabs.Screen name="Community" component={CommunityScreen} />
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