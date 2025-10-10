import { createContext, useContext, useReducer, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

// Event types that the frontend will receive
export interface FrontendEvent {
  type: 'recipe_matched' | 'recipe_shared' | 'ingredients_updated' | 'user_registered' | 'notification' | 'recipe_updated';
  data: any;
  timestamp: string;
  source?: string;
}

export interface Notification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  data?: any;
  timestamp: string;
  read: boolean;
}

// State interface
interface EventState {
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  notifications: Notification[];
  unreadCount: number;
  lastEventTime: string | null;
  error: string | null;
}

// Action types
type EventAction =
  | { type: 'CONNECTION_START' }
  | { type: 'CONNECTION_SUCCESS' }
  | { type: 'CONNECTION_ERROR'; payload: string }
  | { type: 'CONNECTION_CLOSE' }
  | { type: 'EVENT_RECEIVED'; payload: FrontendEvent }
  | { type: 'NOTIFICATION_ADD'; payload: Notification }
  | { type: 'NOTIFICATION_READ'; payload: string }
  | { type: 'NOTIFICATION_REMOVE'; payload: string }
  | { type: 'NOTIFICATION_CLEAR_ALL' }
  | { type: 'CLEAR_ERROR' };

// Initial state
const initialState: EventState = {
  isConnected: false,
  connectionStatus: 'disconnected',
  notifications: [],
  unreadCount: 0,
  lastEventTime: null,
  error: null,
};

// Reducer
function eventReducer(state: EventState, action: EventAction): EventState {
  switch (action.type) {
    case 'CONNECTION_START':
      return { ...state, connectionStatus: 'connecting', error: null };
    
    case 'CONNECTION_SUCCESS':
      return { 
        ...state, 
        isConnected: true, 
        connectionStatus: 'connected',
        error: null 
      };
    
    case 'CONNECTION_ERROR':
      return { 
        ...state, 
        isConnected: false, 
        connectionStatus: 'error',
        error: action.payload 
      };
    
    case 'CONNECTION_CLOSE':
      return { 
        ...state, 
        isConnected: false, 
        connectionStatus: 'disconnected' 
      };
    
    case 'EVENT_RECEIVED':
      return {
        ...state,
        lastEventTime: action.payload.timestamp,
      };
    
    case 'NOTIFICATION_ADD':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      };
    
    case 'NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => 
          n.id === action.payload ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      };
    
    case 'NOTIFICATION_REMOVE': {
      const notificationToRemove = state.notifications.find(n => n.id === action.payload);
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload),
        unreadCount: notificationToRemove && !notificationToRemove.read 
          ? Math.max(0, state.unreadCount - 1) 
          : state.unreadCount,
      };
    }
    
    case 'NOTIFICATION_CLEAR_ALL':
      return {
        ...state,
        notifications: [],
        unreadCount: 0,
      };
    
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    
    default:
      return state;
  }
}

// Context
const EventContext = createContext<{
  state: EventState;
  connect: () => void;
  disconnect: () => void;
  setUserId: (userId: string | null) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationAsRead: (id: string) => void;
  clearAllNotifications: () => void;
  clearError: () => void;
} | undefined>(undefined);

// Provider component
export function EventProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(eventReducer, initialState);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // WebSocket connection logic
  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    dispatch({ type: 'CONNECTION_START' });

    try {
      // Get WebSocket URL from environment or use default
      const baseUrl = import.meta.env.VITE_WS_URL || 'wss://your-websocket-api.execute-api.region.amazonaws.com/prod';
      
      // For now, simulate connection until we deploy the backend
      if (baseUrl.includes('your-websocket-api')) {
        setTimeout(() => {
          dispatch({ type: 'CONNECTION_SUCCESS' });
        }, 1000);
        return;
      }

      // Add user ID to WebSocket URL if available
      const wsUrl = userId ? `${baseUrl}?userId=${userId}` : baseUrl;

      // Real WebSocket connection
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        dispatch({ type: 'CONNECTION_SUCCESS' });
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          dispatch({ type: 'EVENT_RECEIVED', payload: data });
          handleEvent(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      ws.onclose = () => {
        dispatch({ type: 'CONNECTION_CLOSE' });
        attemptReconnect();
      };
      
      ws.onerror = () => {
        dispatch({ type: 'CONNECTION_ERROR', payload: 'WebSocket connection error' });
      };
      
      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      dispatch({ type: 'CONNECTION_ERROR', payload: 'Failed to connect to WebSocket' });
    }
  };

  // Reconnection logic
  const attemptReconnect = () => {
    const maxAttempts = 5;
    let attempts = 0;

    const reconnect = () => {
      if (attempts >= maxAttempts) {
        dispatch({ type: 'CONNECTION_ERROR', payload: 'Max reconnection attempts reached' });
        return;
      }

      attempts++;
      const delay = Math.pow(2, attempts) * 1000; // Exponential backoff

      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    };

    reconnect();
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    dispatch({ type: 'CONNECTION_CLOSE' });
  };

  // Handle incoming events from WebSocket
  const handleEvent = (event: FrontendEvent) => {

    switch (event.type) {
      case 'recipe_matched':
        addNotification({
          type: 'success',
          title: 'New Recipe Match!',
          message: `Found a recipe with ${event.data.matchPercentage}% ingredient match`,
          data: event.data,
        });
        break;
      
      case 'recipe_shared':
        addNotification({
          type: 'info',
          title: 'Recipe Shared',
          message: 'A recipe has been shared with you',
          data: event.data,
        });
        break;
      
      case 'ingredients_updated':
        addNotification({
          type: 'info',
          title: 'Ingredients Updated',
          message: 'Your ingredient list has been updated',
          data: event.data,
        });
        break;
      
      case 'user_registered':
        addNotification({
          type: 'success',
          title: 'Welcome!',
          message: `Welcome to Recipe Matcher, ${event.data.username}!`,
          data: event.data,
        });
        break;
      
      default:
        // Unknown event type
    }
  };

  // Notification management
  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      read: false,
    };
    
    dispatch({ type: 'NOTIFICATION_ADD', payload: newNotification });
    
    // Auto-remove notification after 4 seconds
    setTimeout(() => {
      dispatch({ type: 'NOTIFICATION_REMOVE', payload: newNotification.id });
    }, 4000);
  };

  const markNotificationAsRead = (id: string) => {
    dispatch({ type: 'NOTIFICATION_READ', payload: id });
  };

  const clearAllNotifications = () => {
    dispatch({ type: 'NOTIFICATION_CLEAR_ALL' });
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const setUserIdHandler = (newUserId: string | null) => {
    setUserId(newUserId);
    // Reconnect with new user ID
    if (state.isConnected) {
      disconnect();
      connect();
    }
  };

  // Auto-connect on mount and when user changes
  useEffect(() => {
    // Disabled WebSocket connection for now
    // connect();
    
    return () => {
      disconnect();
    };
  }, []);

  // Reconnect when user authentication changes
  useEffect(() => {
    // Disabled WebSocket connection for now
    // if (state.isConnected) {
    //   disconnect();
    //   connect();
    // }
  }, [/* Add user context dependency here if needed */]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return (
    <EventContext.Provider value={{
      state,
      connect,
      disconnect,
      setUserId: setUserIdHandler,
      addNotification,
      markNotificationAsRead,
      clearAllNotifications,
      clearError,
    }}>
      {children}
    </EventContext.Provider>
  );
}

// Custom hook for EventContext
export function useEvents() {
  const context = useContext(EventContext);
  if (context === undefined) {
    throw new Error('useEvents must be used within an EventProvider');
  }
  return context;
}
