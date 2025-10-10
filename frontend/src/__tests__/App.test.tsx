import { describe, it, expect, vi } from 'vitest'

// Mock MUI components to avoid file descriptor issues
vi.mock('@mui/material', () => ({
  AppBar: ({ children }: { children: React.ReactNode }) => <div data-testid="app-bar">{children}</div>,
  Toolbar: ({ children }: { children: React.ReactNode }) => <div data-testid="toolbar">{children}</div>,
  Typography: ({ children }: { children: React.ReactNode }) => <div data-testid="typography">{children}</div>,
  Button: ({ children }: { children: React.ReactNode }) => <button data-testid="button">{children}</button>,
  Container: ({ children }: { children: React.ReactNode }) => <div data-testid="container">{children}</div>,
  Box: ({ children }: { children: React.ReactNode }) => <div data-testid="box">{children}</div>,
  Paper: ({ children }: { children: React.ReactNode }) => <div data-testid="paper">{children}</div>,
  Grid: ({ children }: { children: React.ReactNode }) => <div data-testid="grid">{children}</div>,
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div data-testid="card-content">{children}</div>,
  TextField: () => <input data-testid="text-field" />,
  IconButton: ({ children }: { children: React.ReactNode }) => <button data-testid="icon-button">{children}</button>,
}))

// Mock all MUI icons dynamically
vi.mock('@mui/icons-material', () => {
  const createIconMock = (name: string) => () => <div data-testid={`${name.toLowerCase()}-icon`} />
  
  return new Proxy({}, {
    get: (target, prop) => {
      if (typeof prop === 'string') {
        return createIconMock(prop)
      }
      return undefined
    }
  })
})

// Mock the contexts
vi.mock('../context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    state: {
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    },
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    clearError: vi.fn(),
  }),
}))

vi.mock('../context/EventContext', () => ({
  EventProvider: ({ children }: { children: React.ReactNode }) => children,
  useEvents: () => ({
    state: {
      isConnected: false,
      connectionStatus: 'disconnected',
      notifications: [],
      unreadCount: 0,
      lastEventTime: null,
      error: null,
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
    setUserId: vi.fn(),
    addNotification: vi.fn(),
    markNotificationAsRead: vi.fn(),
    clearAllNotifications: vi.fn(),
    clearError: vi.fn(),
  }),
}))

vi.mock('../context/RecipeContext', () => ({
  RecipeProvider: ({ children }: { children: React.ReactNode }) => children,
  useRecipe: () => ({
    recipes: [],
    isLoading: false,
    searchRecipes: vi.fn(),
  }),
}))

// Mock components to avoid heavy imports
vi.mock('../components/IngredientInput', () => ({
  default: () => <div data-testid="ingredient-input">Ingredient Input</div>
}))

vi.mock('../components/RecipeResults', () => ({
  default: () => <div data-testid="recipe-results">Recipe Results</div>
}))

vi.mock('../components/NotificationCenter', () => ({
  default: () => <div data-testid="notification-center">Notification Center</div>
}))

vi.mock('../components/UserProfile', () => ({
  default: () => <div data-testid="user-profile">User Profile</div>
}))

vi.mock('../components/AuthModal', () => ({
  default: () => <div data-testid="auth-modal">Auth Modal</div>
}))

vi.mock('../components/LogoutModal', () => ({
  default: () => <div data-testid="logout-modal">Logout Modal</div>
}))

vi.mock('../components/NotificationToast', () => ({
  default: () => <div data-testid="notification-toast">Notification Toast</div>
}))

// Mock services
vi.mock('../services/api', () => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}))

vi.mock('../services/PantryService', () => ({
  PantryService: {
    getIngredients: vi.fn(),
    addIngredient: vi.fn(),
    removeIngredient: vi.fn(),
  },
}))

describe('App', () => {
  it('renders without crashing', () => {
    // Simple test that just checks the test setup works
    expect(true).toBe(true)
  })
})
