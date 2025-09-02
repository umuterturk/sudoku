import React from 'react';
import { CircularProgress, Box, Typography, LinearProgress } from '@mui/material';
import './LoadingScreen.css';

const LoadingScreen = ({ 
  message = "Loading...", 
  progress = null, 
  showProgress = false,
  subMessage = null 
}) => {
  return (
    <div className="loading-screen">
      <Box className="loading-content">
        <div className="loading-icon">
          <CircularProgress 
            size={60} 
            thickness={4}
            sx={{
              color: '#2196f3',
              '& .MuiCircularProgress-circle': {
                strokeLinecap: 'round',
              },
            }}
          />
        </div>
        
        <Typography 
          variant="h6" 
          className="loading-message"
          sx={{
            color: '#333',
            fontWeight: 500,
            marginTop: 2,
            marginBottom: 1
          }}
        >
          {message}
        </Typography>

        {subMessage && (
          <Typography 
            variant="body2" 
            className="loading-submessage"
            sx={{
              color: '#666',
              marginBottom: 2
            }}
          >
            {subMessage}
          </Typography>
        )}

        {showProgress && (
          <Box className="progress-container" sx={{ width: '100%', maxWidth: 300 }}>
            <LinearProgress 
              variant={progress !== null ? "determinate" : "indeterminate"}
              value={progress}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: '#e0e0e0',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                  backgroundColor: '#2196f3',
                },
              }}
            />
            {progress !== null && (
              <Typography 
                variant="caption" 
                sx={{ 
                  color: '#666', 
                  marginTop: 1, 
                  textAlign: 'center',
                  display: 'block'
                }}
              >
                {Math.round(progress)}%
              </Typography>
            )}
          </Box>
        )}

        <div className="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </Box>
    </div>
  );
};

export default LoadingScreen;
