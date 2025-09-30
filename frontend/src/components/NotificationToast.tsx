import React from 'react';
import {
  Snackbar,
  Alert,
  AlertTitle,
  IconButton,
  Typography,
} from '@mui/material';
import {
  Close as CloseIcon,
} from '@mui/icons-material';
import { type Notification } from '../context/EventContext';

interface NotificationToastProps {
  notification: Notification;
  onClose: () => void;
  onRead: () => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({
  notification,
  onClose,
  onRead,
}) => {
  const handleClose = () => {
    onRead();
    onClose();
  };

  const getSeverity = (type: Notification['type']) => {
    switch (type) {
      case 'success': return 'success';
      case 'info': return 'info';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'info';
    }
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success': return '🎉';
      case 'info': return 'ℹ️';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return 'ℹ️';
    }
  };

  return (
    <Snackbar
      open={true}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      sx={{ mt: 8 }} // Account for app bar
    >
      <Alert
        severity={getSeverity(notification.type)}
        onClose={handleClose}
        sx={{ 
          minWidth: 300,
          maxWidth: 400,
          '& .MuiAlert-message': {
            width: '100%',
          },
        }}
        action={
          <IconButton
            size="small"
            onClick={handleClose}
            aria-label="close"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      >
        <AlertTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <span>{getIcon(notification.type)}</span>
          {notification.title}
        </AlertTitle>
        
        <Typography variant="body2">
          {notification.message}
        </Typography>
      </Alert>
    </Snackbar>
  );
};

export default NotificationToast;
