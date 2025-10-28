import React, { useEffect, useState } from 'react';
import { Box, AppBar, Toolbar, Typography, Container, Button, CircularProgress } from '@mui/material';
import { LocalDining, Search, Login as LoginIcon } from '@mui/icons-material';
// Voice recognition implemented with native browser API
import AuthModal from './components/AuthModal';
import UserProfile from './components/UserProfile';
import NotificationCenter from './components/NotificationCenter';
import NotificationToast from './components/NotificationToast';
import { useAuth } from './context/AuthContext';
import { useEvents } from './context/EventContext';
import IngredientInput from './components/IngredientInput';
import RecipeResults from './components/RecipeResults';
import { useRecipe } from './context/RecipeContext';

function AppContent() {
  const { state } = useAuth();
  const { state: eventState, markNotificationAsRead, setUserId } = useEvents();
  const { loadPantryFromBackend } = useRecipe();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Set user ID for WebSocket connection when user authenticates
  React.useEffect(() => {
    if (state.isAuthenticated && state.user) {
      setUserId(state.user.userId);
    } else {
      setUserId(null);
    }
  }, [state.isAuthenticated, state.user, setUserId]);

  // Load pantry from backend when user logs in
  const [pantryLoaded, setPantryLoaded] = useState(false);
  
  useEffect(() => {
    if (state.isAuthenticated && state.token && !pantryLoaded && !state.isLoading) {
      loadPantryFromBackend(state.token);
      setPantryLoaded(true);
    } else if (!state.isAuthenticated) {
      setPantryLoaded(false);
    }
  }, [state.isAuthenticated, state.token, loadPantryFromBackend, pantryLoaded, state.isLoading]);
  

  if (state.isLoading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        flexDirection: 'column',
        gap: 2
      }}>
        <CircularProgress size={60} />
        <Typography variant="h6" color="text.secondary">
          Loading Recipe Matcher...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', backgroundColor: 'background.default' }}>
      {/* Header */}
      <AppBar position="static" elevation={0} sx={{ backgroundColor: 'primary.main' }}>
        <Toolbar>
          <LocalDining sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Recipe Matcher
          </Typography>
          <Search sx={{ mr: 2 }} />
          
          {state.isAuthenticated && <NotificationCenter />}
          
          {state.isAuthenticated ? (
            <UserProfile />
          ) : (
            <Button
              color="inherit"
              startIcon={<LoginIcon />}
              onClick={() => setAuthModalOpen(true)}
              sx={{ 
                backgroundColor: 'rgba(255,255,255,0.1)',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.2)',
                }
              }}
            >
              Sign In
            </Button>
          )}
          
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h2" component="h1" gutterBottom align="center" color="primary">
            What's in your kitchen?
          </Typography>
          <Typography variant="h6" component="p" align="center" color="text.secondary" sx={{ mb: 4 }}>
            Enter your ingredients and discover amazing recipes you can make right now
          </Typography>
        </Box>

        {/* Ingredient Input Section */}
        <IngredientInput />

        {/* Recipe Results Section */}
        <RecipeResults />
      </Container>

      {/* Auth Modal */}
      <AuthModal 
        open={authModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
      />

      {/* Notification Toasts */}
      {eventState.notifications.slice(0, 3).map((notification) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onClose={() => markNotificationAsRead(notification.id)}
          onRead={() => markNotificationAsRead(notification.id)}
        />
      ))}
    </Box>
  );
}

function App() {
  return (
    <AppContent />
  );
}

export default App;