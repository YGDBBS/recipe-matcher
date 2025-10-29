import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

type ToastType = 'success' | 'error' | 'info';

export function useAuth(options?: { showToast?: (message: string, type: ToastType) => void }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('authToken'));
  const showToast = options?.showToast || (() => {}); // Optional toast callback

  // Verify token using React Query
  const { isLoading, data: verificationData } = useQuery({
    queryKey: ['auth', token],
    queryFn: async () => {
      if (!token) {
        return { valid: false };
      }
      const response = await api.verifyToken(token);
      return {
        valid: response.data?.valid ?? false,
        error: response.error,
      };
    },
    enabled: !!token, // Only run query if token exists
    retry: false, // Don't retry on failure
    staleTime: Infinity, // Token validity doesn't change often
  });

  // Handle verification result
  useEffect(() => {
    if (!isLoading && verificationData) {
      if (!verificationData.valid) {
        // Token is invalid - logout
        localStorage.removeItem('authToken');
        setToken(null);
        
        // Show toast if we got a specific auth error
        if (verificationData.error && (
          verificationData.error.toLowerCase().includes('not authenticated') ||
          verificationData.error.toLowerCase().includes('unauthorized') ||
          verificationData.error.toLowerCase().includes('invalid token')
        )) {
          showToast('Session expired', 'error');
        }
      }
    }
  }, [isLoading, verificationData, showToast, setToken]);

  const login = useCallback((newToken: string) => {
    localStorage.setItem('authToken', newToken);
    setToken(newToken);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    setToken(null);
    showToast('Logged out successfully', 'info');
  }, [showToast]);

  const isAuthenticated = !!token;

  return {
    token,
    login,
    logout,
    isAuthenticated,
    isLoading,
  };
}

