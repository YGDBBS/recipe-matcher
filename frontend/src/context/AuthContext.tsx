import { createContext, useContext, useReducer, useEffect } from 'react';
import type { ReactNode } from 'react';
import { api } from '../services/api';

// Types
export interface User {
  userId: string;
  email: string;
  username: string;
  dietaryRestrictions: string[];
  preferences: {
    cookingTime?: number;
    difficultyLevel?: string;
  };
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Action types
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'CLEAR_ERROR' };

// Initial state
const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return { ...state, isLoading: true, error: null };
    case 'AUTH_SUCCESS': {
      const newState = {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
      return newState;
    }
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'AUTH_LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

// Context
const AuthContext = createContext<{
  state: AuthState;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
} | null>(null);

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for existing token on app load
  useEffect(() => {
    const token = localStorage.getItem('recipe-matcher-token');
    const userData = localStorage.getItem('recipe-matcher-user');
    
    if (token && userData) {
      // Verify token with backend
      api.verifyToken(token).then(response => {
        if (response.data?.valid) {
          const user = JSON.parse(userData);
          dispatch({ type: 'AUTH_SUCCESS', payload: { user, token } });
        } else {
          // Invalid token, clear stored data
          localStorage.removeItem('recipe-matcher-token');
          localStorage.removeItem('recipe-matcher-user');
          dispatch({ type: 'AUTH_FAILURE', payload: 'Session expired' });
        }
      }).catch(() => {
        // Network error or invalid token
        localStorage.removeItem('recipe-matcher-token');
        localStorage.removeItem('recipe-matcher-user');
        dispatch({ type: 'AUTH_FAILURE', payload: 'Session expired' });
      });
    } else {
      dispatch({ type: 'AUTH_FAILURE', payload: 'No stored credentials' });
    }
  }, []);

  const login = async (email: string, password: string) => {
    dispatch({ type: 'AUTH_START' });
    
    try {
      const response = await api.loginUser({ email, password });
      
      if (response.error) {
        dispatch({ type: 'AUTH_FAILURE', payload: response.error });
        return;
      }

      if (response.data) {
        const { user, token } = response.data;
        
        // Store in localStorage
        localStorage.setItem('recipe-matcher-token', token);
        localStorage.setItem('recipe-matcher-user', JSON.stringify(user));
        
        dispatch({ type: 'AUTH_SUCCESS', payload: { user, token } });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
    }
  };

  const register = async (email: string, password: string, username: string) => {
    dispatch({ type: 'AUTH_START' });
    
    try {
      const response = await api.registerUser({ 
        email, 
        password, 
        username,
        dietaryRestrictions: [],
        preferences: {}
      });
      
      if (response.error) {
        dispatch({ type: 'AUTH_FAILURE', payload: response.error });
        return;
      }

      if (response.data) {
        const { user, token } = response.data;
        
        // Store in localStorage
        localStorage.setItem('recipe-matcher-token', token);
        localStorage.setItem('recipe-matcher-user', JSON.stringify(user));
        
        dispatch({ type: 'AUTH_SUCCESS', payload: { user, token } });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
    }
  };

  const logout = () => {
    localStorage.removeItem('recipe-matcher-token');
    localStorage.removeItem('recipe-matcher-user');
    dispatch({ type: 'AUTH_LOGOUT' });
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  return (
    <AuthContext.Provider value={{ state, login, register, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
