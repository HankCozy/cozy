'use client';

import React, { createContext, useContext, useReducer, useEffect } from 'react';

/**
 * Session Management Context for Community Profile Builder
 *
 * Manages the state of profile creation sessions across voice and visual interactions.
 * Handles data persistence, step tracking, and multi-modal profile building.
 *
 * Key responsibilities:
 * - Track profile data from conversational flows
 * - Manage visual question responses
 * - Handle session progression and completion
 * - Provide type-safe state management across components
 *
 * Session Flow:
 * 1. Initialize new session or load existing
 * 2. Collect responses via voice conversations or visual questions
 * 3. Track progress through multiple steps/categories
 * 4. Mark session complete when sufficient data collected
 * 5. Generate final profile summary via AI services
 */

export interface ProfileData {
  personal: any[];
  interests: any[];
  goals: any[];
  experiences: any[];
}

export interface VisualResponses {
  [questionId: string]: string | string[];
}

export interface SessionData {
  sessionId: string;
  profileData: ProfileData;
  visualResponses: VisualResponses;
  profileMode: 'voice' | 'visual' | 'mixed';
  currentStep: number;
  totalSteps: number;
  completedSteps: string[];
  startedAt: Date;
  lastUpdatedAt: Date;
  isComplete: boolean;
}

type SessionAction =
  | { type: 'INITIALIZE_SESSION'; payload: Partial<SessionData> }
  | { type: 'UPDATE_PROFILE_DATA'; payload: { category: keyof ProfileData; data: any } }
  | { type: 'UPDATE_VISUAL_RESPONSE'; payload: { questionId: string; answer: string | string[] } }
  | { type: 'SET_PROFILE_MODE'; payload: 'voice' | 'visual' | 'mixed' }
  | { type: 'COMPLETE_STEP'; payload: string }
  | { type: 'SET_CURRENT_STEP'; payload: number }
  | { type: 'MARK_SESSION_COMPLETE' }
  | { type: 'RESET_SESSION' }
  | { type: 'LOAD_SESSION'; payload: SessionData };

const initialState: SessionData = {
  sessionId: '',
  profileData: {
    personal: [],
    interests: [],
    goals: [],
    experiences: []
  },
  visualResponses: {},
  profileMode: 'mixed',
  currentStep: 0,
  totalSteps: 8,
  completedSteps: [],
  startedAt: new Date(),
  lastUpdatedAt: new Date(),
  isComplete: false
};

function sessionReducer(state: SessionData, action: SessionAction): SessionData {
  switch (action.type) {
    case 'INITIALIZE_SESSION':
      return {
        ...state,
        ...action.payload,
        sessionId: action.payload.sessionId || generateSessionId(),
        startedAt: action.payload.startedAt || new Date(),
        lastUpdatedAt: new Date()
      };

    case 'UPDATE_PROFILE_DATA':
      const updatedProfileData = {
        ...state.profileData,
        [action.payload.category]: [...state.profileData[action.payload.category], action.payload.data]
      };
      return {
        ...state,
        profileData: updatedProfileData,
        lastUpdatedAt: new Date()
      };

    case 'UPDATE_VISUAL_RESPONSE':
      return {
        ...state,
        visualResponses: {
          ...state.visualResponses,
          [action.payload.questionId]: action.payload.answer
        },
        lastUpdatedAt: new Date()
      };

    case 'SET_PROFILE_MODE':
      return {
        ...state,
        profileMode: action.payload,
        totalSteps: action.payload === 'mixed' ? 12 : 8,
        lastUpdatedAt: new Date()
      };

    case 'COMPLETE_STEP':
      if (state.completedSteps.includes(action.payload)) {
        return state;
      }
      return {
        ...state,
        completedSteps: [...state.completedSteps, action.payload],
        currentStep: Math.min(state.currentStep + 1, state.totalSteps),
        lastUpdatedAt: new Date()
      };

    case 'SET_CURRENT_STEP':
      return {
        ...state,
        currentStep: Math.max(0, Math.min(action.payload, state.totalSteps)),
        lastUpdatedAt: new Date()
      };

    case 'MARK_SESSION_COMPLETE':
      return {
        ...state,
        isComplete: true,
        currentStep: state.totalSteps,
        lastUpdatedAt: new Date()
      };

    case 'RESET_SESSION':
      return {
        ...initialState,
        sessionId: generateSessionId(),
        startedAt: new Date(),
        lastUpdatedAt: new Date()
      };

    case 'LOAD_SESSION':
      return {
        ...action.payload,
        startedAt: new Date(action.payload.startedAt),
        lastUpdatedAt: new Date(action.payload.lastUpdatedAt)
      };

    default:
      return state;
  }
}

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

interface SessionContextType {
  session: SessionData;
  dispatch: React.Dispatch<SessionAction>;
  saveSession: () => void;
  loadSession: (sessionId?: string) => boolean;
  getProgressPercentage: () => number;
  getSessionSummary: () => {
    totalResponses: number;
    voiceResponses: number;
    visualResponses: number;
    completionRate: number;
  };
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, dispatch] = useReducer(sessionReducer, initialState);

  useEffect(() => {
    const existingSession = loadSession();
    if (!existingSession) {
      dispatch({ type: 'INITIALIZE_SESSION', payload: {} });
    }
  }, []);

  useEffect(() => {
    if (session.sessionId) {
      saveSession();
    }
  }, [session]);

  const saveSession = async () => {
    if (typeof window === 'undefined') return;

    try {
      // Save to localStorage for immediate access
      localStorage.setItem(`cozy_session_${session.sessionId}`, JSON.stringify(session));
      localStorage.setItem('cozy_current_session', session.sessionId);

      // Also save to database if user is authenticated
      const token = localStorage.getItem('auth_token');
      if (token) {
        await fetch('/api/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            personalData: session.profileData.personal,
            interestsData: session.profileData.interests,
            goalsData: session.profileData.goals,
            experiencesData: session.profileData.experiences,
            visualResponses: session.visualResponses,
            profileMode: session.profileMode,
            currentStep: session.currentStep,
            totalSteps: session.totalSteps,
            completedSteps: session.completedSteps,
            isComplete: session.isComplete
          })
        }).catch(error => console.error('Failed to save to database:', error));
      }
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  };

  const loadSession = (sessionId?: string): boolean => {
    if (typeof window === 'undefined') return false;

    try {
      const targetSessionId = sessionId || localStorage.getItem('cozy_current_session');
      if (!targetSessionId) return false;

      const sessionData = localStorage.getItem(`cozy_session_${targetSessionId}`);
      if (!sessionData) return false;

      const parsedSession = JSON.parse(sessionData);
      dispatch({ type: 'LOAD_SESSION', payload: parsedSession });
      return true;
    } catch (error) {
      console.error('Failed to load session:', error);
      return false;
    }
  };

  const getProgressPercentage = (): number => {
    return Math.round((session.currentStep / session.totalSteps) * 100);
  };

  const getSessionSummary = () => {
    const voiceResponses = Object.values(session.profileData).flat().length;
    const visualResponses = Object.keys(session.visualResponses).length;
    const totalResponses = voiceResponses + visualResponses;

    return {
      totalResponses,
      voiceResponses,
      visualResponses,
      completionRate: getProgressPercentage()
    };
  };

  return (
    <SessionContext.Provider
      value={{
        session,
        dispatch,
        saveSession,
        loadSession,
        getProgressPercentage,
        getSessionSummary
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}