import React, { useState, useEffect, useRef } from 'react';

interface VideoOverlayProps {
  style?: {
    backgroundColor?: string;
    textColor?: string;
    borderRadius?: string;
    backdropBlur?: string;
    opacity?: number;
  };
  source?: string;
  loop?: boolean;
  autoplay?: boolean;
  muted?: boolean;
  preview?: boolean;
  schedule?: {
    enabled?: boolean;
    interval?: number; // seconds between activations
    duration?: number; // seconds to show
    autoHide?: boolean;
  };
}

export function VideoOverlay({ 
  style = {
    backgroundColor: 'transparent',
    textColor: '#ffffff',
    borderRadius: '0',
    backdropBlur: '',
    opacity: 1
  },
  source,
  loop = true,
  autoplay = true,
  muted = true,
  preview = false,
  schedule = {
    enabled: false,
    interval: 600, // default 10 minutes
    duration: 5, // default 5 seconds
    autoHide: true
  }
}: VideoOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVisible, setIsVisible] = useState(preview || !schedule.enabled || !schedule.autoHide);
  const [isTransparentWebm, setIsTransparentWebm] = useState(false);
  
  // Detect WebM files for transparency support
  useEffect(() => {
    if (source) {
      setIsTransparentWebm(/\.webm$/i.test(source));
    }
  }, [source]);
  
  // Ensure video plays when it becomes visible
  useEffect(() => {
    if (videoRef.current && isVisible && source) {
      // For stream output, we need to force reload and play the video
      // whenever visibility changes to ensure consistent playback
      videoRef.current.load();
      
      // Use a slight delay to ensure DOM is ready
      const playAttempt = setTimeout(() => {
        if (videoRef.current) {
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch(err => {
              console.log('Auto-play prevented by browser (normal if no user interaction):', err);
              // This is expected in some browsers without user interaction
              // We still have the autoplay attribute as backup
            });
          }
        }
      }, 50);
      
      return () => clearTimeout(playAttempt);
    }
  }, [isVisible, source]);
  
  // We intentionally don't use visibilitychange event handlers anymore
  // This would cause problems in OBS/SLOBS where the browser source is always active
  // but the tab may not be focused, leading to paused videos when the tab is inactive
  
  // Cleaner scheduling implementation
  useEffect(() => {
    // Skip scheduling in preview mode
    if (preview || !source || !schedule.enabled) {
      // If in preview mode, make sure visibility matches expectations
      setIsVisible(preview || !schedule.autoHide);
      return;
    }
    
    console.log('VideoOverlay: Setting up schedule:', {
      interval: schedule.interval,
      duration: schedule.duration,
      autoHide: schedule.autoHide
    });
    
    // Simple and reliable show/hide handler function
    const handleShow = () => {
      console.log('VideoOverlay: Scheduled activation');
      
      // Show the overlay
      setIsVisible(true);
      
      // Reset and play the video from the beginning - IMPORTANT
      // We use load() instead of just setting currentTime to ensure the video
      // completely restarts, even if it's the same file being played again
      if (videoRef.current) {
        // Complete reload for guaranteed restart
        videoRef.current.load();
        
        // Use setTimeout to ensure the load() has completed
        setTimeout(() => {
          if (videoRef.current) {
            // Play with error handling
            const playPromise = videoRef.current.play();
            
            if (playPromise !== undefined) {
              playPromise.catch(err => {
                console.error("Error playing scheduled video:", err);
              });
            }
          }
        }, 50);
      }
      
      // If autoHide is enabled, schedule the hide operation
      if (schedule.autoHide) {
        const duration = schedule.duration || 5;
        console.log(`VideoOverlay: Will hide after ${duration} seconds`);
        
        setTimeout(() => {
          console.log(`VideoOverlay: Hiding after duration`);
          setIsVisible(false);
        }, duration * 1000);
      }
    };
    
    // Show immediately on first setup
    handleShow();
    
    // Set up interval for future activations
    const interval = setInterval(handleShow, (schedule.interval || 600) * 1000);
    
    // Cleanup function to clear interval when component unmounts or deps change
    return () => {
      clearInterval(interval);
    };
  }, [preview, source, schedule.enabled, schedule.interval, schedule.duration, schedule.autoHide]);
  
  // Handle video end based on loop setting and scheduling
  const handleVideoEnded = () => {
    // For non-looping videos, we might need to hide
    if (!loop && schedule.autoHide && !preview && schedule.enabled) {
      console.log("VideoOverlay: Non-looping video ended, hiding overlay");
      setIsVisible(false);
    }
    // For non-looping videos that should stay visible, reset to first frame
    else if (!loop && videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  };
  
  // Preview mode controls
  const handlePlay = () => {
    if (videoRef.current) {
      // Make sure the video is visible first
      setIsVisible(true);
      
      // Force complete reload for reliable restart
      videoRef.current.load();
      
      // Use setTimeout to ensure the load() has completed
      setTimeout(() => {
        if (videoRef.current) {
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch(err => {
              console.error("Error playing video in preview:", err);
            });
          }
        }
      }, 50);
    }
  };
  
  // Don't render anything if not visible and not in preview mode
  if (!isVisible && !preview) {
    return null;
  }
  
  // Create CSS classes for animation
  const containerClasses = `
    h-full w-full flex items-center justify-center overflow-hidden
    ${!isVisible && preview ? 'opacity-50' : ''}
    ${isVisible ? 'video-overlay-visible' : 'video-overlay-hidden'}
  `;
  
  return (
    <div 
      className={containerClasses}
      style={{
        backgroundColor: isTransparentWebm ? 'transparent' : (style.backgroundColor || 'transparent'),
        borderRadius: style.borderRadius || '0',
        opacity: isVisible ? (style.opacity !== undefined ? style.opacity : 1) : 0.3,
        transition: 'opacity 0.3s ease-in-out, transform 0.5s ease-in-out',
        backdropFilter: style.backdropBlur ? `blur(${style.backdropBlur})` : undefined,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)'
      }}
    >
      {source ? (
        <video
          ref={videoRef}
          src={source}
          className="w-full h-full object-contain"
          autoPlay={autoplay}
          loop={loop}
          muted={muted}
          playsInline={true}
          preload="auto"
          onEnded={handleVideoEnded}
          style={{
            backgroundColor: 'transparent',
            objectFit: 'contain',
            width: '100%',
            height: '100%'
          }}
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-center p-4">
          <p style={{ color: style.textColor || '#ffffff' }}>
            No video source selected
          </p>
        </div>
      )}
      
      {/* Controls for preview mode */}
      {preview && (
        <div className="absolute bottom-2 right-2 flex space-x-2 text-xs">
          <button 
            className="p-1 bg-primary/80 text-white rounded"
            onClick={handlePlay}
          >
            ▶️
          </button>
          <button 
            className="p-1 bg-primary/80 text-white rounded"
            onClick={() => setIsVisible(!isVisible)}
          >
            {isVisible ? '👁️' : '👁️‍🗨️'}
          </button>
          {schedule.enabled && (
            <div className="p-1 bg-black/80 text-white rounded text-xs">
              {schedule.interval}s/{schedule.duration}s
            </div>
          )}
        </div>
      )}
    </div>
  );
}