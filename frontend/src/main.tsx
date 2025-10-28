import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EventProvider } from './context/EventContext'
import { AuthProvider } from './context/AuthContext'
import { RecipeProvider } from './context/RecipeContext'
import App from './App.tsx'

// Create theme (moved from App.tsx)
const theme = createTheme({
  palette: {
    primary: {
      main: '#FF6347',
      light: '#ff8a73',
      dark: '#e53e1a',
    },
    secondary: {
      main: '#4CAF50',
      light: '#81c784',
      dark: '#388e3c',
    },
    background: {
      default: '#F9F9F9',
      paper: '#ffffff',
    },
    text: {
      primary: '#333333',
      secondary: '#888888',
    },
  },
  typography: {
    h1: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      fontWeight: 600,
    },
    h2: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
  },
});

// Create a React Query client (moved from App.tsx)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <EventProvider>
          <AuthProvider>
            <RecipeProvider>
              <App />
            </RecipeProvider>
          </AuthProvider>
        </EventProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
)
