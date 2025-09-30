import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Tabs,
  Tab,
  Box,
  Alert,
  CircularProgress,
  Typography,
} from '@mui/material';
import {
  Email as EmailIcon,
  Lock as LockIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ open, onClose }) => {
  const { state, login, register, clearError } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wasAuthenticated, setWasAuthenticated] = useState(false);

  const handleClose = React.useCallback(() => {
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      username: '',
    });
    setTabValue(0);
    setShowSuccess(false);
    setIsSubmitting(false);
    setWasAuthenticated(false);
    clearError();
    onClose();
  }, [clearError, onClose]);

  // Handle authentication success
  useEffect(() => {
    // Check if user just became authenticated (wasn't authenticated before, now is)
    if (state.isAuthenticated && !state.isLoading && !wasAuthenticated) {
      setShowSuccess(true);
      setIsSubmitting(false);
      setWasAuthenticated(true);
      
      // Close modal after showing success message
      setTimeout(() => {
        handleClose();
      }, 2000);
    }
  }, [state.isAuthenticated, state.isLoading, wasAuthenticated, handleClose]);

  // Handle authentication error
  useEffect(() => {
    if (state.error && isSubmitting) {
      setIsSubmitting(false);
      setWasAuthenticated(false);
    }
  }, [state.error, isSubmitting]);


  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      username: '',
    });
    setWasAuthenticated(false); // Reset flag when switching tabs
    clearError();
  };

  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (tabValue === 0) {
      // Login
      if (!formData.email || !formData.password) {
        return;
      }
      setIsSubmitting(true);
      setWasAuthenticated(false); // Reset to false before starting
      await login(formData.email, formData.password);
    } else {
      // Register
      if (!formData.email || !formData.password || !formData.username) {
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        return;
      }
      setIsSubmitting(true);
      setWasAuthenticated(false); // Reset to false before starting
      await register(formData.email, formData.password, formData.username);
    }
  };

  const isFormValid = () => {
    if (tabValue === 0) {
      return formData.email && formData.password;
    } else {
      return (
        formData.email &&
        formData.password &&
        formData.confirmPassword &&
        formData.username &&
        formData.password === formData.confirmPassword
      );
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h4" component="h1" color="primary" gutterBottom>
            Recipe Matcher
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {tabValue === 0 ? 'Welcome back!' : 'Join the community!'}
          </Typography>
        </Box>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} centered>
          <Tab label="Sign In" />
          <Tab label="Sign Up" />
        </Tabs>
      </Box>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ pt: 3 }}>
          {isSubmitting ? (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              py: 4,
              gap: 2
            }}>
              <CircularProgress size={60} />
              <Typography variant="h6" color="text.secondary">
                {tabValue === 0 ? 'Signing you in...' : 'Creating your account...'}
              </Typography>
            </Box>
          ) : showSuccess ? (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              py: 4,
              gap: 2
            }}>
              <Typography variant="h4" color="success.main" sx={{ fontWeight: 600 }}>
                ✓
              </Typography>
              <Typography variant="h5" color="success.main" sx={{ fontWeight: 600 }}>
                {tabValue === 0 ? 'Login Successful!' : 'Registration Successful!'}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Welcome to Recipe Matcher!
              </Typography>
            </Box>
          ) : (
            <>
              {state.error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={clearError}>
                  {state.error}
                </Alert>
              )}

              {tabValue === 1 && (
                <TextField
                  fullWidth
                  label="Username"
                  value={formData.username}
                  onChange={handleInputChange('username')}
                  margin="normal"
                  required
                  InputProps={{
                    startAdornment: <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                />
              )}

              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={handleInputChange('email')}
                margin="normal"
                required
                InputProps={{
                  startAdornment: <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />

              <TextField
                fullWidth
                label="Password"
                type="password"
                value={formData.password}
                onChange={handleInputChange('password')}
                margin="normal"
                required
                InputProps={{
                  startAdornment: <LockIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />

              {tabValue === 1 && (
                <TextField
                  fullWidth
                  label="Confirm Password"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange('confirmPassword')}
                  margin="normal"
                  required
                  error={formData.password !== formData.confirmPassword && formData.confirmPassword !== ''}
                  helperText={
                    formData.password !== formData.confirmPassword && formData.confirmPassword !== ''
                      ? 'Passwords do not match'
                      : ''
                  }
                  InputProps={{
                    startAdornment: <LockIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                />
              )}
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!isFormValid() || isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
          >
            {isSubmitting ? 'Please wait...' : tabValue === 0 ? 'Sign In' : 'Sign Up'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AuthModal;
