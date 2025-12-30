import React, { createContext, useContext, useReducer, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
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
  }) => Promise<{ success: boolean; error?: string; user?: User; token?: string }>;
  completeOnboarding: (user: User, token: string) => Promise<{ success: boolean; error?: string }>;
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
  // SECURITY: Uses SecureStore for encrypted token storage
  useEffect(() => {
    const loadAuth = async () => {
      try {
        const token = await SecureStore.getItemAsync('auth_token');
        const userStr = await SecureStore.getItemAsync('auth_user');

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
      const url = `${API_BASE_URL}/api/auth/login`;
      console.log('[AUTH] Login URL:', url);
      console.log('[AUTH] API_BASE_URL:', API_BASE_URL);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      console.log('[AUTH] Response status:', response.status);
      const data = await response.json();
      console.log('[AUTH] Response data:', data);

      if (data.success) {
        // SECURITY: Save to SecureStore (encrypted storage)
        await SecureStore.setItemAsync('auth_token', data.token);
        await SecureStore.setItemAsync('auth_user', JSON.stringify(data.user));

        dispatch({ type: 'LOGIN_SUCCESS', payload: { user: data.user, token: data.token } });
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('[AUTH] Login error:', error);
      console.error('[AUTH] Error details:', JSON.stringify(error, null, 2));
      return { success: false, error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}. API URL: ${API_BASE_URL}` };
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
        // Return credentials but don't auto-login yet (for onboarding flow)
        return { success: true, user: result.user, token: result.token };
      } else {
        return { success: false, error: result.error };
      }
    } catch (_error) {
      return { success: false, error: 'Network error - make sure your backend is running' };
    }
  };

  const completeOnboarding = async (user: User, token: string) => {
    try {
      // SECURITY: Save to SecureStore (encrypted storage)
      await SecureStore.setItemAsync('auth_token', token);
      await SecureStore.setItemAsync('auth_user', JSON.stringify(user));

      dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token } });
      return { success: true };
    } catch (_error) {
      return { success: false, error: 'Failed to complete onboarding' };
    }
  };

  const logout = async () => {
    try {
      // SECURITY: Remove from SecureStore
      await SecureStore.deleteItemAsync('auth_token');
      await SecureStore.deleteItemAsync('auth_user');
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
        // SECURITY: Update in SecureStore
        const updatedUser = { ...auth.user, firstName, lastName };
        await SecureStore.setItemAsync('auth_user', JSON.stringify(updatedUser));

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
        completeOnboarding,
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