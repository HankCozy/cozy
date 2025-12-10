import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL as BASE_URL } from '../config/api';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'MEMBER' | 'MANAGER' | 'ADMIN';
  profilePictureUrl?: string;
  community?: {
    id: string;
    organization: string;
    division?: string;
    accountOwner?: string;
  };
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: Partial<User> };

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false
      };

    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false
      };

    case 'UPDATE_USER':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null
      };

    default:
      return state;
  }
}

interface AuthContextType {
  auth: AuthState;
  dispatch: React.Dispatch<AuthAction>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    invitationCode: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  validateInvitation: (code: string) => Promise<{ valid: boolean; error?: string; invitation?: any }>;
  updateUserProfile: (firstName: string, lastName: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Configuration - API base URL (auto-detects iOS/Android)
const API_BASE_URL = BASE_URL;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, dispatch] = useReducer(authReducer, initialState);

  // Load saved authentication on mount
  useEffect(() => {
    const loadAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('auth_token');
        const userStr = await AsyncStorage.getItem('auth_user');

        if (token && userStr) {
          const user = JSON.parse(userStr);
          dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token } });
        } else {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } catch (error) {
        console.error('Failed to load auth:', error);
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    loadAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (data.success) {
        // Save to AsyncStorage
        await AsyncStorage.setItem('auth_token', data.token);
        await AsyncStorage.setItem('auth_user', JSON.stringify(data.user));

        dispatch({ type: 'LOGIN_SUCCESS', payload: { user: data.user, token: data.token } });
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (_error) {
      return { success: false, error: 'Network error - make sure your backend is running' };
    }
  };

  const register = async (data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    invitationCode: string;
  }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.success) {
        // Save to AsyncStorage
        await AsyncStorage.setItem('auth_token', result.token);
        await AsyncStorage.setItem('auth_user', JSON.stringify(result.user));

        dispatch({ type: 'LOGIN_SUCCESS', payload: { user: result.user, token: result.token } });
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (_error) {
      return { success: false, error: 'Network error - make sure your backend is running' };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('auth_user');
      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  const validateInvitation = async (code: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/invitations/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      const data = await response.json();

      if (data.valid) {
        return { valid: true, invitation: data.invitation };
      } else {
        return { valid: false, error: data.error };
      }
    } catch (_error) {
      return { valid: false, error: 'Network error - make sure your backend is running' };
    }
  };

  const updateUserProfile = async (firstName: string, lastName: string) => {
    try {
      if (!auth.token || !auth.user) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({ firstName, lastName })
      });

      const data = await response.json();

      if (data.success) {
        // Update local user state
        const updatedUser = { ...auth.user, firstName, lastName };
        await AsyncStorage.setItem('auth_user', JSON.stringify(updatedUser));

        dispatch({ type: 'UPDATE_USER', payload: { firstName, lastName } });

        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (_error) {
      return { success: false, error: 'Network error - make sure your backend is running' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        auth,
        dispatch,
        login,
        register,
        logout,
        validateInvitation,
        updateUserProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}