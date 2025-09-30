import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from '@mui/material';
import {
  Logout as LogoutIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';

interface LogoutModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const LogoutModal: React.FC<LogoutModalProps> = ({ open, onClose, onConfirm }) => {
  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ textAlign: 'center', py: 1 }}>
          <LogoutIcon 
            sx={{ 
              fontSize: 48, 
              color: 'warning.main', 
              mb: 1 
            }} 
          />
          <Typography variant="h5" component="h2" color="text.primary" sx={{ fontWeight: 600 }}>
            Confirm Logout
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ textAlign: 'center', pb: 2 }}>
        <Typography variant="body1" color="text.secondary">
          Are you sure you want to log out? You'll need to sign in again to access your account.
        </Typography>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1, gap: 2, justifyContent: 'center' }}>
        <Button
          onClick={onClose}
          variant="outlined"
          startIcon={<CancelIcon />}
          sx={{ 
            minWidth: 120,
            borderColor: 'text.secondary',
            color: 'text.secondary',
            '&:hover': {
              borderColor: 'text.primary',
              color: 'text.primary',
            }
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          startIcon={<LogoutIcon />}
          sx={{ 
            minWidth: 120,
            backgroundColor: 'warning.main',
            '&:hover': {
              backgroundColor: 'warning.dark',
            }
          }}
        >
          Logout
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LogoutModal;
